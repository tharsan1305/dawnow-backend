const mongoose = require('mongoose');

const scoreRuleSchema = new mongoose.Schema({
    label: {
        type: String,
        required: true
    },
    activity: {
        type: String,
        required: true,
        unique: true
    },
    points: {
        type: Number,
        required: true
    },
    description: {
        type: String,
        default: ''
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('ScoreRule', scoreRuleSchema);
