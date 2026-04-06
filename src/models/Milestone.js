const mongoose = require('mongoose');

const milestoneSchema = new mongoose.Schema({
    staff: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    projectName: {
        type: String,
        required: true
    },
    projectType: {
        type: String,
        enum: ["Paper", "Patent", "Funded Project", "Book", "Other"],
        required: true
    },
    milestones: [{
        title: { type: String, required: true },
        description: String,
        dueDate: Date,
        status: {
            type: String,
            enum: ["Pending", "In Progress", "Completed", "Delayed"],
            default: "Pending"
        },
        completedAt: Date
    }],
    overallProgress: {
        type: Number,
        min: 0,
        max: 100,
        default: 0
    },
    collaborators: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    startDate: Date,
    targetDate: Date
}, {
    timestamps: true
});

module.exports = mongoose.model('Milestone', milestoneSchema);
