const express = require('express');
const router = express.Router();
const { protect, isAdmin } = require('../middleware/auth');
const { getActiveNotices, getAllNotices, createNotice, updateNotice, deleteNotice } = require('../controllers/notice.controller');

router.use(protect);

router.get('/', getActiveNotices);

// Admin only
router.get('/all', isAdmin, getAllNotices);
router.post('/', isAdmin, createNotice);
router.put('/:id', isAdmin, updateNotice);
router.delete('/:id', isAdmin, deleteNotice);

module.exports = router;
