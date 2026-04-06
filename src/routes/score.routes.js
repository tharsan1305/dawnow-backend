const express = require('express');
const router = express.Router();
const { protect, isAdmin } = require('../middleware/auth');
const { getMyScore, getLeaderboard, getRules, updateRule, recalculateAllScores } = require('../controllers/score.controller');

router.use(protect);

router.get('/my', getMyScore);
router.get('/leaderboard', getLeaderboard);

// Admin only
router.get('/rules', isAdmin, getRules);
router.put('/rules/:id', isAdmin, updateRule);
router.post('/recalculate', isAdmin, recalculateAllScores);

module.exports = router;
