const TaskEntry = require('../models/TaskEntry');
const User = require('../models/User');

// Helper to determine rating
const calculateRating = (submittedDays, totalWorkingDays) => {
    const percentage = (submittedDays / totalWorkingDays) * 100;
    if (percentage >= 90) return 'Excellent';
    if (percentage >= 70) return 'Good';
    if (percentage >= 50) return 'Average';
    return 'Poor';
};

// @desc    Get staff performance statistics
// @route   GET /api/analytics/staff-performance
const getStaffPerformance = async (req, res) => {
    try {
        const { month, year, dept } = req.query;
        const currentYear = year || new Date().getFullYear();
        const currentMonth = month || new Date().getMonth() + 1;

        const startDate = new Date(currentYear, currentMonth - 1, 1);
        const endDate = new Date(currentYear, currentMonth, 0); // Last day

        // Total working days (standardized as 26 or can be filtered by holidays/leaves later)
        const totalWorkingDays = 26;

        let staffQuery = { role: 'staff' };
        if (dept && dept !== 'All') staffQuery.department = dept;

        const staffList = await User.find(staffQuery);

        // Fetch all approved tasks for this month
        const tasks = await TaskEntry.find({
            date: { $gte: startDate, $lte: endDate },
            status: 'approved'
        });

        const performanceData = staffList.map(staff => {
            const staffTasks = tasks.filter(t => t.staff.toString() === staff._id.toString());
            
            const stats = {
                sciPapers: staffTasks.filter(t => t.journalType?.toUpperCase().includes('SCI')).length,
                scopusPapers: staffTasks.filter(t => t.journalType?.toUpperCase().includes('SCOPUS')).length,
                conferencePapers: staffTasks.filter(t => t.journalType?.toUpperCase().includes('CONFERENCE')).length,
                patentsFiled: staffTasks.filter(t => t.patentTitle && t.patentType?.toLowerCase() !== 'granted').length,
                patentsGranted: staffTasks.filter(t => t.patentTitle && t.patentType?.toLowerCase() === 'granted').length,
                projectsApplied: staffTasks.filter(t => t.projectName && (t.projectStatus?.toLowerCase() === 'applied' || t.projectStatus?.toLowerCase() === 'prepared')).length,
                fundedAmount: staffTasks.reduce((sum, t) => sum + (parseFloat(t.fundingAmount) || 0), 0),
                bookChapters: staffTasks.filter(t => t.bookTitle).length,
                totalActivities: staffTasks.length,
                submissionDays: new Set(staffTasks.map(t => new Date(t.date).toDateString())).size
            };

            return {
                _id: staff._id,
                name: staff.name,
                department: staff.department,
                designation: staff.designation || 'Research Scholar',
                ...stats,
                rating: calculateRating(stats.submissionDays, totalWorkingDays)
            };
        });

        // Calculate Summary (PART 2 - A)
        const summary = {
            totalStaff: staffList.length,
            totalPapers: tasks.filter(t => t.paperTitle).length,
            totalProjects: tasks.filter(t => t.projectName).length,
            totalPatents: tasks.filter(t => t.patentTitle).length,
            totalBooks: tasks.filter(t => t.bookTitle).length,
            topPerformer: performanceData.sort((a,b) => b.totalActivities - a.totalActivities)[0]?.name || 'N/A'
        };

        res.json({ summary, staffList: performanceData });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get department-wise performance breakdown
// @route   GET /api/analytics/department-performance
const getDepartmentPerformance = async (req, res) => {
    try {
        const { month, year } = req.query;
        const currentYear = year || new Date().getFullYear();
        const currentMonth = month || new Date().getMonth() + 1;

        const startDate = new Date(currentYear, currentMonth - 1, 1);
        const endDate = new Date(currentYear, currentMonth, 0);

        const allStaff = await User.find({ role: 'staff' });
        const tasks = await TaskEntry.find({
            date: { $gte: startDate, $lte: endDate },
            status: 'approved'
        });

        const departments = [...new Set(allStaff.map(s => s.department))];
        
        const deptPerformance = departments.map(dept => {
            const deptStaff = allStaff.filter(s => s.department === dept);
            const deptTasks = tasks.filter(t => deptStaff.some(s => s._id.toString() === t.staff.toString()));
            
            // Completion % logic
            const totalPotentialSubmissions = deptStaff.length * 26;
            const uniqueSubDays = new Set(deptTasks.map(t => `${t.staff}_${new Date(t.date).toDateString()}`)).size;
            const completionPercent = ((uniqueSubDays / totalPotentialSubmissions) * 100) || 0;

            return {
                department: dept,
                totalStaff: deptStaff.length,
                activeStaff: new Set(deptTasks.map(t => t.staff.toString())).size,
                papers: deptTasks.filter(t => t.paperTitle).length,
                patents: deptTasks.filter(t => t.patentTitle).length,
                projects: deptTasks.filter(t => t.projectName).length,
                books: deptTasks.filter(t => t.bookTitle).length,
                completionPercent: completionPercent.toFixed(1),
                avgRating: 'Good' // Placeholder for simplification
            };
        });

        res.json(deptPerformance);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get all chart data
// @route   GET /api/analytics/charts
const getChartsData = async (req, res) => {
    try {
        const { month, year } = req.query;
        const currentYear = parseInt(year) || new Date().getFullYear();
        const currentMonth = parseInt(month) || new Date().getMonth() + 1;

        const startDate = new Date(currentYear, currentMonth - 1, 1);
        const endDate = new Date(currentYear, currentMonth, 0);

        const tasks = await TaskEntry.find({
            date: { $gte: startDate, $lte: endDate },
            status: 'approved'
        }).populate('staff', 'name department');

        // Chart 1: Top 10 Staff Bar Chart
        const staffActivityMap = {};
        tasks.forEach(t => {
            const name = t.staff?.name || 'Unknown';
            staffActivityMap[name] = (staffActivityMap[name] || 0) + 1;
        });
        const top10Staff = Object.keys(staffActivityMap)
            .map(name => ({ name, value: staffActivityMap[name] }))
            .sort((a,b) => b.value - a.value)
            .slice(0, 10);

        // Chart 2: Activity Type Pie Chart
        const activityCounts = [
            { name: 'SCI', value: tasks.filter(t => t.journalType?.toUpperCase().includes('SCI')).length },
            { name: 'Scopus', value: tasks.filter(t => t.journalType?.toUpperCase().includes('SCOPUS')).length },
            { name: 'Conference', value: tasks.filter(t => t.journalType?.toUpperCase().includes('CONFERENCE')).length },
            { name: 'Patents', value: tasks.filter(t => t.patentTitle).length },
            { name: 'Projects', value: tasks.filter(t => t.projectName).length },
            { name: 'Books', value: tasks.filter(t => t.bookTitle).length }
        ].filter(item => item.value > 0);

        // Chart 3: Department Comparison
        const deptActivityMap = {};
        tasks.forEach(t => {
            const dept = t.staff?.department || 'General';
            deptActivityMap[dept] = (deptActivityMap[dept] || 0) + 1;
        });
        const deptComparison = Object.keys(deptActivityMap).map(name => ({ name, value: deptActivityMap[name] }));

        // Chart 4: Monthly Trend (Last 6 Months)
        const monthlyTrend = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date(currentYear, currentMonth - 1 - i, 1);
            const mon = d.toLocaleString('default', { month: 'short' });
            const s = new Date(d.getFullYear(), d.getMonth(), 1);
            const e = new Date(d.getFullYear(), d.getMonth() + 1, 0);
            
            const count = await TaskEntry.countDocuments({
                date: { $gte: s, $lte: e },
                status: 'approved'
            });
            monthlyTrend.push({ name: mon, value: count });
        }

        res.json({ top10Staff, activityCounts, deptComparison, monthlyTrend });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    getStaffPerformance,
    getDepartmentPerformance,
    getChartsData
};
