const express = require('express');
const router = express.Router();
const { getMonthlyCertificate } = require('../controllers/certificate.controller');
const { protect } = require('../middleware/auth');

router.get('/:staffId/:month/:year', protect, getMonthlyCertificate);

module.exports = router;
