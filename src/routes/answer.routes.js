const express = require('express');
const router = express.Router();
const Answer = require('../models/Answer');
const Question = require('../models/Question');
const { protect, isAdmin } = require('../middleware/auth');

// @desc    Submit answers for a date
// @route   POST /api/answers
// @access  Private (Staff)
router.post('/', protect, async (req, res) => {
    try {
        const { answers, date, academicYear } = req.body;
        const userId = req.user._id;

        if (!answers || typeof answers !== 'object') {
            return res.status(400).json({ message: 'Answers object is required' });
        }

        // Process each answer
        const answerPromises = Object.entries(answers).map(([questionId, answerValue]) => {
            return Answer.findOneAndUpdate(
                { userId, questionId, date: new Date(date).toISOString().split('T')[0] },
                {
                    userId,
                    questionId,
                    answer: answerValue,
                    date: new Date(date),
                    academicYear: academicYear || ''
                },
                { upsert: true, returnDocument: 'after' }
            );
        });

        await Promise.all(answerPromises);

        res.status(201).json({ message: 'Answers submitted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @desc    Get answers for current user by date
// @route   GET /api/answers/:date
// @access  Private (Staff)
router.get('/:date', protect, async (req, res) => {
    try {
        const userId = req.user._id;
        const date = req.params.date;

        const answers = await Answer.find({
            userId,
            date: new Date(date).toISOString().split('T')[0]
        }).populate('questionId');

        // Transform to key-value format
        const answersMap = {};
        answers.forEach(a => {
            if (a.questionId) {
                answersMap[a.questionId._id] = a.answer;
            }
        });

        res.json(answersMap);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @desc    Get all answers (admin view)
// @route   GET /api/answers/all
// @access  Private (Admin)
router.get('/all/by-date', protect, isAdmin, async (req, res) => {
    try {
        const { from, to, userId, section } = req.query;

        let query = {};

        if (from || to) {
            query.date = {};
            if (from) query.date.$gte = new Date(from);
            if (to) query.date.$lte = new Date(to);
        }

        if (userId) {
            query.userId = userId;
        }

        let answers = await Answer.find(query)
            .populate('userId', 'name staffId department')
            .populate('questionId')
            .sort({ date: -1 });

        // Filter by section if provided
        if (section) {
            answers = answers.filter(a =>
                a.questionId && a.questionId.section === section
            );
        }

        res.json(answers);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @desc    Get answers by user (admin view)
// @route   GET /api/answers/user/:userId
// @access  Private (Admin)
router.get('/user/:userId', protect, isAdmin, async (req, res) => {
    try {
        const answers = await Answer.find({ userId: req.params.userId })
            .populate('questionId')
            .sort({ date: -1 });

        res.json(answers);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @desc    Get answer summary/analytics
// @route   GET /api/answers/summary
// @access  Private (Admin)
router.get('/summary/stats', protect, isAdmin, async (req, res) => {
    try {
        const { from, to } = req.query;

        let query = {};

        if (from || to) {
            query.date = {};
            if (from) query.date.$gte = new Date(from);
            if (to) query.date.$lte = new Date(to);
        }

        const answers = await Answer.find(query).populate('questionId');

        // Group by section
        const summary = {};
        answers.forEach(a => {
            if (a.questionId) {
                const section = a.questionId.section || 'general';
                if (!summary[section]) {
                    summary[section] = { count: 0, questions: {} };
                }
                summary[section].count++;
                const qId = a.questionId._id.toString();
                if (!summary[section].questions[qId]) {
                    summary[section].questions[qId] = {
                        text: a.questionId.questionText,
                        type: a.questionId.type,
                        answerCount: 0
                    };
                }
                summary[section].questions[qId].answerCount++;
            }
        });

        res.json(summary);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @desc    Delete answer
// @route   DELETE /api/answers/:id
// @access  Private
router.delete('/:id', protect, async (req, res) => {
    try {
        const answer = await Answer.findById(req.params.id);

        if (!answer) {
            return res.status(404).json({ message: 'Answer not found' });
        }

        // Check if user owns the answer or is admin
        if (answer.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized' });
        }

        await answer.deleteOne();
        res.json({ message: 'Answer deleted' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
