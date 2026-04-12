const express = require('express');
const router = express.Router();
const { 
    getStaffPerformance, 
    getDepartmentPerformance, 
    getChartsData 
} = require('../controllers/analytics.controller');
const { protect, isAdmin } = require('../middleware/auth');

// Middleware to ensure admin only
router.use(protect);
router.use(isAdmin);

router.get('/staff-performance', getStaffPerformance);
router.get('/department-performance', getDepartmentPerformance);
router.get('/charts', getChartsData);

module.exports = router;
