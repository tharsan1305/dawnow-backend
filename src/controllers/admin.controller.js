const User = require('../models/User');
const TaskEntry = require('../models/TaskEntry');
const Notification = require('../models/Notification');
const PwdRequest = require('../models/PwdRequest');

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

        // Research Metrics (Only Approved)
        const approvedTasks = await TaskEntry.find({ status: 'approved' }).populate('staff').lean();

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
            .lean()
            .skip(skip)
            .limit(limit);
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
        await task.save();

        // If newly approved, update user totalScore
        if (status === 'approved' && oldStatus !== 'approved') {
            const user = await User.findById(task.staff);
            if (user) {
                const taskScore = await calculateTaskScore(task);
                user.totalScore += taskScore;
                await user.save();
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
    getAllNotifications
};
