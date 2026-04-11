const express = require('express');
const router = express.Router();
const {
    getTasks,
    createTask,
    getTask,
    getTaskByDate,
    updateTask,
    deleteTask,
    getNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    requestPasswordChange,
    updateProfile,
    getProfile,
    getMyReports,
    getStreak,
    getResearchTargets
} = require('../controllers/staff.controller');
const { protect, isStaff } = require('../middleware/auth');

// All routes require authentication and staff role
router.use(protect, isStaff);

// Profile
router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.put('/profile/password', requestPasswordChange);

// Dashboard / Stats
router.get('/my-reports', getMyReports);
router.get('/streak', getStreak);
router.get('/targets', getResearchTargets);

// Tasks / Reports
router.get('/tasks', getTasks);
router.post('/tasks', createTask);
router.get('/tasks/today', (req, res, next) => {
    req.params.date = new Date().toISOString().split('T')[0];
    getTaskByDate(req, res, next);
});
router.get('/tasks/date/:date', getTaskByDate);
router.get('/tasks/:id', getTask);
router.put('/tasks/:id', updateTask);
router.delete('/tasks/:id', deleteTask);

// Notifications
router.get('/notifications', getNotifications);
router.get('/notifications/unread-count', getUnreadCount);
router.put('/notifications/:id/read', markAsRead);
router.put('/notifications/read-all', markAllAsRead);

module.exports = router;
