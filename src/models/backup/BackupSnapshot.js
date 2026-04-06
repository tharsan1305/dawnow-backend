const mongoose = require('mongoose');

const BackupSnapshotSchema = new mongoose.Schema({
  snapshotId:     { type: String, required: true, unique: true },
  trigger:        { type: String, enum: ['report-submit','manual',
                    'pre-crash','pre-restore'], required: true },
  triggeredBy:    { type: mongoose.Schema.Types.ObjectId,
                    ref: 'User', default: null },
  status:         { type: String, enum: ['success','failed',
                    'in-progress'], default: 'in-progress' },
  collections: {
    taskentries: { count: Number, success: Boolean },
    users:       { count: Number, success: Boolean },
    dailylogs:   { count: Number, success: Boolean },
    pdflogs:     { count: Number, success: Boolean },
    pdfs:        { count: Number, success: Boolean },
  },
  totalDocuments: { type: Number, default: 0 },
  errorMessage:   { type: String, default: null },
  createdAt:      { type: Date, default: Date.now },
  restoredAt:     { type: Date, default: null },
  restoredBy:     { type: mongoose.Schema.Types.ObjectId,
                    ref: 'User', default: null },
});

module.exports = BackupSnapshotSchema;
