const express = require('express');
const router = express.Router();
const { generatePDF, generateExcel, generateAnalyticsPDF } = require('../controllers/report.controller');
const { updateTask } = require('../controllers/staff.controller');
const { protect, isAdmin } = require('../middleware/auth');

// Existing routes require authentication and admin role
router.get('/pdf', protect, isAdmin, generatePDF);
router.get('/excel', protect, isAdmin, generateExcel);
router.get('/analytics-pdf', protect, isAdmin, generateAnalyticsPDF);

// Feature 1: Add backend API: PUT /api/reports/:id to handle edit
router.put('/:id', protect, updateTask);

module.exports = router;
