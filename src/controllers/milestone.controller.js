const Milestone = require('../models/Milestone');

// @desc    Get user's milestones
// @route   GET /api/milestones/my
// @access  Private (Staff)
const getMyMilestones = async (req, res) => {
    try {
        const milestones = await Milestone.find({ 
            $or: [
                { staff: req.user._id },
                { collaborators: req.user._id }
            ]
        }).populate('staff', 'name department').sort({ createdAt: -1 });

        res.json(milestones);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Create new project with milestones
// @route   POST /api/milestones
// @access  Private (Staff)
const createProject = async (req, res) => {
    try {
        const { projectName, projectType, milestones, collaborators, startDate, targetDate } = req.body;
        const staffId = req.user._id;

        const project = await Milestone.create({
            staff: staffId,
            projectName,
            projectType,
            milestones,
            collaborators,
            startDate,
            targetDate
        });

        res.status(201).json(project);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Update project milestones
// @route   PUT /api/milestones/:id
// @access  Private (Staff)
const updateProject = async (req, res) => {
    try {
        const { projectName, projectType, milestones, collaborators, startDate, targetDate } = req.body;
        const project = await Milestone.findById(req.params.id);

        if (!project) return res.status(404).json({ message: 'Project not found' });
        if (project.staff.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to edit this project' });
        }

        project.projectName = projectName || project.projectName;
        project.projectType = projectType || project.projectType;
        project.milestones = milestones || project.milestones;
        project.collaborators = collaborators || project.collaborators;
        project.startDate = startDate || project.startDate;
        project.targetDate = targetDate || project.targetDate;

        // Auto calculate overall progress
        const completedMilestones = project.milestones.filter(m => m.status === 'Completed').length;
        project.overallProgress = Math.round((completedMilestones / project.milestones.length) * 100);

        await project.save();
        res.json(project);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get all milestones
// @route   GET /api/milestones/all
// @access  Private (Admin)
const getAllMilestones = async (req, res) => {
    try {
        const milestones = await Milestone.find().populate('staff', 'name department');
        res.json(milestones);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    getMyMilestones,
    createProject,
    updateProject,
    getAllMilestones
};
