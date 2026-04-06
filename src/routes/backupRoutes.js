const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { protect, isAdmin } = require('../middleware/auth');
const logger = require('../backup/logger');
const { runBackup, BackupSnapshot, HealthLog, mainDb, backupDb } = require('../backup/backupEngine');
const { requestRestoreToken, restoreFromBackup } = require('../backup/restoreEngine');

// --- Rate Limiting for sensitive operations ---
const manualBackupLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5,
    message: { message: 'Too many manual backup requests. Please wait an hour.' }
});

const restoreLimiter = rateLimit({
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
    max: 3,
    message: { message: 'Daily limit for system restore exceeded. Contact administrator.' }
});

// Protect all backup routes
router.use(protect, isAdmin);

/**
 * GET current backup & system status
 */
router.get('/backup/status', async (req, res) => {
    try {
        const lastSnapshot = await BackupSnapshot.findOne({ status: 'success' }).sort({ createdAt: -1 });
        const lastHealth = await HealthLog.findOne().sort({ checkedAt: -1 });
        const totalSnapshots = await BackupSnapshot.countDocuments();
        
        res.json({
            lastSnapshot,
            lastHealth,
            totalSnapshots,
            dbConnected: mainDb.readyState === 1,
            backupDbConnected: backupDb.readyState === 1
        });
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
});

/**
 * GET backup history (Paginated)
 */
router.get('/backup/history', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const history = await BackupSnapshot.find()
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await BackupSnapshot.countDocuments();

        res.json({
            history,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            total
        });
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
});

/**
 * POST trigger manual backup
 */
router.post('/backup/trigger', manualBackupLimiter, async (req, res) => {
    try {
        logger.info(`Manual backup triggered by user: ${req.user._id}`);
        // Run in background
        setImmediate(() => {
            runBackup('manual', req.user._id).catch(err => logger.error(`Manual backup failed background: ${err.message}`));
        });
        
        res.json({ success: true, message: 'Backup snapshot sequence initiated in background.' });
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
});

/**
 * GET Verify data integrity (Sync check)
 */
router.get('/backup/verify', async (req, res) => {
    try {
        const collections = ['users', 'taskentries', 'dailylogs', 'pdflogs'];
        const results = [];

        for (const coll of collections) {
            const prodCount = await mainDb.collection(coll).countDocuments();
            const backupCount = await backupDb.collection(`backup_${coll}`).countDocuments();
            results.push({
                collection: coll,
                prodCount,
                backupCount,
                inSync: prodCount === backupCount
            });
        }

        res.json(results);
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
});

/**
 * POST Request Restore Confirmation Code
 */
router.post('/backup/restore/request', restoreLimiter, async (req, res) => {
    try {
        await requestRestoreToken(req.user._id, req.user.email);
        res.json({ success: true, message: 'Restore confirmation code sent to your admin email.' });
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
});

/**
 * POST Confirm System Restore
 */
router.post('/backup/restore/confirm', restoreLimiter, async (req, res) => {
    try {
        const { confirmationToken } = req.body;
        if (!confirmationToken) return res.status(400).json({ message: 'Token is required' });

        const results = await restoreFromBackup(req.user._id, req.user.email, confirmationToken);
        res.json(results);
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
});

/**
 * GET Last 20 health checks
 */
router.get('/backup/health', async (req, res) => {
    try {
        const logs = await HealthLog.find().sort({ checkedAt: -1 }).limit(20);
        res.json(logs);
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
});

module.exports = router;
