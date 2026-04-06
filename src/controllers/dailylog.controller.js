const DailyLog = require('../models/DailyLog');
const Leave = require('../models/Leave');
const { runBackup } = require('../backup/backupEngine');

// @desc    Create or update daily log
// @route   POST /api/dailylog
// @access  Private (Staff)
const createOrUpdateLog = async (req, res) => {
    try {
        const { date, workDone, hoursSpent, category, projectName, progressPercent, tomorrowPlan, mood, isLeaveDay } = req.body;
        const staffId = req.user._id;

        const logDate = new Date(date);
        logDate.setHours(0, 0, 0, 0);

        let log = await DailyLog.findOne({ staff: staffId, date: logDate });

        if (log) {
            log.workDone = workDone;
            log.hoursSpent = hoursSpent;
            log.category = category;
            log.projectName = projectName;
            log.progressPercent = progressPercent;
            log.tomorrowPlan = tomorrowPlan;
            log.mood = mood;
            log.isLeaveDay = isLeaveDay;
            await log.save();

            // Trigger real-time backup (Non-blocking)
            setImmediate(() => {
                runBackup('report-submit', req.user._id)
                    .catch(err => console.error('[BACKUP ERROR]', err.message));
            });

            return res.json(log);
        }

        log = await DailyLog.create({
            staff: staffId,
            date: logDate,
            workDone,
            hoursSpent,
            category,
            projectName,
            progressPercent,
            tomorrowPlan,
            mood,
            isLeaveDay
        });

        res.status(201).json(log);

        // Trigger real-time backup (Non-blocking)
        setImmediate(() => {
            runBackup('report-submit', req.user._id)
                .catch(err => console.error('[BACKUP ERROR]', err.message));
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get logs for current user
// @route   GET /api/dailylog
// @access  Private (Staff)
const getMyLogs = async (req, res) => {
    try {
        const { from, to } = req.query;
        const query = { staff: req.user._id };

        if (from || to) {
            query.date = {};
            if (from) query.date.$gte = new Date(from);
            if (to) query.date.$lte = new Date(to);
        }

        const logs = await DailyLog.find(query).sort({ date: -1 });
        res.json(logs);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get today's log
// @route   GET /api/dailylog/today
// @access  Private (Staff)
const getTodayLog = async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const log = await DailyLog.findOne({ staff: req.user._id, date: today });
        res.json(log);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get daily streak
// @route   GET /api/dailylog/streak
// @access  Private (Staff)
const getStreak = async (req, res) => {
    try {
        const logs = await DailyLog.find({ 
            staff: req.user._id, 
            isLeaveDay: false,
            workDone: { $ne: '' } 
        }).sort({ date: -1 });

        let streak = 0;
        let currentDate = new Date();
        currentDate.setHours(0, 0, 0, 0);

        for (const log of logs) {
            const logDate = new Date(log.date);
            logDate.setHours(0, 0, 0, 0);

            // Skip weekends
            if (currentDate.getDay() === 0) currentDate.setDate(currentDate.getDate() - 1);
            if (currentDate.getDay() === 6) currentDate.setDate(currentDate.getDate() - 1);

            if (logDate.getTime() === currentDate.getTime()) {
                streak++;
                currentDate.setDate(currentDate.getDate() - 1);
            } else if (logDate.getTime() < currentDate.getTime()) {
                break;
            }
        }

        res.json({ streak });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    createOrUpdateLog,
    getMyLogs,
    getTodayLog,
    getStreak
};
