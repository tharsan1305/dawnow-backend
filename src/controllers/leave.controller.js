const LeaveRequest = require('../models/LeaveRequest');
const User = require('../models/User');

// @desc    Apply for leave
// @route   POST /api/leave/apply
// @access  Private (Staff)
const applyLeave = async (req, res) => {
    try {
        const { startDate, endDate, type, reason } = req.body;
        const leave = await LeaveRequest.create({
            staff: req.user._id,
            startDate,
            endDate,
            type,
            reason
        });
        res.status(201).json(leave);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get my leave history
// @route   GET /api/leave/my-leaves
// @access  Private (Staff)
const getMyLeaves = async (req, res) => {
    try {
        const leaves = await LeaveRequest.find({ staff: req.user._id }).sort({ createdAt: -1 });
        res.json(leaves);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get all leave requests
// @route   GET /api/admin/leave-requests
// @access  Private (Admin)
const getLeaveRequests = async (req, res) => {
    try {
        const requests = await LeaveRequest.find()
            .populate('staff', 'name department staffId')
            .sort({ createdAt: -1 });
        res.json(requests);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Approve leave
// @route   PUT /api/admin/leave-requests/:id/approve
// @access  Private (Admin)
const approveLeave = async (req, res) => {
    try {
        const leave = await LeaveRequest.findByIdAndUpdate(
            req.params.id,
            { status: 'approved' },
            { new: true }
        );
        res.json(leave);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Reject leave
// @route   PUT /api/admin/leave-requests/:id/reject
// @access  Private (Admin)
const rejectLeave = async (req, res) => {
    try {
        const { reason } = req.body;
        const leave = await LeaveRequest.findByIdAndUpdate(
            req.params.id,
            { status: 'rejected', adminNote: reason },
            { new: true }
        );
        res.json(leave);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    applyLeave,
    getMyLeaves,
    getLeaveRequests,
    approveLeave,
    rejectLeave
};
