const Goal = require('../models/Goal');

// @desc    Get current user goals
// @route   GET /api/goals/my
// @access  Private (Staff)
const getMyGoals = async (req, res) => {
    try {
        const goals = await Goal.find({ staff: req.user._id }).sort({ createdAt: -1 });
        res.json(goals);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Create or update goals
// @route   POST /api/goals
// @access  Private (Staff)
const createOrUpdateGoal = async (req, res) => {
    try {
        const { academicYear, targetPapers, targetSCI, targetPatents, targetFunded, targetBooks, targetWorkshops, customGoals } = req.body;
        const staffId = req.user._id;

        let goal = await Goal.findOne({ staff: staffId, academicYear });

        if (goal) {
            goal.targetPapers = targetPapers;
            goal.targetSCI = targetSCI;
            goal.targetPatents = targetPatents;
            goal.targetFunded = targetFunded;
            goal.targetBooks = targetBooks;
            goal.targetWorkshops = targetWorkshops;
            goal.customGoals = customGoals;
            await goal.save();
            return res.json(goal);
        }

        goal = await Goal.create({
            staff: staffId,
            academicYear,
            targetPapers,
            targetSCI,
            targetPatents,
            targetFunded,
            targetBooks,
            targetWorkshops,
            customGoals
        });

        res.status(201).json(goal);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get all goals
// @route   GET /api/goals/all
// @access  Private (Admin)
const getAllGoals = async (req, res) => {
    try {
        const goals = await Goal.find().populate('staff', 'name department designation');
        res.json(goals);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Approve goal
// @route   PATCH /api/goals/:id/approve
// @access  Private (Admin)
const approveGoal = async (req, res) => {
    try {
        const { adminNote } = req.body;
        const goal = await Goal.findById(req.params.id);
        
        if (!goal) {
            return res.status(404).json({ message: 'Goal not found' });
        }

        goal.isApproved = true;
        goal.adminNote = adminNote || '';
        await goal.save();

        res.json(goal);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    getMyGoals,
    createOrUpdateGoal,
    getAllGoals,
    approveGoal
};
