const express = require('express');
const router = express.Router();
const { protect, isAdmin } = require('../middleware/auth');
const { getOverview, getByDepartment, getMonthlyTrend, getTopPerformers, getWeeklyAnalytics, getMonthlyAnalytics } = require('../controllers/analytics.controller');

router.use(protect);
router.use(isAdmin);

router.get('/overview', getOverview);
router.get('/weekly', getWeeklyAnalytics);
router.get('/monthly', getMonthlyAnalytics);
router.get('/by-department', getByDepartment);
router.get('/monthly-trend', getMonthlyTrend);
router.get('/top-performers', getTopPerformers);

module.exports = router;
