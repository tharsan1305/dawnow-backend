const mongoose = require('mongoose');

const taskEntrySchema = new mongoose.Schema({
    staff: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    date: {
        type: Date,
        required: [true, 'Date is required'],
        default: Date.now
    },
    academicYear: {
        type: String,
        required: true
    },
    // Section 1: Paper Work Load Details
    paperTitle: { type: String, default: '' },
    paperStatus: { type: String, default: '' },
    journalType: { type: String, default: '' },
    journalName: { type: String, default: '' },
    impactFactor: { type: String, default: '' },

    // Section 2: Funded Project Work Load
    projectName: { type: String, default: '' },
    projectStatus: { type: String, default: '' },
    fundingTitle: { type: String, default: '' },
    fundingAgency: { type: String, default: '' },
    fundingAmount: { type: String, default: '' },

    // Section 3: Patent Work Load
    patentType: { type: String, default: '' },
    patentLevel: { type: String, default: '' },
    patentTitle: { type: String, default: '' },
    applicationNumber: { type: String, default: '' },
    filingDate: { type: String, default: '' },
    pageNumber: { type: String, default: '' },

    // Section 4: Book Writing Details
    authorName: { type: String, default: '' },
    bookStatus: { type: String, default: '' },
    bookTitle: { type: String, default: '' },
    publisherName: { type: String, default: '' },
    isbnNumber: { type: String, default: '' },
    publishedYear: { type: String, default: '' },

    // Section 5: Other Activities
    activityType: { type: String, default: '' },
    activityTitle: { type: String, default: '' },
    organizedBy: { type: String, default: '' },
    activityDate: { type: String, default: '' },

    // Section 6: Additional Workload
    additionalWorkload1: { type: String, default: '' },
    additionalWorkload2: { type: String, default: '' },
    additionalWorkload3: { type: String, default: '' },
    additionalWorkload4: { type: String, default: '' },
    additionalWorkload5: { type: String, default: '' },

    // Dynamic Section
    dynamicAnswers: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
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

// Index for efficient queries
taskEntrySchema.index({ staff: 1, date: -1 });
taskEntrySchema.index({ academicYear: 1 });

module.exports = mongoose.model('TaskEntry', taskEntrySchema);
