const Question = require('../models/Question');

// @desc    Get all questions or by section
// @route   GET /api/questions
// @access  Private
const getQuestions = async (req, res) => {
    try {
        const { section, isActive } = req.query;
        const query = {};
        
        if (section) query.section = section;
        if (isActive === 'true') query.isActive = true;

        const questions = await Question.find(query).sort({ section: 1, order: 1 });

        // Group questions by section for structured consumers
        const grouped = {};
        questions.forEach(q => {
            const sec = q.section || 'other';
            if (!grouped[sec]) {
                grouped[sec] = [];
            }
            grouped[sec].push(q);
        });

        res.json({ success: true, questions, grouped });
    } catch (error) {
        console.error('[QUESTION CONTROLLER ERROR]', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get all questions (Admin detailed view)
// @route   GET /api/questions/all
// @access  Private (Admin)
const getAllQuestions = async (req, res) => {
    try {
        const questions = await Question.find().sort({ section: 1, order: 1 });
        
        const grouped = {};
        questions.forEach(q => {
            const sec = q.section || 'other';
            if (!grouped[sec]) grouped[sec] = [];
            grouped[sec].push(q);
        });

        res.json({ success: true, questions, grouped });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Create question
// @route   POST /api/questions
// @access  Private (Admin)
const createQuestion = async (req, res) => {
    try {
        const {
            section,
            label,
            fieldType,
            options,
            placeholder,
            isRequired,
            isBuiltIn,
            order
        } = req.body;

        const question = await Question.create({
            section,
            label,
            fieldType: fieldType || 'text',
            options: options || [],
            placeholder: placeholder || '',
            isRequired: isRequired || false,
            isBuiltIn: isBuiltIn || false,
            order: order || 0,
            createdBy: req.user._id
        });

        res.status(201).json({ success: true, question });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update question
// @route   PUT /api/questions/:id
// @access  Private (Admin)
const updateQuestion = async (req, res) => {
    try {
        const question = await Question.findById(req.params.id);
        if (!question) {
            return res.status(404).json({ success: false, message: 'Question not found' });
        }

        // If built-in, restrict some updates if necessary (optional)
        // For now, let admin edit everything but maybe not the isBuiltIn flag
        const updates = req.body;
        delete updates.isBuiltIn; // Prevent changing built-in status via update

        Object.keys(updates).forEach(key => {
            question[key] = updates[key];
        });

        await question.save();
        res.json({ success: true, question });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Delete question
// @route   DELETE /api/questions/:id
// @access  Private (Admin)
const deleteQuestion = async (req, res) => {
    try {
        const question = await Question.findById(req.params.id);
        if (!question) {
            return res.status(404).json({ success: false, message: 'Question not found' });
        }

        if (question.isBuiltIn) {
            return res.status(400).json({ 
                success: false, 
                message: 'Cannot delete built-in fields. These are core to the platform.' 
            });
        }

        await question.deleteOne();
        res.json({ success: true, message: 'Question deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Reorder questions within a section or globally
// @route   PUT /api/questions/reorder
// @access  Private (Admin)
const reorderQuestions = async (req, res) => {
    try {
        const { questions } = req.body; // Array of { _id, order }

        if (!questions || !Array.isArray(questions)) {
            return res.status(400).json({ success: false, message: 'Invalid data' });
        }

        const bulkOps = questions.map(q => ({
            updateOne: {
                filter: { _id: q._id },
                update: { $set: { order: q.order } }
            }
        }));

        await Question.bulkWrite(bulkOps);

        res.json({ success: true, message: 'Order updated successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Seed built-in questions
// @route   POST /api/questions/seed
// @access  Private (Admin)
const seedQuestions = async (req, res) => {
    try {
        const builtInFields = [
            // Paper
            { section: 'paper', label: 'Paper Title', fieldType: 'text', isBuiltIn: true, order: 0, isRequired: true },
            { section: 'paper', label: 'Paper Status', fieldType: 'select', options: ['Submitted', 'Revision', 'Accepted', 'Published', 'Prepared'], isBuiltIn: true, order: 1 },
            { section: 'paper', label: 'Journal Type', fieldType: 'select', options: ['SCI', 'Scopus', 'Conference', 'UGC Care', 'Other'], isBuiltIn: true, order: 2 },
            { section: 'paper', label: 'Journal Name', fieldType: 'text', isBuiltIn: true, order: 3, isRequired: true },
            { section: 'paper', label: 'Impact Factor', fieldType: 'number', isBuiltIn: true, order: 4 },

            // Project
            { section: 'project', label: 'Project Name', fieldType: 'text', isBuiltIn: true, order: 0, isRequired: true },
            { section: 'project', label: 'Project Status', fieldType: 'select', options: ['Submitted', 'Approved', 'In Progress', 'Completed'], isBuiltIn: true, order: 1 },
            { section: 'project', label: 'Funding Title', fieldType: 'text', isBuiltIn: true, order: 2 },
            { section: 'project', label: 'Funding Agency', fieldType: 'text', isBuiltIn: true, order: 3 },
            { section: 'project', label: 'Funding Amount', fieldType: 'number', isBuiltIn: true, order: 4 },

            // Patent
            { section: 'patent', label: 'Patent Type', fieldType: 'select', options: ['Filed', 'Published', 'Granted'], isBuiltIn: true, order: 0 },
            { section: 'patent', label: 'Patent Level', fieldType: 'select', options: ['First', 'Design', 'Utility'], isBuiltIn: true, order: 1 },
            { section: 'patent', label: 'Patent Title', fieldType: 'text', isBuiltIn: true, order: 2 },
            { section: 'patent', label: 'Application Number', fieldType: 'text', isBuiltIn: true, order: 3 },
            { section: 'patent', label: 'Filing Date', fieldType: 'date', isBuiltIn: true, order: 4 },

            // Book
            { section: 'book', label: 'Author Name', fieldType: 'text', isBuiltIn: true, order: 0 },
            { section: 'book', label: 'Book Status', fieldType: 'select', options: ['Published', 'In Progress', 'Completed'], isBuiltIn: true, order: 1 },
            { section: 'book', label: 'Book Title', fieldType: 'text', isBuiltIn: true, order: 2 },
            { section: 'book', label: 'Publisher Name', fieldType: 'text', isBuiltIn: true, order: 3 },
            { section: 'book', label: 'ISBN Number', fieldType: 'text', isBuiltIn: true, order: 4 },

            // Other/Activity
            { section: 'other', label: 'Activity Type', fieldType: 'select', options: ['FDP', 'Workshop', 'Seminar', 'Conference', 'Guest Lecture', 'Webinar'], isBuiltIn: true, order: 0 },
            { section: 'other', label: 'Activity Title', fieldType: 'text', isBuiltIn: true, order: 1 },
            { section: 'other', label: 'Organized By', fieldType: 'text', isBuiltIn: true, order: 2 },
            { section: 'other', label: 'Activity Date', fieldType: 'date', isBuiltIn: true, order: 3 }
        ];

        for (const field of builtInFields) {
            await Question.findOneAndUpdate(
                { section: field.section, label: field.label, isBuiltIn: true },
                field,
                { upsert: true }
            );
        }

        res.json({ success: true, message: 'Questions seeded successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    getQuestions,
    getAllQuestions,
    createQuestion,
    updateQuestion,
    deleteQuestion,
    reorderQuestions,
    seedQuestions
};
