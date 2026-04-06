const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
    staff: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    taskEntry: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TaskEntry'
    },
    title: {
        type: String,
        required: true
    },
    docType: {
        type: String,
        enum: [
            "Paper Acceptance", "Patent Certificate",
            "Conference Certificate", "Grant Letter",
            "Book Publication", "Other"
        ],
        required: true
    },
    fileName: String,
    filePath: String,
    fileSize: Number,
    mimeType: String,
    isVerified: {
        type: Boolean,
        default: false
    },
    verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    verifiedAt: Date,
    adminNote: String
}, {
    timestamps: true
});

module.exports = mongoose.model('Document', documentSchema);
