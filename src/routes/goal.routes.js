const express = require('express');
const router = express.Router();
const { protect, isAdmin } = require('../middleware/auth');
const { getMyGoals, createOrUpdateGoal, getAllGoals, approveGoal } = require('../controllers/goal.controller');

router.use(protect);

router.get('/my', getMyGoals);
router.post('/', createOrUpdateGoal);

// Admin only
router.get('/all', isAdmin, getAllGoals);
router.patch('/:id/approve', isAdmin, approveGoal);

module.exports = router;
