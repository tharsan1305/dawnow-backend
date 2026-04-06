const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
    taskEntry: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TaskEntry',
        required: true
    },
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    role: {
        type: String,
        enum: ["staff", "admin"],
        required: true
    },
    message: {
        type: String,
        required: true
    },
    isRead: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Comment', commentSchema);
