const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/admin.controller');
const { protect, isAdmin } = require('../middleware/auth');

// All routes require authentication and admin role
router.use(protect, isAdmin);

// Dashboard
router.get('/dashboard', getDashboard);

// Staff management
router.get('/staff', getAllStaff);
router.post('/staff', createStaff);
router.put('/staff/:id', updateStaff);
router.patch('/staff/:id/toggle', toggleStaffStatus);
router.delete('/staff/:id', deleteStaff);

// Task management
router.get('/tasks', getAllTasks);
router.patch('/tasks/:id/status', updateTaskStatus);

// Password requests
router.get('/pwd-requests', getPwdRequests);
router.patch('/pwd-requests/:id', handlePwdRequest);

// Notifications
router.post('/notifications', createNotification);
router.get('/notifications', getAllNotifications);

module.exports = router;
