const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { protect, isAdmin } = require('../middleware/auth');
const {
    createProject,
    getAllProjects,
    getProjectById,
    updateProject,
    deleteProject,
    getFundingReport
} = require('../controllers/project.controller');

// Project document upload configuration
const projectStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(process.env.UPLOAD_PATH || './uploads', 'projects');
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const timestamp = Date.now();
        const safeName = file.originalname.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
        cb(null, `${timestamp}-${safeName}`);
    }
});

const projectFileFilter = (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only PDF files are allowed.'), false);
    }
};

const projectUpload = multer({
    storage: projectStorage,
    fileFilter: projectFileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
    }
});

const uploadFields = projectUpload.fields([
    { name: 'projectReport', maxCount: 1 },
    { name: 'sanctionLetter', maxCount: 1 },
    { name: 'completionCertificate', maxCount: 1 }
]);

// All routes require admin access
router.use(protect);
router.use(isAdmin);

router.route('/')
    .get(getAllProjects)
    .post(uploadFields, createProject);

router.get('/report', getFundingReport);

router.route('/:id')
    .get(getProjectById)
    .put(uploadFields, updateProject)
    .delete(deleteProject);

module.exports = router;
