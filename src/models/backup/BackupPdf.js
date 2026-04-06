const mongoose = require('mongoose');

const BackupPdfSchema = new mongoose.Schema({
  originalReportId: { type: mongoose.Schema.Types.ObjectId },
  filename:         { type: String, required: true },
  mimeType:         { type: String, default: 'application/pdf' },
  sizeBytes:        { type: Number },
  base64Data:       { type: String, required: true },
  snapshotId:       { type: String },
  uploadedAt:       { type: Date, default: Date.now },
});

module.exports = BackupPdfSchema;
