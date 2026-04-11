const mongoose = require('mongoose');

const noticeSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    content: {
        type: String,
        required: true
    },
    category: {
        type: String,
        enum: [
            "Funding Opportunity", "Call for Papers",
            "Journal Deadline", "Conference", "Policy Update", "General"
        ],
        required: true
    },
    priority: {
        type: String,
        enum: ["Normal", "Important", "Urgent"],
        default: "Normal"
    },
    targetType: {
        type: String,
        enum: ["All", "Department", "Staff"],
        default: "All"
    },
    targetDepartment: {
        type: String,
        default: ""
    },
    targetUsers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    readers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    deadline: Date,
    link: String,
    attachments: [String],
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Notice', noticeSchema);
