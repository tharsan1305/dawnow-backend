const express = require('express');
const router = express.Router();
const {
    getTasks,
    createTask,
    getTask,
    getTaskByDate,
    updateTask,
    getNotifications,
    getUnreadCount,
    markAsRead,
    requestPasswordChange,
    getPwdRequestStatus
} = require('../controllers/staff.controller');
const { protect, isStaff } = require('../middleware/auth');

// All routes require authentication and staff role
router.use(protect, isStaff);

// Task routes
router.get('/tasks', getTasks);
router.post('/tasks', createTask);
router.get('/tasks/date/:date', getTaskByDate);
router.get('/tasks/:id', getTask);
router.put('/tasks/:id', updateTask);

// Notification routes
router.get('/notifications', getNotifications);
router.get('/notifications/unread-count', getUnreadCount);
router.patch('/notifications/:id/read', markAsRead);

// Password request routes
router.post('/pwd-request', requestPasswordChange);
router.get('/pwd-request', getPwdRequestStatus);

module.exports = router;
