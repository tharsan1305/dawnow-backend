const express = require('express');
const router = express.Router();
const { generatePDF, generateExcel, generateAnalyticsPDF } = require('../controllers/report.controller');
const { protect, isAdmin } = require('../middleware/auth');

// All routes require authentication and admin role
router.use(protect, isAdmin);

router.get('/pdf', generatePDF);
router.get('/excel', generateExcel);
router.get('/analytics-pdf', generateAnalyticsPDF);

module.exports = router;
