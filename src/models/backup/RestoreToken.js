const mongoose = require('mongoose');

const RestoreTokenSchema = new mongoose.Schema({
  adminId:   { type: mongoose.Schema.Types.ObjectId,
               ref: 'User', required: true },
  token:     { type: String, required: true },
  used:      { type: Boolean, default: false },
  expiresAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = RestoreTokenSchema;
