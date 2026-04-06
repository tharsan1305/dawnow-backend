const Award = require('../models/Award');
const User = require('../models/User');

// @desc    Get user's awards
// @route   GET /api/awards/my
// @access  Private (Staff)
const getMyAwards = async (req, res) => {
    try {
        const awards = await Award.find({ staff: req.user._id }).sort({ createdAt: -1 });
        res.json(awards);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get all awards
// @route   GET /api/awards/all
// @access  Private
const getAllAwards = async (req, res) => {
    try {
        const awards = await Award.find()
            .populate('staff', 'name department designation')
            .sort({ createdAt: -1 });
        res.json(awards);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Give an award
// @route   POST /api/awards
// @access  Private (Admin)
const createAward = async (req, res) => {
    try {
        const { staffId, title, category, month, description, badgeIcon } = req.body;

        const award = await Award.create({
            staff: staffId,
            title,
            category,
            month,
            awardedBy: req.user._id,
            description,
            badgeIcon
        });

        // Add badge to user's badge array
        const user = await User.findById(staffId);
        if (user) {
            user.badges.push(badgeIcon || '🏆');
            await user.save();
        }

        res.status(201).json(award);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Delete award
// @route   DELETE /api/awards/:id
// @access  Private (Admin)
const deleteAward = async (req, res) => {
    try {
        const award = await Award.findById(req.params.id);
        if (!award) return res.status(404).json({ message: 'Award not found' });

        await award.deleteOne();
        res.json({ message: 'Award deleted' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    getMyAwards,
    getAllAwards,
    createAward,
    deleteAward
};
