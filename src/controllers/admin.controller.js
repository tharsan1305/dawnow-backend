const User = require('../models/User');
const TaskEntry = require('../models/TaskEntry');
const Notification = require('../models/Notification');
const PwdRequest = require('../models/PwdRequest');
const SystemSetting = require('../models/SystemSetting');


// @desc    Get admin dashboard stats
// @route   GET /api/admin/dashboard
// @access  Private (Admin)
const getDashboard = async (req, res) => {
    try {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        // Basic counts
        const totalStaff = await User.countDocuments({ role: 'staff' }).lean();
        const reportsThisMonth = await TaskEntry.countDocuments({
            createdAt: { $gte: startOfMonth }
        }).lean();
        const pendingApprovals = await TaskEntry.countDocuments({ status: 'pending' }).lean();
        const pendingPwdRequests = await PwdRequest.countDocuments({ status: 'pending' }).lean();

        // Count auto approved today
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const autoApprovedToday = await TaskEntry.countDocuments({
            approvalType: 'auto',
            approvedAt: { $gte: startOfToday }
        }).lean();

        // Research Metrics (Approved, Pending & Completed for real-time reflection)
        const approvedTasks = await TaskEntry.find({ 
            status: { $in: ['approved', 'pending', 'Completed'] } 
        }).populate('staff').lean();

        let totalPapers = 0;
        let totalProjects = 0;
        let totalPatents = 0;
        let totalBooks = 0;
        let totalActivities = 0;

        const deptStatsMap = {};

        approvedTasks.forEach(task => {
            let hasWork = false;
            if (task.paperTitle && task.paperTitle.trim() !== '') {
                totalPapers++;
                hasWork = true;
            }
            if (task.projectName && task.projectName.trim() !== '') {
                totalProjects++;
                hasWork = true;
            }
            if (task.patentTitle && task.patentTitle.trim() !== '') {
                totalPatents++;
                hasWork = true;
            }
            if (task.bookTitle && task.bookTitle.trim() !== '') {
                totalBooks++;
                hasWork = true;
            }
            if (task.activityTitle && task.activityTitle.trim() !== '') {
                totalActivities++;
                hasWork = true;
            }

            // Department stats logic
            if (task.staff && hasWork) {
                const dept = task.staff.department || 'N/A';
                if (!deptStatsMap[dept]) {
                    deptStatsMap[dept] = { name: dept, papers: 0, projects: 0, patents: 0 };
                }
                if (task.paperTitle && task.paperTitle.trim() !== '') deptStatsMap[dept].papers++;
                if (task.projectName && task.projectName.trim() !== '') deptStatsMap[dept].projects++;
                if (task.patentTitle && task.patentTitle.trim() !== '') deptStatsMap[dept].patents++;
            }
        });

        const departmentStats = Object.values(deptStatsMap);

        // Activity Distribution for Pie Chart
        const activityDistribution = [
            { name: 'Papers', value: totalPapers, color: '#3b82f6' },
            { name: 'Projects', value: totalProjects, color: '#22c55e' },
            { name: 'Patents', value: totalPatents, color: '#f59e0b' },
            { name: 'Books', value: totalBooks, color: '#8b5cf6' },
            { name: 'Activities', value: totalActivities, color: '#ef4444' }
        ];

        // Monthly Stats (Last 6 Months)
        const monthlyStats = [];
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const mName = months[d.getMonth()];
            const mYear = d.getFullYear();
            
            const count = await TaskEntry.countDocuments({
                createdAt: {
                    $gte: new Date(mYear, d.getMonth(), 1),
                    $lt: new Date(mYear, d.getMonth() + 1, 1)
                }
            }).lean();

            monthlyStats.push({ month: mName, submissions: count });
        }

        // Recent activity
        const recentTasks = await TaskEntry.find()
            .sort({ updatedAt: -1 })
            .limit(10)
            .populate('staff', 'name department')
            .lean();

        const recentActivity = recentTasks.map(task => ({
            staffName: task.staff?.name || 'Unknown',
            department: task.staff?.department || 'N/A',
            action: task.status === 'pending' ? 'Submitted Report' : `Changed Status to ${task.status}`,
            date: task.updatedAt,
            status: task.status
        }));

        res.json({
            totalStaff,
            reportsThisMonth,
            pendingApprovals,
            autoApprovedToday,
            pendingPwdRequests,
            totalPapers,
            totalProjects,
            totalPatents,
            totalBooks,
            totalActivities,
            departmentStats,
            activityDistribution,
            monthlyStats,
            recentActivity
        });
    } catch (error) {
        console.error('[ADMIN CONTROLLER ERROR]', error.message);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Get all staff
// @route   GET /api/admin/staff
// @access  Private (Admin)
const getAllStaff = async (req, res) => {
    try {
        const { search, dept } = req.query;

        const query = { role: 'staff' };

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { staffId: { $regex: search, $options: 'i' } },
                { username: { $regex: search, $options: 'i' } }
            ];
        }

        if (dept) {
            query.department = dept;
        }

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const staff = await User.find(query)
            .sort({ name: 1 })
            .lean();
            
        res.json(staff);
    } catch (error) {
        console.error('[ADMIN CONTROLLER ERROR]', error.message);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Create staff
// @route   POST /api/admin/staff
// @access  Private (Admin)
const createStaff = async (req, res) => {
    try {
        const { name, staffId, department, designation, email, phone, username, password, qualification, experience, joinDate } = req.body;

        // Check if username exists
        const existingUser = await User.findOne({ $or: [{ username }, { email }, { staffId }] });
        if (existingUser) {
            return res.status(400).json({ message: 'Username, email, or staff ID already exists' });
        }

        const staff = await User.create({
            name,
            staffId,
            department,
            designation: designation || 'Assistant Professor',
            email,
            phone,
            username,
            password,
            qualification,
            experience,
            joinDate,
            role: 'staff'
        });

        res.status(201).json(staff);
    } catch (error) {
        console.error('[ADMIN CONTROLLER ERROR]', error.message);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Update staff
// @route   PUT /api/admin/staff/:id
// @access  Private (Admin)
const updateStaff = async (req, res) => {
    try {
        const { name, department, designation, email, phone, username, qualification, experience, joinDate } = req.body;

        const staff = await User.findById(req.params.id);
        if (!staff) {
            return res.status(404).json({ message: 'Staff not found' });
        }

        staff.name = name || staff.name;
        staff.department = department || staff.department;
        staff.designation = designation || staff.designation;
        staff.email = email || staff.email;
        staff.phone = phone || staff.phone;
        staff.username = username || staff.username;
        staff.qualification = qualification || staff.qualification;
        staff.experience = experience || staff.experience;
        staff.joinDate = joinDate || staff.joinDate;

        await staff.save();
        res.json(staff);
    } catch (error) {
        console.error('[ADMIN CONTROLLER ERROR]', error.message);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Toggle staff active status
// @route   PATCH /api/admin/staff/:id/toggle
// @access  Private (Admin)
const toggleStaffStatus = async (req, res) => {
    try {
        const staff = await User.findById(req.params.id);
        if (!staff) {
            return res.status(404).json({ message: 'Staff not found' });
        }

        staff.isActive = !staff.isActive;
        await staff.save();

        res.json({ message: `Staff ${staff.isActive ? 'activated' : 'deactivated'}`, isActive: staff.isActive });
    } catch (error) {
        console.error('[ADMIN CONTROLLER ERROR]', error.message);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Delete staff
// @route   DELETE /api/admin/staff/:id
// @access  Private (Admin)
const deleteStaff = async (req, res) => {
    try {
        const staff = await User.findById(req.params.id);
        if (!staff) {
            return res.status(404).json({ message: 'Staff not found' });
        }

        await staff.deleteOne();
        res.json({ message: 'Staff deleted' });
    } catch (error) {
        console.error('[ADMIN CONTROLLER ERROR]', error.message);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Get all tasks
// @route   GET /api/admin/tasks
// @access  Private (Admin)
const getAllTasks = async (req, res) => {
    try {
        const { dept, from, to, status, page = 1, limit = 10 } = req.query;

        const query = {};

        if (dept) {
            const staffInDept = await User.find({ department: dept }).select('_id');
            const staffIds = staffInDept.map(s => s._id);
            query.staff = { $in: staffIds };
        }

        if (from || to) {
            query.date = {};
            if (from) query.date.$gte = new Date(from);
            if (to) query.date.$lte = new Date(to);
        }

        if (status) {
            query.status = status;
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const tasks = await TaskEntry.find(query)
            .sort({ date: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .populate('staff', 'name staffId department designation')
            .lean();

        const total = await TaskEntry.countDocuments(query);

        res.json({
            tasks,
            totalPages: Math.ceil(total / parseInt(limit)),
            currentPage: parseInt(page),
            total
        });
    } catch (error) {
        console.error('[ADMIN CONTROLLER ERROR]', error.message);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const { calculateTaskScore } = require('../utils/scoreCalculator');

// @desc    Update task status
// @route   PATCH /api/admin/tasks/:id/status
// @access  Private (Admin)
const updateTaskStatus = async (req, res) => {
    try {
        const { status, adminNote } = req.body;

        const task = await TaskEntry.findById(req.params.id);
        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }

        const oldStatus = task.status;
        task.status = status;
        task.adminNote = adminNote || '';
        
        if (status === 'approved') {
            task.approvalType = 'manual';
            task.approvedBy = req.user._id;
            task.approvedAt = new Date();
        }
        
        await task.save();

        // If newly approved, update user totalScore
        if (status === 'approved' && oldStatus !== 'approved') {
            const user = await User.findById(task.staff);
            if (user) {
                const taskScore = await calculateTaskScore(task);
                user.totalScore += taskScore;
                await user.save();
                
                await Notification.create({
                    title: 'Entry Approved',
                    message: 'Your entry has been approved by the admin.',
                    priority: 'Normal',
                    sentTo: user.department,
                    createdBy: req.user._id
                });
            }
        } else if (oldStatus === 'approved' && status !== 'approved') {
            // If status changed from approved to something else, remove points
            const user = await User.findById(task.staff);
            if (user) {
                const taskScore = await calculateTaskScore(task);
                user.totalScore = Math.max(0, user.totalScore - taskScore);
                await user.save();
            }
        }
        
        if (status === 'rejected') {
            const user = await User.findById(task.staff);
            if (user) {
                await Notification.create({
                    title: 'Entry Rejected',
                    message: 'Your entry has been rejected. Please review and resubmit.',
                    priority: 'High',
                    sentTo: user.department,
                    createdBy: req.user._id
                });
            }
        }

        await task.populate('staff', 'name staffId department designation');

        res.json(task);
    } catch (error) {
        console.error('[ADMIN CONTROLLER ERROR]', error.message);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Get password requests
// @route   GET /api/admin/pwd-requests
// @access  Private (Admin)
const getPwdRequests = async (req, res) => {
    try {
        const { status } = req.query;

        const query = {};
        if (status) {
            query.status = status;
        }

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const requests = await PwdRequest.find(query)
            .sort({ createdAt: -1 })
            .populate('staff', 'name staffId department email')
            .lean()
            .skip(skip)
            .limit(limit);

        res.json(requests);
    } catch (error) {
        console.error('[ADMIN CONTROLLER ERROR]', error.message);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Handle password request
// @route   PATCH /api/admin/pwd-requests/:id
// @access  Private (Admin)
const handlePwdRequest = async (req, res) => {
    try {
        const { action, adminNote } = req.body;

        const pwdRequest = await PwdRequest.findById(req.params.id).select('+newPassword').populate('staff');
        if (!pwdRequest) {
            return res.status(404).json({ message: 'Request not found' });
        }

        if (pwdRequest.status !== 'pending') {
            return res.status(400).json({ message: 'Request already processed' });
        }

        if (action === 'approve') {
            const user = await User.findById(pwdRequest.staff._id);
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

            user.password = pwdRequest.newPassword;
            await user.save();

            pwdRequest.status = 'approved';
            pwdRequest.adminNote = adminNote || '';
            await pwdRequest.save();

            await Notification.create({
                title: 'Password Change Approved',
                message: 'Your password change request has been approved by the administrator.',
                priority: 'Normal',
                sentTo: user.department,
                createdBy: req.user._id
            });

            res.json({ message: 'Password request approved' });
        } else if (action === 'reject') {
            pwdRequest.status = 'rejected';
            pwdRequest.adminNote = adminNote || '';
            await pwdRequest.save();

            const user = await User.findById(pwdRequest.staff._id);
            await Notification.create({
                title: 'Password Change Rejected',
                message: 'Your password change request has been rejected. Please contact admin for more details.',
                priority: 'Normal',
                sentTo: user?.department || 'Staff',
                createdBy: req.user._id
            });

            res.json({ message: 'Password request rejected' });
        } else {
            return res.status(400).json({ message: 'Invalid action' });
        }
    } catch (error) {
        console.error('[ADMIN CONTROLLER ERROR]', error.message);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Create notification
// @route   POST /api/admin/notifications
// @access  Private (Admin)
const createNotification = async (req, res) => {
    try {
        const { title, message, priority, sentTo } = req.body;

        const notification = await Notification.create({
            title,
            message,
            priority: priority || 'Normal',
            sentTo: sentTo || 'All Staff',
            createdBy: req.user._id
        });

        // Emit real-time notification to all staff via Socket.IO
        if (global.io) {
            global.io.emit('new_announcement', {
                id: notification._id,
                title: notification.title,
                message: notification.message,
                priority: notification.priority,
                sentTo: notification.sentTo,
                time: new Date().toISOString()
            });

            // Also emit to 'staff' room specifically
            global.io.to('staff').emit('new_announcement', {
                id: notification._id,
                title: notification.title,
                message: notification.message,
                priority: notification.priority,
                sentTo: notification.sentTo,
                time: new Date().toISOString()
            });
        }

        res.status(201).json(notification);
    } catch (error) {
        console.error('[ADMIN CONTROLLER ERROR]', error.message);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Get all notifications
// @route   GET /api/admin/notifications
// @access  Private (Admin)
const getAllNotifications = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const notifications = await Notification.find()
            .sort({ createdAt: -1 })
            .populate('createdBy', 'name')
            .lean()
            .skip(skip)
            .limit(limit);

        res.json(notifications);
    } catch (error) {
        console.error('[ADMIN CONTROLLER ERROR]', error.message);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Get all system settings
// @route   GET /api/admin/settings
// @access  Private (Admin)
const getSystemSettings = async (req, res) => {
    try {
        const settings = await SystemSetting.find().lean();
        const settingsObj = {};
        settings.forEach(s => settingsObj[s.key] = s.value);

        // If no cutoff time exists in DB, seed the correct default (17:00 = 5:00 PM)
        if (!settingsObj.autoApprovalCutoffTime) {
            await SystemSetting.findOneAndUpdate(
                { key: 'autoApprovalCutoffTime' },
                { key: 'autoApprovalCutoffTime', value: '17:00', description: 'Auto-approval cutoff time (HH:mm, IST)' },
                { upsert: true, new: true }
            );
            settingsObj.autoApprovalCutoffTime = '17:00';
            console.log('[SETTINGS] Seeded default autoApprovalCutoffTime = 17:00');
        }

        // If DB has the wrong 05:00 value, correct it automatically
        if (settingsObj.autoApprovalCutoffTime === '05:00') {
            await SystemSetting.findOneAndUpdate(
                { key: 'autoApprovalCutoffTime' },
                { value: '17:00' }
            );
            settingsObj.autoApprovalCutoffTime = '17:00';
            console.log('[SETTINGS] Auto-corrected autoApprovalCutoffTime from 05:00 → 17:00');
        }

        res.json(settingsObj);
    } catch (error) {
        console.error('[ADMIN CONTROLLER ERROR]', error.message);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};


// @desc    Update system setting
// @route   POST /api/admin/settings
// @access  Private (Admin)
const updateSystemSetting = async (req, res) => {
    try {
        const { key, value } = req.body;

        if (!key) {
            return res.status(400).json({ message: 'Key is required' });
        }

        // Validate cutoff time range (08:00 – 20:00)
        if (key === 'autoApprovalCutoffTime') {
            const [h, m] = value.split(':').map(Number);
            const totalMinutes = h * 60 + m;
            const minMinutes = 8 * 60;   // 08:00
            const maxMinutes = 20 * 60;  // 20:00
            if (isNaN(h) || isNaN(m) || totalMinutes < minMinutes || totalMinutes > maxMinutes) {
                return res.status(400).json({
                    success: false,
                    message: 'Cutoff time must be between 8:00 AM and 8:00 PM (08:00 – 20:00)'
                });
            }
        }

        const setting = await SystemSetting.findOneAndUpdate(
            { key },
            { key, value },
            { upsert: true, new: true, runValidators: true }
        );

        console.log(`[SETTINGS] Updated ${key} = ${value}`);
        res.json({ success: true, setting });
    } catch (error) {
        console.error('[ADMIN CONTROLLER ERROR]', error.message);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};


// @desc    Retroactively approve today's pending reports submitted before cutoff
// @route   POST /api/admin/settings/apply-today
// @access  Private (Admin)
const retroactiveApproveToday = async (req, res) => {
    try {
        const cutoffSetting = await SystemSetting.findOne({ key: 'autoApprovalCutoffTime' }).lean();
        const cutoffTimeStr = cutoffSetting?.value || '17:00';
        const [cutoffHour, cutoffMinute] = cutoffTimeStr.split(':').map(Number);

        // Build today's date range in UTC (IST offset = +5:30)
        const utcNow = new Date();
        const istNow = new Date(utcNow.getTime() + (5.5 * 60 * 60 * 1000));

        // Start of today in IST → convert back to UTC
        const istStartOfDay = new Date(istNow);
        istStartOfDay.setUTCHours(0, 0, 0, 0);
        const utcStartOfDay = new Date(istStartOfDay.getTime() - (5.5 * 60 * 60 * 1000));

        // Cutoff in UTC
        const utcCutoff = new Date(istStartOfDay.getTime() + (cutoffHour * 60 + cutoffMinute) * 60 * 1000 - (5.5 * 60 * 60 * 1000));

        console.log(`[RETROACTIVE] Today UTC range: ${utcStartOfDay.toISOString()} → Cutoff UTC: ${utcCutoff.toISOString()}`);

        // Find all pending reports submitted today before cutoff
        const result = await TaskEntry.updateMany(
            {
                status: 'pending',
                submittedAt: { $gte: utcStartOfDay, $lte: utcCutoff }
            },
            {
                $set: {
                    status: 'approved',
                    approvalType: 'auto',
                    approvedBy: 'system',
                    approvedAt: utcNow,
                    adminNote: `Retroactively auto-approved (before ${cutoffTimeStr} cutoff)`
                }
            }
        );

        console.log(`[RETROACTIVE] Updated ${result.modifiedCount} reports to approved`);
        res.json({ success: true, updated: result.modifiedCount, cutoff: cutoffTimeStr });
    } catch (error) {
        console.error('[RETROACTIVE APPROVAL ERROR]', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const getTodayStatus = async (req, res) => {
    try {
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

        // Get all active staff
        const allStaff = await User.find({ role: 'staff', isActive: true })
            .select('name department designation profileImage staffId')
            .lean();

        // Get all task entries for today
        const todayTasks = await TaskEntry.find({
            date: { $gte: startOfToday, $lte: endOfToday }
        }).select('staff status').lean();

        const submittedIds = new Set(todayTasks.map(t => t.staff.toString()));

        const submittedList = [];
        const absentList = [];

        allStaff.forEach(staff => {
            if (submittedIds.has(staff._id.toString())) {
                const task = todayTasks.find(t => t.staff.toString() === staff._id.toString());
                submittedList.push({
                    ...staff,
                    status: task ? task.status : 'pending'
                });
            } else {
                absentList.push(staff);
            }
        });

        // SUPER COMPATIBLE RESPONSE
        res.json({
            success: true,
            // Preferred naming
            totalStaff: allStaff.length,
            submittedCount: submittedList.length,
            absentCount: absentList.length,
            submittedList: submittedList,
            absentList: absentList,
            
            // Standard naming (arrays)
            submitted: submittedList,
            absent: absentList,
            
            // Nested summary naming (Dashboard requirement)
            summary: {
                total: allStaff.length,
                submitted: submittedList.length,
                absent: absentList.length
            }
        });
    } catch (error) {
        console.error('[TODAY STATUS ERROR]', error.message);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Analytics Proxies / Implementations
const getWeeklyTrend = async (req, res) => {
    try {
        // Implementation similar to monthly trend but for days
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const now = new Date();
        const last7Days = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(now.getDate() - i);
            last7Days.push({
                day: days[d.getDay()],
                date: d.toISOString().split('T')[0],
                count: 0
            });
        }

        const startOfRange = new Date(now);
        startOfRange.setDate(now.getDate() - 6);
        startOfRange.setHours(0, 0, 0, 0);

        const tasks = await TaskEntry.find({
            date: { $gte: startOfRange }
        }).lean();

        tasks.forEach(t => {
            const dStr = new Date(t.date).toISOString().split('T')[0];
            const dataPoint = last7Days.find(p => p.date === dStr);
            if (dataPoint) dataPoint.count++;
        });

        res.json(last7Days);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

const getActivityTypes = async (req, res) => {
    try {
        const tasks = await TaskEntry.find().lean();
        const types = {
            'Journal Paper': tasks.filter(t => !!t.paperTitle).length,
            'Project Work': tasks.filter(t => !!t.projectName).length,
            'Patent/IPR': tasks.filter(t => !!t.patentTitle).length,
            'Book/Chapter': tasks.filter(t => !!t.bookTitle).length,
            'General/Other': tasks.filter(t => !!t.activityTitle).length
        };
        const result = Object.entries(types).map(([name, value]) => ({ name, value }));
        res.json(result);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

const getDeptComparison = async (req, res) => {
    try {
        const users = await User.find({ role: 'staff' }).lean();
        const tasks = await TaskEntry.find().lean();
        const depts = [...new Set(users.map(u => u.department || 'General'))];
        
        const result = depts.map(dept => {
            const deptUsers = users.filter(u => (u.department || 'General') === dept).map(u => u._id.toString());
            const deptTasks = tasks.filter(t => deptUsers.includes(t.staff.toString()));
            return {
                department: dept,
                count: deptTasks.length
            };
        });
        res.json(result);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

const getTopStaff = async (req, res) => {
    try {
        const top = await User.find({ role: 'staff' })
            .sort({ totalScore: -1 })
            .limit(5)
            .select('name totalScore department profileImage staffId');
        res.json(top);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc    Get weekly matrix data
// @route   GET /api/admin/weekly-matrix
const getWeeklyMatrix = async (req, res) => {
    try {
        const { week } = req.query; // e.g. 'current' or '2026-W15'
        const now = new Date();
        let startOfWeek = new Date(now);
        const day = now.getDay();
        startOfWeek.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
        startOfWeek.setHours(0, 0, 0, 0);

        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);

        const staffSearchQuery = { role: 'staff', isActive: true };
        const staffList = await User.find(staffSearchQuery).select('name department designation staffId').lean();
        
        const tasks = await TaskEntry.find({
            date: { $gte: startOfWeek, $lte: endOfWeek }
        }).populate('staff', 'name department designation staffId').lean();

        // Grouping: The frontend expects an array of objects: { staff: {}, reports: [] }
        const matrixData = staffList.map(s => {
            const staffTasks = tasks.filter(t => t.staff && t.staff._id.toString() === s._id.toString());
            return {
                staff: s,
                reports: staffTasks
            };
        });

        res.json(matrixData);
    } catch (err) {
        console.error('[WEEKLY MATRIX ERROR]', err);
        res.status(500).json({ message: err.message });
    }
};

// @desc    Bulk update matrix cells
// @route   POST /api/admin/weekly-matrix/bulk-update
const bulkUpdateMatrix = async (req, res) => {
    try {
        const { edits } = req.body; // Array of { staffId, date, content }
        
        if (!edits || !Array.isArray(edits)) {
            return res.status(400).json({ success: false, message: 'Invalid edits data' });
        }

        for (const edit of edits) {
            const { staffId, date, content } = edit;
            
            // The weekly report "saves" manual edits to a specific "summaryCorrection" field
            // We need to find or create a placeholder task entry for that day to store this correction
            const startOfDay = new Date(date);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(date);
            endOfDay.setHours(23, 59, 59, 999);

            let task = await TaskEntry.findOne({
                staff: staffId,
                date: { $gte: startOfDay, $lte: endOfDay }
            });

            if (task) {
                // Update existing
                task.summaryCorrection = content;
                await task.save();
            } else {
                // Create a placeholder task with the correction
                await TaskEntry.create({
                    staff: staffId,
                    date: startOfDay,
                    summaryCorrection: content,
                    status: 'approved', // Auto-approve manual admin edits
                    workloadType: 'Admin Edit'
                });
            }
        }

        res.json({ success: true, message: 'Matrix updated successfully' });
    } catch (err) {
        console.error('[BULK UPDATE ERROR]', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc    Get pending verification
// @route   GET /api/admin/verification/pending
const getPendingVerification = async (req, res) => {
    try {
        const tasks = await TaskEntry.find({ status: 'pending' })
            .populate('staff', 'name department staffId')
            .sort({ date: -1 })
            .lean();

        // Map to a frontend-friendly format with a unified title and type
        const mapped = tasks.map(t => ({
            ...t,
            title: t.paperTitle || t.projectName || t.patentTitle || t.bookTitle || t.activityTitle || 'Untitled Activity',
            docType: t.paperTitle ? 'Publication' : (t.projectName ? 'Project' : (t.patentTitle ? 'Patent' : (t.bookTitle ? 'Book' : 'Other Activity')))
        }));

        res.json(mapped);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// @desc    Delete task (Admin)
// @route   DELETE /api/admin/reports/:id
const deleteAdminTask = async (req, res) => {
    try {
        await TaskEntry.findByIdAndDelete(req.params.id);
        res.json({ message: 'Task deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// @desc    Get all user accounts
// @route   GET /api/admin/users
const getAllUsers = async (req, res) => {
    try {
        const users = await User.find().select('-password');
        res.json(users);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// @desc    Create user account
// @route   POST /api/admin/users
const createUser = async (req, res) => {
    try {
        const user = await User.create(req.body);
        res.status(201).json(user);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// @desc    Reset password
// @route   PUT /api/admin/users/:id/reset-password
const resetPassword = async (req, res) => {
    try {
        const { password } = req.body;
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found' });
        user.password = password;
        await user.save();
        res.json({ message: 'Password updated' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// @desc    Delete user
// @route   DELETE /api/admin/users/:id
const deleteUser = async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        res.json({ message: 'User deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

module.exports = {
    getDashboard,
    getAllStaff,
    createStaff,
    updateStaff,
    toggleStaffStatus,
    deleteStaff,
    getAllTasks,
    updateTaskStatus,
    getPwdRequests,
    handlePwdRequest,
    createNotification,
    getAllNotifications,
    getSystemSettings,
    updateSystemSetting,
    retroactiveApproveToday,
    getTodayStatus,
    getWeeklyTrend,
    getActivityTypes,
    getDeptComparison,
    getTopStaff,
    getWeeklyMatrix,
    bulkUpdateMatrix,
    getPendingVerification,
    deleteAdminTask,
    getAllUsers,
    createUser,
    resetPassword,
    deleteUser
};


