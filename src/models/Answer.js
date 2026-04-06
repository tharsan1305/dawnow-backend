const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    questionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Question',
        required: true
    },
    answer: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },
    date: {
        type: Date,
        default: Date.now
    },
    academicYear: {
        type: String
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Compound index for efficient queries
answerSchema.index({ userId: 1, questionId: 1, date: -1 });
answerSchema.index({ questionId: 1 });

answerSchema.pre('save', function (next) {
    this.updatedAt = new Date();
    next();
});

module.exports = mongoose.model('Answer', answerSchema);
