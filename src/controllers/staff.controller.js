const TaskEntry = require('../models/TaskEntry');
const Notification = require('../models/Notification');
const PwdRequest = require('../models/PwdRequest');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const { runBackup } = require('../backup/backupEngine');

// @desc    Get staff tasks
// @route   GET /api/staff/tasks
// @access  Private (Staff)
const getTasks = async (req, res) => {
    try {
        const { from, to, page = 1, limit = 10 } = req.query;

        const query = { staff: req.user._id };

        if (from || to) {
            query.date = {};
            if (from) query.date.$gte = new Date(from);
            if (to) query.date.$lte = new Date(to);
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

// @desc    Create new task
// @route   POST /api/staff/tasks
// @access  Private (Staff)
const createTask = async (req, res) => {
    try {
        const currentHour = new Date().getHours();
        const autoApprove = currentHour >= 17; // 5 PM or later

        const taskData = {
            ...req.body,
            staff: req.user._id,
            ...(autoApprove && { status: 'approved', adminNote: 'Auto-approved (Submitted after 5 PM)' })
        };

        const task = await TaskEntry.create(taskData);
        await task.populate('staff', 'name staffId department designation');

        if (autoApprove) {
            const user = await User.findById(req.user._id);
            if (user) {
                const taskScore = await calculateTaskScore(task);
                user.totalScore += taskScore;
                await user.save();
            }
        }

        res.status(201).json(task);

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

        if (task.status !== 'pending') {
            return res.status(400).json({ message: 'Can only edit pending tasks' });
        }

        const currentHour = new Date().getHours();
        const autoApprove = currentHour >= 17; // 5 PM or later

        const updateData = {
            ...req.body,
            ...(autoApprove && { status: 'approved', adminNote: 'Auto-approved (Edited after 5 PM)' })
        };

        const updatedTask = await TaskEntry.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        ).populate('staff', 'name staffId department designation');

        if (autoApprove) {
            const user = await User.findById(req.user._id);
            if (user) {
                const taskScore = await calculateTaskScore(updatedTask);
                user.totalScore += taskScore;
                await user.save();
            }
        }

        res.json(updatedTask);

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

module.exports = {
    getTasks,
    createTask,
    getTask,
    getTaskByDate,
    updateTask,
    getNotifications,
    getUnreadCount,
    markAsRead,
    requestPasswordChange,
    getPwdRequestStatus
};
