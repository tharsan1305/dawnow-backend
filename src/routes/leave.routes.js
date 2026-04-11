const express = require('express');
const router = express.Router();
const {
    applyLeave,
    getMyLeaves,
    getLeaveRequests,
    approveLeave,
    rejectLeave
} = require('../controllers/leave.controller');
const { protect, isStaff, isAdmin } = require('../middleware/auth');

// Staff routes
router.post('/apply', protect, isStaff, applyLeave);
router.get('/my-leaves', protect, isStaff, getMyLeaves);

// Admin routes
router.get('/requests', protect, isAdmin, getLeaveRequests);
router.put('/requests/:id/approve', protect, isAdmin, approveLeave);
router.put('/requests/:id/reject', protect, isAdmin, rejectLeave);

module.exports = router;
