const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
    questionText: {
        type: String,
        required: [true, 'Question text is required'],
        trim: true
    },
    type: {
        type: String,
        enum: ['text', 'textarea', 'date', 'number', 'mcq', 'checkbox', 'yesno'],
        default: 'text'
    },
    options: [{
        type: String,
        trim: true
    }],
    section: {
        type: String,
        enum: ['paper', 'project', 'patent', 'book', 'activity', 'additional', 'general'],
        default: 'general'
    },
    label: {
        type: String,
        trim: true
    },
    placeholder: {
        type: String,
        trim: true
    },
    required: {
        type: Boolean,
        default: false
    },
    order: {
        type: Number,
        default: 0
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

// Index for efficient queries
questionSchema.index({ section: 1, isActive: 1, order: 1 });

module.exports = mongoose.model('Question', questionSchema);
