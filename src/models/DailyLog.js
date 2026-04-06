const mongoose = require('mongoose');

const dailyLogSchema = new mongoose.Schema({
    staff: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    workDone: {
        type: String,
        required: true
    },
    hoursSpent: {
        type: Number,
        min: 0,
        max: 24,
        required: true
    },
    category: {
        type: String,
        enum: [
            "Writing Paper", "Lab Work", "Reading/Research",
            "Meeting", "Grant Work", "Review", "Teaching",
            "Administrative", "Other"
        ],
        required: true
    },
    projectName: {
        type: String,
        default: ''
    },
    progressPercent: {
        type: Number,
        min: 0,
        max: 100,
        default: 0
    },
    tomorrowPlan: {
        type: String,
        default: ''
    },
    mood: {
        type: String,
        enum: ["Productive", "Normal", "Slow", "Stuck"],
        default: "Normal"
    },
    isLeaveDay: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// One log per staff per day
dailyLogSchema.index({ staff: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('DailyLog', dailyLogSchema);
