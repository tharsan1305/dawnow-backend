const express = require('express');
const router = express.Router();
const { protect, isAdmin } = require('../middleware/auth');
const { createOrUpdateLog, getMyLogs, getTodayLog, getStreak } = require('../controllers/dailylog.controller');

router.use(protect);

router.post('/', createOrUpdateLog);
router.get('/', getMyLogs);
router.get('/today', getTodayLog);
router.get('/streak', getStreak);

module.exports = router;
