const express = require('express');
const router = express.Router();
const { login, getMe, updateProfile } = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.post('/login', login);
router.get('/me', protect, getMe);
router.put('/profile', protect, upload.single('profileImage'), updateProfile);

module.exports = router;
