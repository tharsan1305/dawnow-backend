const express = require('express');
const router = express.Router();
const { 
    generatePDF, 
    generateExcel, 
    generateAnalyticsPDF, 
    generateStaffSummaryPDF,
    bulkUpdateReport,
    getWeeklyMatrix,
    generateStaffMonthlyPDF
} = require('../controllers/report.controller');
// const { generateWeeklyHtmlPdf } = require('../controllers/weeklyReportPdf.controller');
const { updateTask } = require('../controllers/staff.controller');
const { protect, isAdmin } = require('../middleware/auth');

// Existing routes require authentication and admin role
router.get('/pdf', protect, isAdmin, generatePDF);
// router.get('/weekly-html-pdf', protect, isAdmin, generateWeeklyHtmlPdf);
router.get('/excel', protect, isAdmin, generateExcel);
router.get('/analytics-pdf', protect, isAdmin, generateAnalyticsPDF);
router.get('/staff-summary', protect, isAdmin, generateStaffSummaryPDF);

// Report corrections and matrix
router.post('/bulk-update', protect, isAdmin, bulkUpdateReport);
router.get('/weekly-matrix', protect, isAdmin, getWeeklyMatrix);

// Feature 7: Per-person report
router.get('/staff-monthly', protect, isAdmin, generateStaffMonthlyPDF);

// Feature 1 follow-up / task update
router.put('/:id', protect, updateTask);

module.exports = router;
