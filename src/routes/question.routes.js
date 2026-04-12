const express = require('express');
const router = express.Router();
const {
    getQuestions,
    getAllQuestions,
    createQuestion,
    updateQuestion,
    deleteQuestion,
    reorderQuestions,
    seedQuestions
} = require('../controllers/question.controller');
const { protect, isAdmin } = require('../middleware/auth');

// Public/Staff access (authenticated)
router.get('/', protect, getQuestions);

// Admin exclusive routes
router.use(protect, isAdmin);

router.get('/all', getAllQuestions);
router.post('/', createQuestion);
router.put('/reorder', reorderQuestions);
router.put('/:id', updateQuestion);
router.delete('/:id', deleteQuestion);
router.post('/seed', seedQuestions);

module.exports = router;
