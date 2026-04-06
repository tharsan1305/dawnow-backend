const mongoose = require('mongoose');

const SystemHealthLogSchema = new mongoose.Schema({
  status:            { type: String, enum: ['healthy','degraded',
                       'crashed'], required: true },
  dbConnected:       { type: Boolean, required: true },
  backupDbConnected: { type: Boolean, required: true },
  uploadsOk:         { type: Boolean, default: true },
  recoveryAction:    { type: String, default: null },
  checkedAt:         { type: Date, default: Date.now },
});

module.exports = SystemHealthLogSchema;
