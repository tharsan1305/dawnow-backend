const TaskEntry = require('../models/TaskEntry');
const Notification = require('../models/Notification');
const PwdRequest = require('../models/PwdRequest');
const User = require('../models/User');
const SystemSetting = require('../models/SystemSetting');
const bcrypt = require('bcryptjs');

const { runBackup } = require('../backup/backupEngine');

// @desc    Get staff tasks
// @route   GET /api/staff/tasks
// @access  Private (Staff)
const getTasks = async (req, res) => {
    try {
        const { from, to, status, type, page = 1, limit = 10 } = req.query;

        const query = { staff: req.user._id };

        if (from || to) {
            query.date = {};
            if (from) query.date.$gte = new Date(from);
            if (to) query.date.$lte = new Date(to);
        }

        if (status && status !== 'All') {
            query.status = status;
        }

        if (type && type !== 'All') {
            switch (type) {
                case 'Paper': query.paperTitle = { $exists: true, $ne: '' }; break;
                case 'Project': query.projectName = { $exists: true, $ne: '' }; break;
                case 'Patent': query.patentTitle = { $exists: true, $ne: '' }; break;
                case 'Book': query.bookTitle = { $exists: true, $ne: '' }; break;
                case 'General': query.activityTitle = { $exists: true, $ne: '' }; break;
            }
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const tasks = await TaskEntry.find(query)
            .sort({ date: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .populate('staff', 'name staffId department designation');

        const total = await TaskEntry.countDocuments(query);

        res.json({
            tasks,
            totalPages: Math.ceil(total / parseInt(limit)),
            currentPage: parseInt(page),
            total
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

const { calculateTaskScore } = require('../utils/scoreCalculator');

// Helper: get IST time info
const getISTTimeInfo = () => {
    const utcNow = new Date();
    const istTime = new Date(utcNow.getTime() + (5.5 * 60 * 60 * 1000));
    return {
        utcNow,
        istTime,
        hour: istTime.getUTCHours(),
        minute: istTime.getUTCMinutes(),
        day: istTime.getUTCDay(),
        isWeekend: istTime.getUTCDay() === 0 // Sunday only
    };
};

// Helper: determine auto-approval based on settings
const shouldAutoApprove = async () => {
    const cutoffSetting = await SystemSetting.findOne({ key: 'autoApprovalCutoffTime' }).lean();
    const cutoffTimeStr = cutoffSetting?.value || '17:00';
    const [cutoffHour, cutoffMinute] = cutoffTimeStr.split(':').map(Number);

    const { hour, minute, isWeekend, istTime } = getISTTimeInfo();

    const isBeforeCutoff = (hour < cutoffHour) || (hour === cutoffHour && minute <= cutoffMinute);
    const autoApprove = !isWeekend && isBeforeCutoff;

    console.log(`[AUTO-APPROVAL CHECK] IST Time: ${istTime.toUTCString()} | ${hour}:${minute < 10 ? '0'+minute : minute} IST | Cutoff: ${cutoffTimeStr} | Weekend: ${isWeekend} | Before Cutoff: ${isBeforeCutoff} | Result: ${autoApprove ? 'AUTO-APPROVE' : 'PENDING'}`);

    return { autoApprove, cutoffTimeStr };
};

// @desc    Create new task
// @route   POST /api/staff/tasks
// @access  Private (Staff)
const createTask = async (req, res) => {
    try {
        const { autoApprove, cutoffTimeStr } = await shouldAutoApprove();
        const { utcNow } = getISTTimeInfo();

        console.log('Submitting report for user:', req.user.name);
        console.log('User role:', req.user.role);
        console.log('User ID:', req.user._id);

        const staffId = req.user._id;

        const taskData = {
            ...req.body,
            staff: staffId,
            submittedAt: utcNow,
            status: 'Completed',
            ...(autoApprove ? {
                approvalType: 'auto',
                approvedBy: 'system',
                approvedAt: utcNow,
                adminNote: `Auto-approved (Submitted before ${cutoffTimeStr})`
            } : {})
        };

        const task = await TaskEntry.create(taskData);
        await task.populate('staff', 'name staffId department designation');

        console.log(`[SUCCESS] Task created for ${req.user.username}, status=${task.status}`);

        if (autoApprove) {
            const user = await User.findById(req.user._id);
            if (user) {
                const taskScore = await calculateTaskScore(task);
                user.totalScore += taskScore;
                await user.save();
            }
        }

        res.status(201).json(task);
        
        // Real-time update via socket
        if (global.io) {
            global.io.to(`user_${req.user._id}`).emit('report_updated', {
                type: 'creation',
                taskId: task._id,
                status: 'Completed',
                date: task.date
            });
            global.io.to('admin').emit('admin_activity', {
                staffName: req.user.name,
                action: 'Submitted Report',
                date: new Date()
            });
        }

        // Trigger real-time backup (Non-blocking)
        setImmediate(() => {
            runBackup('report-submit', req.user._id)
                .catch(err => console.error('[BACKUP ERROR]', err.message));
        });
    } catch (error) {
        console.error('[SUBMISSION ERROR]', error);
        if (error.name === 'ValidationError') {
            console.error('[VALIDATION DETAILS]', JSON.stringify(error.errors));
            return res.status(400).json({ message: 'Validation Error', errors: error.errors });
        }
        res.status(500).json({ message: 'Server error during submission' });
    }
};

// @desc    Get single task by date
// @route   GET /api/staff/tasks/date/:date
// @access  Private (Staff)
const getTaskByDate = async (req, res) => {
    try {
        const queryDate = new Date(req.params.date);
        queryDate.setHours(0, 0, 0, 0);

        const nextDate = new Date(queryDate);
        nextDate.setDate(nextDate.getDate() + 1);

        const task = await TaskEntry.findOne({
            staff: req.user._id,
            date: { $gte: queryDate, $lt: nextDate }
        }).populate('staff', 'name staffId department designation');

        res.json(task || {});
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get single task
// @route   GET /api/staff/tasks/:id
// @access  Private (Staff)
const getTask = async (req, res) => {
    try {
        const task = await TaskEntry.findOne({
            _id: req.params.id,
            staff: req.user._id
        }).populate('staff', 'name staffId department designation');

        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }

        res.json(task);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Update task
// @route   PUT /api/staff/tasks/:id
// @access  Private (Staff)
const updateTask = async (req, res) => {
    try {
        const task = await TaskEntry.findOne({
            _id: req.params.id,
            staff: req.user._id
        });

        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }

        if (task.status === 'approved') {
            return res.status(400).json({ message: 'Entry already approved. Cannot edit an approved entry.' });
        }

        const { autoApprove, cutoffTimeStr } = await shouldAutoApprove();
        const { utcNow } = getISTTimeInfo();

        const updateData = {
            ...req.body,
            submittedAt: utcNow,
            status: 'Completed',
            ...(autoApprove ? {
                approvalType: 'auto',
                approvedBy: 'system',
                approvedAt: utcNow,
                adminNote: `Auto-approved (Edited before ${cutoffTimeStr})`
            } : {})
        };

        const updatedTask = await TaskEntry.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        ).populate('staff', 'name staffId department designation');

        console.log(`[SUCCESS] Task updated, status=${updatedTask.status}`);

        if (autoApprove) {
            const user = await User.findById(req.user._id);
            if (user) {
                const taskScore = await calculateTaskScore(updatedTask);
                user.totalScore += taskScore;
                await user.save();
            }
        }

        res.json(updatedTask);
        
        // Real-time update via socket
        if (global.io) {
            global.io.to(`user_${req.user._id}`).emit('report_updated', {
                type: 'update',
                taskId: updatedTask._id,
                status: 'Completed',
                date: updatedTask.date
            });
        }

        // Trigger real-time backup (Non-blocking)
        setImmediate(() => {
            runBackup('report-submit', req.user._id)
                .catch(err => console.error('[BACKUP ERROR]', err.message));
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get notifications for staff
// @route   GET /api/staff/notifications
// @access  Private (Staff)
const getNotifications = async (req, res) => {
    try {
        const department = req.user.department;

        const notifications = await Notification.find({
            $or: [
                { sentTo: 'All Staff' },
                { sentTo: department }
            ]
        })
            .sort({ createdAt: -1 })
            .populate('createdBy', 'name');

        res.json(notifications);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get unread notification count
// @route   GET /api/staff/notifications/unread-count
// @access  Private (Staff)
const getUnreadCount = async (req, res) => {
    try {
        const { department, _id } = req.user;

        const count = await Notification.countDocuments({
            $or: [
                { sentTo: 'All Staff' },
                { sentTo: department }
            ],
            readBy: { $ne: _id }
        });

        res.json({ count });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Mark notification as read
// @route   PATCH /api/staff/notifications/:id/read
// @access  Private (Staff)
const markAsRead = async (req, res) => {
    try {
        const notification = await Notification.findById(req.params.id);

        if (!notification) {
            return res.status(404).json({ message: 'Notification not found' });
        }

        if (!notification.readBy.includes(req.user._id)) {
            notification.readBy.push(req.user._id);
            await notification.save();
        }

        res.json({ message: 'Marked as read' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Request password change
// @route   POST /api/staff/pwd-request
// @access  Private (Staff)
const requestPasswordChange = async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;

        // Get user with password
        const user = await User.findById(req.user._id).select('+password');

        // Verify old password
        const isMatch = await user.comparePassword(oldPassword);
        if (!isMatch) {
            return res.status(400).json({ message: 'Current password is incorrect' });
        }

        // Check for existing pending request
        const existingRequest = await PwdRequest.findOne({
            staff: req.user._id,
            status: 'pending'
        });

        if (existingRequest) {
            return res.status(400).json({ message: 'You already have a pending password request' });
        }

        // Create request
        const pwdRequest = await PwdRequest.create({
            staff: req.user._id,
            newPassword // Store original password (will be hashed upon admin approval save)
        });

        res.status(201).json({ message: 'Password change request sent to admin', status: pwdRequest.status });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get password request status
// @route   GET /api/staff/pwd-request
// @access  Private (Staff)
const getPwdRequestStatus = async (req, res) => {
    try {
        const pwdRequest = await PwdRequest.findOne({
            staff: req.user._id
        }).sort({ createdAt: -1 });

        if (!pwdRequest) {
            return res.json({ hasRequest: false });
        }

        res.json({
            hasRequest: true,
            status: pwdRequest.status,
            adminNote: pwdRequest.adminNote,
            createdAt: pwdRequest.createdAt
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

const getMyReports = async (req, res) => {
    try {
        const userId = req.user.id;
        const range = req.query.range || 'week';

        // Find staff linked to this user (we verified User inherently is the staff model)
        const staff = await User.findOne({
            $or: [{ _id: userId }, { email: req.user.email }, { name: req.user.name }]
        });
        
        if (!staff) return res.json({ total: 0, approved: 0, pending: 0, reports: [] });

        const now = new Date();
        let startDate;
        if (range === 'week') {
            startDate = new Date(now);
            const day = now.getDay();
            startDate.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
            startDate.setHours(0, 0, 0, 0);
        } else {
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            startDate.setHours(0, 0, 0, 0);
        }

        const reports = await TaskEntry.find({
            staff: staff._id,
            date: { $gte: startDate, $lte: now }
        }).sort({ date: -1 });

        res.json({
            total: reports.length,
            completed: reports.filter(r => r.status === 'Completed' || r.status === 'approved').length,
            pendingCount: reports.filter(r => r.status === 'pending').length,
            approved: reports.filter(r => r.status === 'approved').length,
            rejected: reports.filter(r => r.status === 'rejected').length,
            reports: reports.slice(0, 10) // Increased to 10 to ensure we show more in dashboard
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const getStreak = async (req, res) => {
    try {
        const staffId = req.user._id;
        
        // Find all unique dates this staff has submitted a report
        // We group by date normalized to YYYY-MM-DD
        const reports = await TaskEntry.find({ staff: staffId })
            .sort({ date: -1 })
            .select('date')
            .lean();

        if (reports.length === 0) {
            return res.json({ currentStreak: 0, longestStreak: 0, thisWeek: 0 });
        }

        // Normalize dates to set of strings
        const dateSet = new Set(reports.map(r => r.date.toISOString().split('T')[0]));
        const sortedDates = Array.from(dateSet).sort((a, b) => new Date(b) - new Date(a));

        let currentStreak = 0;
        let now = new Date();
        let checkDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        // If not submitted today, check if submitted yesterday to continue streak
        const todayStr = checkDate.toISOString().split('T')[0];
        if (!dateSet.has(todayStr)) {
            checkDate.setDate(checkDate.getDate() - 1);
        }

        while (true) {
            const dStr = checkDate.toISOString().split('T')[0];
            if (dateSet.has(dStr)) {
                currentStreak++;
                checkDate.setDate(checkDate.getDate() - 1);
            } else {
                // Allow skipping Sundays
                if (checkDate.getDay() === 0) {
                    checkDate.setDate(checkDate.getDate() - 1);
                    continue;
                }
                break;
            }
        }

        // Longest streak calculation
        let longestStreak = 0;
        let tempStreak = 0;
        const allSorted = Array.from(dateSet).sort((a, b) => new Date(a) - new Date(b));
        
        // Simple longest consecutive 
        if (allSorted.length > 0) {
            tempStreak = 1;
            longestStreak = 1;
            for (let i = 1; i < allSorted.length; i++) {
                const prev = new Date(allSorted[i - 1]);
                const curr = new Date(allSorted[i]);
                const diff = (curr - prev) / (1000 * 60 * 60 * 24);
                
                if (diff <= 1 || (diff <= 2 && curr.getDay() === 1)) { // Allow 1 day gap or 2 days for Monday
                    tempStreak++;
                } else {
                    tempStreak = 1;
                }
                longestStreak = Math.max(longestStreak, tempStreak);
            }
        }

        // This week total (Mon-Sat)
        const monday = new Date();
        monday.setDate(now.getDate() - (now.getDay() === 0 ? 6 : now.getDay() - 1));
        monday.setHours(0,0,0,0);
        
        let thisWeekCount = 0;
        for (let i = 0; i < 6; i++) {
            const d = new Date(monday);
            d.setDate(monday.getDate() + i);
            if (dateSet.has(d.toISOString().split('T')[0])) {
                thisWeekCount++;
            }
        }

        res.json({
            currentStreak,
            longestStreak,
            thisWeek: thisWeekCount
        });
    } catch (error) {
        console.error('[STREAK ERROR]', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const getResearchTargets = async (req, res) => {
    try {
        const staff = await User.findById(req.user.id);
        const year = new Date().getFullYear();
        const startDate = new Date(year, 0, 1);
        const endDate = new Date(year, 11, 31, 23, 59, 59);

        const tasks = await TaskEntry.find({
            staff: req.user.id,
            date: { $gte: startDate, $lte: endDate },
            status: 'approved'
        });

        // Current counts
        const counts = {
            papers: tasks.filter(t => t.paperTitle && t.paperTitle.trim() !== '').length,
            projects: tasks.filter(t => t.projectName && t.projectName.trim() !== '').length,
            patents: tasks.filter(t => t.patentTitle && t.patentTitle.trim() !== '').length,
        };

        // Targets
        const targets = {
            papers: 1,
            projects: 1,
            patents: 1
        };

        // Percentage (max 100)
        const percentages = {
            papers: Math.min(100, (counts.papers / targets.papers) * 100),
            projects: Math.min(100, (counts.projects / targets.projects) * 100),
            patents: Math.min(100, (counts.patents / targets.patents) * 100)
        };

        // Total progress (average)
        const totalProgress = Math.round((percentages.papers + percentages.projects + percentages.patents) / 3);

        res.json({
            year,
            counts,
            targets,
            percentages,
            totalProgress
        });
    } catch (error) {
        console.error('[TARGETS ERROR]', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Delete task
// @route   DELETE /api/staff/tasks/:id
// @access  Private (Staff)
const deleteTask = async (req, res) => {
    try {
        const task = await TaskEntry.findOne({
            _id: req.params.id,
            staff: req.user._id
        });

        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }

        if (task.status === 'approved') {
            return res.status(400).json({ message: 'Cannot delete an approved entry.' });
        }

        await TaskEntry.findByIdAndDelete(req.params.id);

        res.json({ message: 'Task removed' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Mark all notifications as read
// @route   PUT /api/staff/notifications/read-all
// @access  Private (Staff)
const markAllAsRead = async (req, res) => {
    try {
        const userId = req.user._id;
        const department = req.user.department;

        await Notification.updateMany(
            {
                $or: [
                    { sentTo: 'All Staff' },
                    { sentTo: department }
                ],
                readBy: { $ne: userId }
            },
            {
                $addToSet: { readBy: userId }
            }
        );

        res.json({ message: 'All marked as read' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get current user profile
// @route   GET /api/staff/profile
// @access  Private (Staff)
const getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(user);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Update current user profile
// @route   PUT /api/staff/profile
// @access  Private (Staff)
const updateProfile = async (req, res) => {
    try {
        const updates = { ...req.body };
        
        // Prevent manual change of sensitive fields
        delete updates.password;
        delete updates.role;
        delete updates.staffId;
        delete updates.totalScore;

        const user = await User.findByIdAndUpdate(
            req.user._id,
            { $set: updates },
            { new: true, runValidators: true }
        );

        res.json(user);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    getTasks,
    createTask,
    getTask,
    getTaskByDate,
    updateTask,
    deleteTask,
    getNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    requestPasswordChange,
    getPwdRequestStatus,
    updateProfile,
    getProfile,
    getMyReports,
    getStreak,
    getResearchTargets
};
