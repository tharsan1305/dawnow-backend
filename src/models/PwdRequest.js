const mongoose = require('mongoose');

const pwdRequestSchema = new mongoose.Schema({
    staff: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    newPassword: {
        type: String,
        required: true,
        select: false
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    adminNote: {
        type: String,
        default: ''
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('PwdRequest', pwdRequestSchema);
