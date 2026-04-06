const mongoose = require('mongoose');

const leaveSchema = new mongoose.Schema({
    staff: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    leaveType: {
        type: String,
        enum: ["Conference", "Duty Leave", "Medical", "Personal", "Holiday"],
        required: true
    },
    reason: {
        type: String,
        default: ''
    },
    isApproved: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

leaveSchema.index({ staff: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Leave', leaveSchema);
