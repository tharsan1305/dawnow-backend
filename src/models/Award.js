const mongoose = require('mongoose');

const awardSchema = new mongoose.Schema({
    staff: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    title: {
        type: String,
        required: true
    },
    category: {
        type: String,
        enum: [
            "Best Researcher", "Top Patent Filer",
            "Most Publications", "Most Active", "Special Recognition"
        ],
        required: true
    },
    month: {
        type: String,
        required: true
    },
    awardedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    description: String,
    badgeIcon: {
        type: String,
        default: '🏆'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Award', awardSchema);
