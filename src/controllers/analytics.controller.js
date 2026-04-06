const User = require('../models/User');
const TaskEntry = require('../models/TaskEntry');
const DailyLog = require('../models/DailyLog');
const Goal = require('../models/Goal');

// @desc    Get overview analytics
// @route   GET /api/analytics/overview
// @access  Private (Admin)
const getOverview = async (req, res) => {
    try {
        // Fetch all Tasks to reflect real contributions (pending + approved) as requested
        const allTasks = await TaskEntry.find({ status: { $in: ['approved', 'pending'] } });

        const stats = {
            sciPapersAccepted: 0,
            sciPapersPublished: 0,
            scopusPapersAccepted: 0,
            scopusPapersPublished: 0,
            patentPublished: 0,
            patentGrant: 0,
            conferencePapersAccepted: 0,
            conferencePapersPublished: 0,
            bookChaptersAccepted: 0,
            bookChaptersPublished: 0,
            fundingApplied: 0,
            fundingReceived: 0,
            // Backwards compatibility
            totalPapers: 0,
            totalSCI: 0,
            totalPatents: 0,
            totalFunded: 0
        };

        allTasks.forEach(task => {
            const paperStatus = (task.paperStatus || '').toLowerCase();
            const journalType = (task.journalType || '').toUpperCase();
            const projectStatus = (task.projectStatus || '').toLowerCase();
            const patentType = (task.patentType || '').toLowerCase();
            const bookStatus = (task.bookStatus || '').toLowerCase();

            // Sections Analysis
            if (task.paperTitle && task.paperTitle.trim() !== '') {
                stats.totalPapers++;
                if (journalType.includes('SCI')) {
                    stats.totalSCI++;
                    if (paperStatus === 'published') stats.sciPapersPublished++;
                    else if (paperStatus === 'accepted') stats.sciPapersAccepted++;
                } else if (journalType.includes('SCOPUS')) {
                    if (paperStatus === 'published') stats.scopusPapersPublished++;
                    else if (paperStatus === 'accepted') stats.scopusPapersAccepted++;
                } else if (journalType.includes('CONFERENCE')) {
                    if (paperStatus === 'published') stats.conferencePapersPublished++;
                    else if (paperStatus === 'accepted') stats.conferencePapersAccepted++;
                }
            }

            if (task.patentTitle && task.patentTitle.trim() !== '') {
                stats.totalPatents++;
                if (patentType === 'published') stats.patentPublished++;
                else if (patentType === 'granted') stats.patentGrant++;
            }

            if (task.bookTitle && task.bookTitle.trim() !== '') {
                if (bookStatus === 'published') stats.bookChaptersPublished++;
                else if (bookStatus === 'accepted' || bookStatus === 'completed') stats.bookChaptersAccepted++;
            }

            if (task.projectName && task.projectName.trim() !== '') {
                stats.totalFunded++;
                if (projectStatus === 'submitted' || projectStatus === 'applied') stats.fundingApplied++;
                else if (projectStatus === 'approved' || projectStatus === 'completed' || projectStatus === 'granted' || projectStatus === 'received') stats.fundingReceived++;
            }
        });

        res.json(stats);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get department-wise analytics
// @route   GET /api/analytics/by-department
// @access  Private (Admin)
const getByDepartment = async (req, res) => {
    try {
        const allTasks = await TaskEntry.find({ status: { $in: ['approved', 'pending'] } }).populate('staff');
        const deptStats = {};

        allTasks.forEach(task => {
            if (!task.staff) return;
            const dept = task.staff.department || 'General';
            if (!deptStats[dept]) {
                deptStats[dept] = { papers: 0, patents: 0, funded: 0 };
            }

            if (task.paperTitle && task.paperTitle.trim() !== '') deptStats[dept].papers++;
            if (task.patentTitle && task.patentTitle.trim() !== '') deptStats[dept].patents++;
            if (task.projectName && task.projectName.trim() !== '') deptStats[dept].funded++;
        });

        const result = Object.keys(deptStats).map(dept => ({
            department: dept,
            ...deptStats[dept]
        }));

        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get monthly activity trend
// @route   GET /api/analytics/monthly-trend
// @access  Private (Admin)
const getMonthlyTrend = async (req, res) => {
    try {
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const now = new Date();
        const startOfPastYear = new Date(now.getFullYear(), now.getMonth() - 11, 1);

        const allTasks = await TaskEntry.find({ 
            status: { $in: ['approved', 'pending'] },
            date: { $gte: startOfPastYear }
        });

        const monthlyData = [];
        for (let i = 0; i < 12; i++) {
            const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
            monthlyData.push({
                month: months[d.getMonth()],
                year: d.getFullYear(),
                count: 0
            });
        }

        allTasks.forEach(task => {
            const taskDate = new Date(task.date);
            const m = months[taskDate.getMonth()];
            const y = taskDate.getFullYear();
            const dataIndex = monthlyData.findIndex(item => item.month === m && item.year === y);
            if (dataIndex !== -1) {
                monthlyData[dataIndex].count++;
            }
        });

        res.json(monthlyData);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get top performers
// @route   GET /api/analytics/top-performers
// @access  Private (Admin)
const getTopPerformers = async (req, res) => {
    try {
        const topPerformers = await User.find({ role: 'staff' })
            .sort({ totalScore: -1 })
            .limit(10)
            .select('name department totalScore badges');

        res.json(topPerformers);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get weekly analytics
// @route   GET /api/analytics/weekly
// @access  Private (Admin)
const getWeeklyAnalytics = async (req, res) => {
    try {
        const now = new Date();
        const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1)));
        startOfWeek.setHours(0, 0, 0, 0);

        const tasks = await TaskEntry.find({
            status: { $in: ['approved', 'pending'] },
            date: { $gte: startOfWeek }
        });

        const stats = {
            papers: tasks.filter(t => !!t.paperTitle).length,
            patents: tasks.filter(t => !!t.patentTitle).length,
            funded: tasks.filter(t => !!t.projectName).length,
            activities: tasks.filter(t => !!t.activityTitle).length
        };

        res.json(stats);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get monthly analytics
// @route   GET /api/analytics/monthly
// @access  Private (Admin)
const getMonthlyAnalytics = async (req, res) => {
    try {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const tasks = await TaskEntry.find({
            status: { $in: ['approved', 'pending'] },
            date: { $gte: startOfMonth }
        });

        const stats = {
            papers: tasks.filter(t => !!t.paperTitle).length,
            patents: tasks.filter(t => !!t.patentTitle).length,
            funded: tasks.filter(t => !!t.projectName).length,
            activities: tasks.filter(t => !!t.activityTitle).length
        };

        res.json(stats);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    getOverview,
    getByDepartment,
    getMonthlyTrend,
    getTopPerformers,
    getWeeklyAnalytics,
    getMonthlyAnalytics
};
