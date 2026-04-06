const Question = require('../models/Question');

// @desc    Get active questions grouped by section (for staff)
// @route   GET /api/questions
// @access  Private
const getQuestions = async (req, res) => {
    try {
        const questions = await Question.find({ isActive: true }).sort({ section: 1, order: 1 });

        // Group questions by section
        const grouped = {};
        questions.forEach(q => {
            const section = q.section || 'general';
            if (!grouped[section]) {
                grouped[section] = [];
            }
            grouped[section].push(q);
        });

        res.json({ questions, grouped });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get questions by section
// @route   GET /api/questions/section/:section
// @access  Private
const getQuestionsBySection = async (req, res) => {
    try {
        const questions = await Question.find({
            isActive: true,
            section: req.params.section
        }).sort({ order: 1 });

        res.json(questions);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get all questions (for admin)
// @route   GET /api/questions/all
// @access  Private (Admin)
const getAllQuestions = async (req, res) => {
    try {
        const questions = await Question.find().sort({ section: 1, order: 1 });

        // Group questions by section
        const grouped = {};
        questions.forEach(q => {
            const section = q.section || 'general';
            if (!grouped[section]) {
                grouped[section] = [];
            }
            grouped[section].push(q);
        });

        res.json({ questions, grouped });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Create question
// @route   POST /api/questions
// @access  Private (Admin)
const createQuestion = async (req, res) => {
    try {
        const {
            questionText,
            type,
            options,
            section,
            label,
            placeholder,
            required,
            order
        } = req.body;

        const question = await Question.create({
            questionText: questionText || req.body.text,
            type: type || 'text',
            options: options || [],
            section: section || 'general',
            label: label,
            placeholder: placeholder,
            required: required || false,
            order: order || 0,
            createdBy: req.user._id
        });

        res.status(201).json(question);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Update question
// @route   PUT /api/questions/:id
// @access  Private (Admin)
const updateQuestion = async (req, res) => {
    try {
        const {
            questionText,
            type,
            options,
            section,
            label,
            placeholder,
            required,
            order,
            isActive
        } = req.body;

        const question = await Question.findById(req.params.id);
        if (!question) {
            return res.status(404).json({ message: 'Question not found' });
        }

        // Update fields if provided
        if (questionText !== undefined) question.questionText = questionText;
        if (type !== undefined) question.type = type;
        if (options !== undefined) question.options = options;
        if (section !== undefined) question.section = section;
        if (label !== undefined) question.label = label;
        if (placeholder !== undefined) question.placeholder = placeholder;
        if (required !== undefined) question.required = required;
        if (order !== undefined) question.order = order;
        if (isActive !== undefined) question.isActive = isActive;

        await question.save();
        res.json(question);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Delete question (soft delete)
// @route   DELETE /api/questions/:id
// @access  Private (Admin)
const deleteQuestion = async (req, res) => {
    try {
        const question = await Question.findById(req.params.id);
        if (!question) {
            return res.status(404).json({ message: 'Question not found' });
        }

        await question.deleteOne();

        res.json({ message: 'Question deleted' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Toggle question active status
// @route   PATCH /api/questions/:id/toggle
// @access  Private (Admin)
const toggleQuestion = async (req, res) => {
    try {
        const question = await Question.findById(req.params.id);
        if (!question) {
            return res.status(404).json({ message: 'Question not found' });
        }

        question.isActive = !question.isActive;
        await question.save();

        res.json(question);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Reorder questions
// @route   PUT /api/questions/reorder
// @access  Private (Admin)
const reorderQuestions = async (req, res) => {
    try {
        const { questions } = req.body; // Array of { id, order, section }

        if (!questions || !Array.isArray(questions)) {
            return res.status(400).json({ message: 'Questions array is required' });
        }

        const updatePromises = questions.map(({ id, order, section }) =>
            Question.findByIdAndUpdate(id, { order, section }, { new: true })
        );

        await Promise.all(updatePromises);

        const updatedQuestions = await Question.find().sort({ section: 1, order: 1 });
        res.json(updatedQuestions);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    getQuestions,
    getQuestionsBySection,
    getAllQuestions,
    createQuestion,
    updateQuestion,
    deleteQuestion,
    toggleQuestion,
    reorderQuestions
};
