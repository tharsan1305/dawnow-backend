const Project = require('../models/Project');
const path = require('path');
const fs = require('fs');

// @desc    Create new project
// @route   POST /api/projects
// @access  Private (Admin)
const createProject = async (req, res) => {
    try {
        const projectData = { ...req.body };

        // Handle file uploads
        if (req.files) {
            projectData.documents = {};
            if (req.files.projectReport) {
                projectData.documents.projectReport = req.files.projectReport[0].path;
            }
            if (req.files.sanctionLetter) {
                projectData.documents.sanctionLetter = req.files.sanctionLetter[0].path;
            }
            if (req.files.completionCertificate) {
                projectData.documents.completionCertificate = req.files.completionCertificate[0].path;
            }
        }

        // Calculate amount pending
        const sanctioned = parseFloat(projectData.amountSanctioned) || 0;
        const received = parseFloat(projectData.amountReceived) || 0;
        projectData.amountSanctioned = sanctioned;
        projectData.amountReceived = received;
        projectData.amountPending = sanctioned - received;

        // Parse dates
        if (projectData.startDate) projectData.startDate = new Date(projectData.startDate);
        if (projectData.endDate) projectData.endDate = new Date(projectData.endDate);
        if (projectData.submissionDate) projectData.submissionDate = new Date(projectData.submissionDate);

        const project = await Project.create(projectData);
        res.status(201).json(project);
    } catch (error) {
        console.error('Create project error:', error);
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(e => e.message);
            return res.status(400).json({ message: messages.join(', ') });
        }
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get all projects with filters
// @route   GET /api/projects
// @access  Private (Admin)
const getAllProjects = async (req, res) => {
    try {
        const { search, status, department, agency, startDate, endDate, page = 1, limit = 50 } = req.query;

        const filter = {};

        if (search) {
            filter.$or = [
                { projectTitle: { $regex: search, $options: 'i' } },
                { principalInvestigator: { $regex: search, $options: 'i' } }
            ];
        }

        if (status && status !== 'All') {
            filter.status = status;
        }

        if (department && department !== 'All') {
            filter.department = department;
        }

        if (agency) {
            filter.fundingAgency = { $regex: agency, $options: 'i' };
        }

        if (startDate || endDate) {
            filter.startDate = {};
            if (startDate) filter.startDate.$gte = new Date(startDate);
            if (endDate) filter.startDate.$lte = new Date(endDate);
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [projects, total] = await Promise.all([
            Project.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit)),
            Project.countDocuments(filter)
        ]);

        res.json({
            projects,
            total,
            page: parseInt(page),
            pages: Math.ceil(total / parseInt(limit))
        });
    } catch (error) {
        console.error('Get projects error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get single project by ID
// @route   GET /api/projects/:id
// @access  Private (Admin)
const getProjectById = async (req, res) => {
    try {
        const project = await Project.findById(req.params.id);
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }
        res.json(project);
    } catch (error) {
        console.error('Get project error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Update project
// @route   PUT /api/projects/:id
// @access  Private (Admin)
const updateProject = async (req, res) => {
    try {
        const project = await Project.findById(req.params.id);
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        const updateData = { ...req.body };

        // Handle file uploads
        if (req.files) {
            if (!updateData.documents) updateData.documents = { ...project.documents };
            if (req.files.projectReport) {
                // Delete old file if exists
                if (project.documents?.projectReport && fs.existsSync(project.documents.projectReport)) {
                    fs.unlinkSync(project.documents.projectReport);
                }
                updateData.documents.projectReport = req.files.projectReport[0].path;
            }
            if (req.files.sanctionLetter) {
                if (project.documents?.sanctionLetter && fs.existsSync(project.documents.sanctionLetter)) {
                    fs.unlinkSync(project.documents.sanctionLetter);
                }
                updateData.documents.sanctionLetter = req.files.sanctionLetter[0].path;
            }
            if (req.files.completionCertificate) {
                if (project.documents?.completionCertificate && fs.existsSync(project.documents.completionCertificate)) {
                    fs.unlinkSync(project.documents.completionCertificate);
                }
                updateData.documents.completionCertificate = req.files.completionCertificate[0].path;
            }
        }

        // Calculate amount pending
        const sanctioned = parseFloat(updateData.amountSanctioned) || project.amountSanctioned;
        const received = parseFloat(updateData.amountReceived) || project.amountReceived;
        updateData.amountSanctioned = sanctioned;
        updateData.amountReceived = received;
        updateData.amountPending = sanctioned - received;

        // Parse dates
        if (updateData.startDate) updateData.startDate = new Date(updateData.startDate);
        if (updateData.endDate) updateData.endDate = new Date(updateData.endDate);
        if (updateData.submissionDate) updateData.submissionDate = new Date(updateData.submissionDate);

        updateData.updatedAt = Date.now();

        const updatedProject = await Project.findByIdAndUpdate(
            req.params.id,
            { $set: updateData },
            { new: true, runValidators: true }
        );

        res.json(updatedProject);
    } catch (error) {
        console.error('Update project error:', error);
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(e => e.message);
            return res.status(400).json({ message: messages.join(', ') });
        }
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Delete project
// @route   DELETE /api/projects/:id
// @access  Private (Admin)
const deleteProject = async (req, res) => {
    try {
        const project = await Project.findById(req.params.id);
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        // Delete associated files
        if (project.documents) {
            Object.values(project.documents).forEach(filePath => {
                if (filePath && fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            });
        }

        await Project.findByIdAndDelete(req.params.id);
        res.json({ message: 'Project deleted successfully' });
    } catch (error) {
        console.error('Delete project error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get funding report summary
// @route   GET /api/projects/report
// @access  Private (Admin)
const getFundingReport = async (req, res) => {
    try {
        const projects = await Project.find();

        const totalProjects = projects.length;

        const byStatus = {
            prepared: 0,
            submitted: 0,
            revision: 0,
            accepted: 0,
            published: 0
        };

        let totalSanctioned = 0;
        let totalReceived = 0;
        let totalPending = 0;

        const agencyMap = {};
        const monthlyMap = {};

        projects.forEach(project => {
            // Count by status
            const statusKey = project.status.toLowerCase();
            if (byStatus.hasOwnProperty(statusKey)) {
                byStatus[statusKey]++;
            }

            // Sum amounts
            totalSanctioned += project.amountSanctioned || 0;
            totalReceived += project.amountReceived || 0;
            totalPending += project.amountPending || 0;

            // Group by agency
            const agency = project.fundingAgency || 'Unknown';
            if (!agencyMap[agency]) {
                agencyMap[agency] = { name: agency, total: 0, count: 0 };
            }
            agencyMap[agency].total += project.amountSanctioned || 0;
            agencyMap[agency].count++;

            // Monthly submissions
            if (project.createdAt) {
                const date = new Date(project.createdAt);
                const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                const monthLabel = date.toLocaleString('default', { month: 'short' });
                if (!monthlyMap[monthKey]) {
                    monthlyMap[monthKey] = { month: monthLabel, count: 0 };
                }
                monthlyMap[monthKey].count++;
            }
        });

        // Sort monthly data chronologically
        const monthlyData = Object.keys(monthlyMap)
            .sort()
            .map(key => monthlyMap[key]);

        // Sort by agency by total descending
        const byAgency = Object.values(agencyMap).sort((a, b) => b.total - a.total);

        // Top funded projects
        const topFunded = [...projects]
            .sort((a, b) => (b.amountSanctioned || 0) - (a.amountSanctioned || 0))
            .slice(0, 10);

        // Recent status updates
        const recentUpdates = [...projects]
            .filter(p => p.updatedAt !== p.createdAt)
            .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
            .slice(0, 10);

        res.json({
            totalProjects,
            byStatus,
            totalSanctioned,
            totalReceived,
            totalPending,
            byAgency,
            monthlyData,
            topFunded,
            recentUpdates
        });
    } catch (error) {
        console.error('Get report error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    createProject,
    getAllProjects,
    getProjectById,
    updateProject,
    deleteProject,
    getFundingReport
};
