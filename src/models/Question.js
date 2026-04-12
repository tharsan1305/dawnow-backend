const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
    section: { 
        type: String, 
        required: [true, 'Section is required'],
        enum: ['paper', 'project', 'patent', 'book', 'other', 'general', 'activity', 'additional']
    },
    label: { 
        type: String, 
        required: [true, 'Label is required'],
        trim: true 
    },
    fieldType: { 
        type: String, 
        enum: ['text', 'textarea', 'select', 'number', 'date', 'file', 'yesno', 'mcq', 'checkbox'], 
        default: 'text' 
    },
    options: [{
        type: String,
        trim: true
    }],
    placeholder: {
        type: String,
        trim: true
    },
    isRequired: { 
        type: Boolean, 
        default: false 
    },
    isBuiltIn: { 
        type: Boolean, 
        default: false 
    },
    order: { 
        type: Number, 
        default: 0 
    },
    isActive: { 
        type: Boolean, 
        default: true 
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

// Index for efficient queries
questionSchema.index({ section: 1, isActive: 1, order: 1 });

module.exports = mongoose.model('Question', questionSchema);
