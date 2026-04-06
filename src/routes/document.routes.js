const express = require('express');
const router = express.Router();
const { protect, isAdmin } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { uploadDocument, getMyDocuments, getAllDocuments, verifyDocument, deleteDocument } = require('../controllers/document.controller');

router.use(protect);

router.post('/upload', upload.single('file'), uploadDocument);
router.get('/my', getMyDocuments);
router.delete('/:id', deleteDocument);

// Admin only
router.get('/all', isAdmin, getAllDocuments);
router.patch('/:id/verify', isAdmin, verifyDocument);

module.exports = router;
