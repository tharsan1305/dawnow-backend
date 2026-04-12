const express = require('express');
const router = express.Router();
const { getAIChatResponse } = require('../controllers/ai.controller');
const { protect } = require('../middleware/auth');

// All chat routes require authentication
router.use(protect);

router.post('/chat', getAIChatResponse);

module.exports = router;
