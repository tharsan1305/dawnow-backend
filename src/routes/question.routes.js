const express = require('express');
const router = express.Router();
const {
    getQuestions,
    getQuestionsBySection,
    getAllQuestions,
    createQuestion,
    updateQuestion,
    deleteQuestion,
    toggleQuestion,
    reorderQuestions
} = require('../controllers/question.controller');
const { protect, isAdmin } = require('../middleware/auth');

// Public route for getting active questions
router.get('/', protect, getQuestions);

// Get questions by section
router.get('/section/:section', protect, getQuestionsBySection);

// Admin routes
router.get('/all', protect, isAdmin, getAllQuestions);
router.post('/', protect, isAdmin, createQuestion);
router.put('/reorder', protect, isAdmin, reorderQuestions);
router.put('/:id', protect, isAdmin, updateQuestion);
router.patch('/:id/toggle', protect, isAdmin, toggleQuestion);
router.delete('/:id', protect, isAdmin, deleteQuestion);

module.exports = router;
