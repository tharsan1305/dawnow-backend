const User = require('../models/User');
const TaskEntry = require('../models/TaskEntry');
const ScoreRule = require('../models/ScoreRule');
const { calculateTaskScore } = require('../utils/scoreCalculator');

// @desc    Get current user's score breakdown
// @route   GET /api/score/my
// @access  Private (Staff)
const getMyScore = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('totalScore badges');

        // Points Breakdown from TaskEntries
        const approvedTasks = await TaskEntry.find({ staff: req.user._id, status: 'approved' });
        
        const breakdown = {
            totalScore: user.totalScore,
            badges: user.badges,
            activities: []
        };

        // This is a simplified breakdown. In a production app, we would store this more permanently.
        // For now, let's just group by activity types.
        approvedTasks.forEach(task => {
            // ... grouping logic could go here ...
        });

        res.json(breakdown);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get leaderboard
// @route   GET /api/score/leaderboard
// @access  Private
const getLeaderboard = async (req, res) => {
    try {
        const { dept } = req.query;
        const query = { role: 'staff', isActive: true };
        if (dept) query.department = dept;

        const leaderboard = await User.find(query)
            .sort({ totalScore: -1 })
            .limit(10)
            .select('name department designation totalScore badges');

        res.json(leaderboard);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get score rules
// @route   GET /api/score/rules
// @access  Private (Admin)
const getRules = async (req, res) => {
    try {
        const rules = await ScoreRule.find();
        res.json(rules);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Update a score rule
// @route   PUT /api/score/rules/:id
// @access  Private (Admin)
const updateRule = async (req, res) => {
    try {
        const { points, label, isActive } = req.body;
        const rule = await ScoreRule.findById(req.params.id);
        
        if (!rule) {
            return res.status(404).json({ message: 'Rule not found' });
        }

        rule.points = points !== undefined ? points : rule.points;
        rule.label = label || rule.label;
        rule.isActive = isActive !== undefined ? isActive : rule.isActive;
        await rule.save();

        res.json(rule);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Recalculate ALL users' totalScore from approved task entries
// @route   POST /api/score/recalculate
// @access  Private (Admin)
const recalculateAllScores = async (req, res) => {
    try {
        const users = await User.find({ role: 'staff' });

        for (const user of users) {
            const approvedTasks = await TaskEntry.find({ staff: user._id, status: 'approved' });
            let newTotalScore = 0;

            for (const task of approvedTasks) {
                newTotalScore += await calculateTaskScore(task);
            }

            user.totalScore = newTotalScore;
            await user.save();
        }

        res.json({ message: 'All scores recalculated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    getMyScore,
    getLeaderboard,
    getRules,
    updateRule,
    recalculateAllScores
};
