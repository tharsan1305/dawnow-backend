const express = require('express');
const router = express.Router();
const {
    sendMessage,
    getConversation,
    getAdminConversations,
    getUnreadTotal
} = require('../controllers/message.controller');
const { protect, isAdmin } = require('../middleware/auth');

router.use(protect); // All chat routes need login

router.get('/unread/count', getUnreadTotal);
router.post('/', sendMessage);
router.get('/:otherId', getConversation);
router.get('/admin/list', isAdmin, getAdminConversations);

module.exports = router;
