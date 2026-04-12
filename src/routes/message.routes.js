const express = require('express');
const router = express.Router();
const {
    getSupportAdmin,
    sendMessage,
    getConversation,
    getAdminConversations,
    getUnreadTotal,
    markAsRead
} = require('../controllers/message.controller');
const { protect, isAdmin } = require('../middleware/auth');

router.use(protect); // All chat routes need login

// Routes matching requested structure
router.get('/unread-count', getUnreadTotal);
router.get('/support-admin', getSupportAdmin);
router.get('/conversations', isAdmin, getAdminConversations);
router.post('/', sendMessage);
router.put('/read/:userId', markAsRead);
router.get('/:userId', getConversation);

module.exports = router;
