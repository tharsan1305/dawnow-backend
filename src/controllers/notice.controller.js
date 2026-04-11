const Notice = require('../models/Notice');
const User = require('../models/User');

// @desc    Get active notices relevant to the user
// @route   GET /api/notices
// @access  Private
const getActiveNotices = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).populate('staffProfile');
        const department = user.department || user.staffProfile?.department || "";

        const query = {
            isActive: true,
            $or: [
                { targetType: 'All' },
                { targetType: 'Department', targetDepartment: department },
                { targetType: 'Staff', targetUsers: req.user._id }
            ]
        };

        const notices = await Notice.find(query).sort({ priority: -1, createdAt: -1 });
        res.json(notices);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get all notices
// @route   GET /api/notices/all
// @access  Private (Admin)
const getAllNotices = async (req, res) => {
    try {
        const notices = await Notice.find().sort({ createdAt: -1 });
        res.json(notices);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Create a notice
// @route   POST /api/notices
// @access  Private (Admin)
const createNotice = async (req, res) => {
    try {
        const { title, content, category, priority, deadline, link, targetType, targetDepartment, targetUsers } = req.body;
        
        const notice = await Notice.create({
            title,
            content,
            category,
            priority,
            deadline,
            link,
            targetType,
            targetDepartment,
            targetUsers,
            createdBy: req.user._id
        });

        // Emit real-time notification to staff
        if (global.io) {
            const socketData = {
                id: notice._id,
                title: notice.title,
                message: notice.content, // Using content as message for staff toast
                priority: notice.priority,
                targetType: notice.targetType,
                targetDepartment: notice.targetDepartment,
                targetUsers: notice.targetUsers,
                time: new Date().toISOString()
            };

            // Emit to different groups based on targeting
            if (notice.targetType === 'All') {
                global.io.to('staff').emit('new_announcement', socketData);
            } else if (notice.targetType === 'Department') {
                global.io.to(`dept_${notice.targetDepartment}`).emit('new_announcement', socketData);
            } else if (notice.targetType === 'Staff' && notice.targetUsers?.length > 0) {
                notice.targetUsers.forEach(uId => {
                    global.io.to(`user_${uId}`).emit('new_announcement', socketData);
                });
            }
        }

        res.status(201).json(notice);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Mark notice as read
// @route   POST /api/notices/:id/read
// @access  Private
const markAsRead = async (req, res) => {
    try {
        const notice = await Notice.findById(req.params.id);
        if (!notice) return res.status(404).json({ message: 'Notice not found' });

        if (!notice.readers.includes(req.user._id)) {
            notice.readers.push(req.user._id);
            await notice.save();
        }

        res.json({ message: 'Notice marked as read' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Update a notice
// @route   PUT /api/notices/:id
// @access  Private (Admin)
const updateNotice = async (req, res) => {
    try {
        const { title, content, category, priority, deadline, link, isActive, targetType, targetDepartment, targetUsers } = req.body;
        const notice = await Notice.findById(req.params.id);

        if (!notice) return res.status(404).json({ message: 'Notice not found' });

        notice.title = title || notice.title;
        notice.content = content || notice.content;
        notice.category = category || notice.category;
        notice.priority = priority || notice.priority;
        notice.deadline = deadline || notice.deadline;
        notice.link = link || notice.link;
        notice.isActive = isActive !== undefined ? isActive : notice.isActive;
        notice.targetType = targetType || notice.targetType;
        notice.targetDepartment = targetDepartment || notice.targetDepartment;
        notice.targetUsers = targetUsers || notice.targetUsers;

        await notice.save();
        res.json(notice);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Delete/Deactivate a notice
// @route   DELETE /api/notices/:id
// @access  Private (Admin)
const deleteNotice = async (req, res) => {
    try {
        const notice = await Notice.findById(req.params.id);
        if (!notice) return res.status(404).json({ message: 'Notice not found' });

        await notice.deleteOne();
        res.json({ message: 'Notice deleted' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    getActiveNotices,
    getAllNotices,
    createNotice,
    updateNotice,
    deleteNotice,
    markAsRead
};
