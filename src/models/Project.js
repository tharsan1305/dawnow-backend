const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
    projectTitle: {
        type: String,
        required: [true, 'Project title is required'],
        trim: true
    },
    principalInvestigator: {
        type: String,
        required: [true, 'Principal Investigator is required'],
        trim: true
    },
    coInvestigator: {
        type: String,
        trim: true
    },
    department: {
        type: String,
        required: [true, 'Department is required'],
        enum: ['CSE', 'IT', 'ECE', 'EEE', 'MECH', 'CIVIL', 'MBA', 'MCA', 'Other']
    },
    institution: {
        type: String,
        required: [true, 'Institution name is required'],
        trim: true
    },
    description: {
        type: String,
        required: [true, 'Project description is required']
    },
    startDate: {
        type: Date,
        required: [true, 'Start date is required']
    },
    endDate: {
        type: Date,
        required: [true, 'End date is required']
    },

    fundingAgency: {
        type: String,
        required: [true, 'Funding agency is required'],
        trim: true
    },
    fundingScheme: {
        type: String,
        required: [true, 'Funding scheme is required'],
        trim: true
    },
    grantReferenceNumber: {
        type: String,
        trim: true
    },
    amountSanctioned: {
        type: Number,
        default: 0,
        min: [0, 'Amount sanctioned cannot be negative']
    },
    amountReceived: {
        type: Number,
        default: 0,
        min: [0, 'Amount received cannot be negative']
    },
    amountPending: {
        type: Number,
        default: 0
    },

    status: {
        type: String,
        enum: ['Prepared', 'Submitted', 'Revision', 'Accepted', 'Published'],
        default: 'Prepared',
        required: true
    },
    statusRemarks: {
        type: String
    },
    submissionDate: {
        type: Date
    },

    documents: {
        projectReport: { type: String },
        sanctionLetter: { type: String },
        completionCertificate: { type: String }
    },

    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Auto-calculate amountPending before save
projectSchema.pre('save', function (next) {
    this.amountPending = this.amountSanctioned - this.amountReceived;
    this.updatedAt = Date.now();
    next();
});

// Auto-calculate amountPending before findOneAndUpdate
projectSchema.pre('findOneAndUpdate', function (next) {
    const update = this.getUpdate();
    if (update.$set) {
        const sanctioned = update.$set.amountSanctioned;
        const received = update.$set.amountReceived;
        if (sanctioned !== undefined || received !== undefined) {
            const currentDoc = this._conditions;
            // amountPending will be recalculated in controller
        }
    }
    update.$set = update.$set || {};
    update.$set.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('Project', projectSchema);
