const Document = require('../models/Document');
const TaskEntry = require('../models/TaskEntry');
const fs = require('fs');
const path = require('path');

// @desc    Upload document
// @route   POST /api/documents/upload
// @access  Private (Staff)
const uploadDocument = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const { title, docType, taskEntryId } = req.body;
        const staffId = req.user._id;

        const document = await Document.create({
            staff: staffId,
            taskEntry: taskEntryId || null,
            title,
            docType,
            fileName: req.file.filename,
            filePath: `/${req.file.path.replace(/\\/g, '/')}`,
            fileSize: req.file.size,
            mimeType: req.file.mimetype
        });

        res.status(201).json(document);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get current user documents
// @route   GET /api/documents/my
// @access  Private (Staff)
const getMyDocuments = async (req, res) => {
    try {
        const documents = await Document.find({ staff: req.user._id }).sort({ createdAt: -1 });
        res.json(documents);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get all documents for verification
// @route   GET /api/documents/all
// @access  Private (Admin)
const getAllDocuments = async (req, res) => {
    try {
        console.log('DEBUG: ENTERING getAllDocuments Controller');
        const documents = await Document.find()
            .populate('staff', 'name department staffId')
            .sort({ createdAt: -1 });
        console.log('DEBUG: Documents found:', documents.length);
        res.json(documents);
    } catch (error) {
        console.error('DEBUG: Error in getAllDocuments:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Verify document
// @route   PATCH /api/documents/:id/verify
// @access  Private (Admin)
const verifyDocument = async (req, res) => {
    try {
        const { isVerified, adminNote } = req.body;
        const document = await Document.findById(req.params.id);

        if (!document) {
            return res.status(404).json({ message: 'Document not found' });
        }

        document.isVerified = isVerified;
        document.adminNote = adminNote || '';
        document.verifiedBy = req.user._id;
        document.verifiedAt = Date.now();
        await document.save();

        res.json(document);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Delete document
// @route   DELETE /api/documents/:id
// @access  Private (Staff)
const deleteDocument = async (req, res) => {
    try {
        const document = await Document.findById(req.params.id);
        if (!document) {
            return res.status(404).json({ message: 'Document not found' });
        }

        // Only staff who uploaded can delete
        if (document.staff.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to delete this document' });
        }

        // Remove file from filesystem
        if (fs.existsSync(document.filePath)) {
            fs.unlinkSync(document.filePath);
        }

        await document.deleteOne();
        res.json({ message: 'Document and file deleted' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    uploadDocument,
    getMyDocuments,
    getAllDocuments,
    verifyDocument,
    deleteDocument
};
