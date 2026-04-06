const Leave = require('../models/Leave');

// @desc    Get user's leave
// @route   GET /api/leave/my
// @access  Private (Staff)
const getMyLeave = async (req, res) => {
    try {
        const leave = await Leave.find({ staff: req.user._id }).sort({ date: -1 });
        res.json(leave);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Mark a leave day
// @route   POST /api/leave
// @access  Private (Staff)
const markLeave = async (req, res) => {
    try {
        const { date, leaveType, reason } = req.body;
        const staffId = req.user._id;

        const leaveDate = new Date(date);
        leaveDate.setHours(0, 0, 0, 0);

        const leave = await Leave.create({
            staff: staffId,
            date: leaveDate,
            leaveType,
            reason,
            isApproved: true
        });

        res.status(201).json(leave);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get all staff leave history
// @route   GET /api/leave/all
// @access  Private (Admin)
const getAllLeave = async (req, res) => {
    try {
        const leave = await Leave.find().populate('staff', 'name department designation');
        res.json(leave);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = { getMyLeave, markLeave, getAllLeave };
