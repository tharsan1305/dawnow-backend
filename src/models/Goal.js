const mongoose = require('mongoose');

const goalSchema = new mongoose.Schema({
    staff: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    academicYear: {
        type: String,
        required: true
    },
    targetPapers: { type: Number, default: 0 },
    targetSCI: { type: Number, default: 0 },
    targetPatents: { type: Number, default: 0 },
    targetFunded: { type: Number, default: 0 },
    targetBooks: { type: Number, default: 0 },
    targetWorkshops: { type: Number, default: 0 },
    customGoals: [{
        title: { type: String, required: true },
        target: { type: Number, required: true },
        current: { type: Number, default: 0 }
    }],
    isApproved: {
        type: Boolean,
        default: false
    },
    adminNote: {
        type: String,
        default: ''
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Goal', goalSchema);
