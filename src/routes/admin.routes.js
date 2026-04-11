const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analytics.controller');
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
    getAllNotifications,
    getSystemSettings,
    updateSystemSetting,
    retroactiveApproveToday,
    getTodayStatus,
    getWeeklyTrend,
    getActivityTypes,
    getDeptComparison,
    getTopStaff,
    getWeeklyMatrix,
    bulkUpdateMatrix,
    getPendingVerification,
    deleteAdminTask,
    getAllUsers,
    createUser,
    resetPassword,
    deleteUser
} = require('../controllers/admin.controller');


const { protect, isAdmin } = require('../middleware/auth');

// All routes require authentication and admin role
router.use(protect, isAdmin);

// Dashboard
router.get('/dashboard/stats', getDashboard);
router.get('/dashboard/today-status', getTodayStatus);
router.get('/today-status', getTodayStatus); // Compatibility alias
router.get('/dashboard/analytics/weekly-trend', getWeeklyTrend);
router.get('/dashboard/analytics/activity-types', getActivityTypes);
router.get('/dashboard/analytics/department-comparison', getDeptComparison);
router.get('/dashboard/analytics/top-staff', getTopStaff);
router.get('/dashboard/analytics/overview', analyticsController.getOverview);
router.get('/dashboard/analytics/weekly', analyticsController.getWeeklyAnalytics);
router.get('/dashboard/analytics/monthly', analyticsController.getMonthlyAnalytics);
router.get('/dashboard/recent-reports', (req, res) => {
    // Already part of getDashboard, but let's provide a specific one if needed
    getDashboard(req, res);
});

// Staff management
router.get('/staff', getAllStaff);
router.post('/staff', createStaff);
router.put('/staff/:id', updateStaff);
router.patch('/staff/:id/toggle', toggleStaffStatus);
router.delete('/staff/:id', deleteStaff);

// Task / Report management
router.get('/reports', getAllTasks);
router.get('/tasks', getAllTasks); // Alias
router.put('/reports/:id/approve', (req, res) => {
    req.body.status = 'approved';
    updateTaskStatus(req, res);
});
router.put('/reports/:id/reject', (req, res) => {
    req.body.status = 'rejected';
    updateTaskStatus(req, res);
});
router.delete('/reports/:id', deleteAdminTask);

// Weekly Matrix
router.get('/weekly-matrix', getWeeklyMatrix);
router.post('/weekly-matrix/bulk-update', bulkUpdateMatrix);

// Verification
router.get('/verification/pending', getPendingVerification);
router.put('/verification/:id/approve', (req, res) => {
    req.body.status = 'approved';
    updateTaskStatus(req, res);
});
router.put('/verification/:id/reject', (req, res) => {
    req.body.status = 'rejected';
    updateTaskStatus(req, res);
});

// User management (Security)
router.get('/users', getAllUsers);
router.post('/users', createUser);
router.put('/users/:id/reset-password', resetPassword);
router.delete('/users/:id', deleteUser);

// Password requests
router.get('/pwd-requests', getPwdRequests);
router.patch('/pwd-requests/:id', handlePwdRequest);

// System Settings
router.get('/settings', getSystemSettings);
router.post('/settings', updateSystemSetting);
router.post('/settings/apply-today', retroactiveApproveToday);

module.exports = router;
