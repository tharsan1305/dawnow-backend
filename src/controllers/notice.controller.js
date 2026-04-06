const Notice = require('../models/Notice');

// @desc    Get active notices
// @route   GET /api/notices
// @access  Private
const getActiveNotices = async (req, res) => {
    try {
        const notices = await Notice.find({ isActive: true }).sort({ createdAt: -1 });
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
        const { title, content, category, priority, deadline, link } = req.body;
        
        const notice = await Notice.create({
            title,
            content,
            category,
            priority,
            deadline,
            link,
            createdBy: req.user._id
        });

        res.status(201).json(notice);
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
        const { title, content, category, priority, deadline, link, isActive } = req.body;
        const notice = await Notice.findById(req.params.id);

        if (!notice) return res.status(404).json({ message: 'Notice not found' });

        notice.title = title || notice.title;
        notice.content = content || notice.content;
        notice.category = category || notice.category;
        notice.priority = priority || notice.priority;
        notice.deadline = deadline || notice.deadline;
        notice.link = link || notice.link;
        notice.isActive = isActive !== undefined ? isActive : notice.isActive;

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
    deleteNotice
};
