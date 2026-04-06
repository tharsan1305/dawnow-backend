const express = require('express');
const router = express.Router();
const logger = require('./logger');
const { BackupTaskEntry, BackupDailyLog, BackupPdf } = require('./backupEngine');

/**
 * RESTRICTED: Fallback Mode Routes
 * Allows the frontend to remain functional (read-only) even if the primary Atlas DB is down.
 */

router.get('/fallback/reports', async (req, res) => {
    try {
        const data = await BackupTaskEntry.find({}).sort({ date: -1 }).limit(100);
        res.json({ success: true, data, mode: 'fallback' });
    } catch (e) {
        logger.error(`Fallback failed on tasks: ${e.message}`);
        res.status(500).json({ success: false, message: 'Fallback database unavailable.' });
    }
});

router.get('/fallback/dailylogs', async (req, res) => {
    try {
        const data = await BackupDailyLog.find({}).sort({ date: -1 }).limit(100);
        res.json({ success: true, data, mode: 'fallback' });
    } catch (e) {
        logger.error(`Fallback failed on dailylogs: ${e.message}`);
        res.status(500).json({ success: false, message: 'Fallback database unavailable.' });
    }
});

router.get('/fallback/pdf/:filename', async (req, res) => {
    try {
        const pdf = await BackupPdf.findOne({ filename: req.params.filename });
        if (!pdf) return res.status(404).send('PDF not found in backup.');

        const buffer = Buffer.from(pdf.base64Data, 'base64');
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename=${pdf.filename}`);
        res.send(buffer);
    } catch (e) {
        logger.error(`Fallback failed on PDF: ${e.message}`);
        res.status(500).send('Emergency PDF service error.');
    }
});

module.exports = router;
