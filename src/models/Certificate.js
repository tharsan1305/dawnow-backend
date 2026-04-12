const mongoose = require('mongoose');

const certificateSchema = new mongoose.Schema({
    staff: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    month: {
        type: Number, // 1-12
        required: true
    },
    year: {
        type: Number,
        required: true
    },
    stats: {
        workingDays: Number,
        submittedDays: Number,
        papers: Number,
        projects: Number,
        patents: Number,
        books: Number
    },
    rating: {
        type: String,
        enum: ['Excellent', 'Good', 'Average', 'Poor'],
        required: true
    },
    pdfPath: {
        type: String,
        required: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Certificate', certificateSchema);
