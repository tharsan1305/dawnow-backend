const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const logger = require('./logger');
const { runBackup, mainDb, backupDb, HealthLog } = require('./backupEngine');
const { sendCrashEmail } = require('./emailNotifier');

/**
 * Periodically checks system health (Every 60 seconds)
 */
const startCrashDetector = () => {
    logger.info('System health monitor (Crash Detector) started.');
    
    setInterval(async () => {
        const health = {
            status: 'healthy',
            dbConnected: mainDb.readyState === 1,
            backupDbConnected: backupDb.readyState === 1,
            uploadsOk: fs.existsSync(path.join(__dirname, '../../uploads/pdfs')),
            checkedAt: new Date()
        };

        try {
            // CHECK 1: Main DB Connection
            if (!health.dbConnected) {
                logger.warn('Main DB disconnected! Attempting emergency backup...');
                health.status = 'crashed';
                health.recoveryAction = 'Emergency Backup Triggered';
                
                try {
                    await runBackup('pre-crash');
                    await sendCrashEmail();
                } catch (backupError) {
                    logger.error(`Critical: Pre-crash backup failed - ${backupError.message}`);
                }
            }

            // CHECK 2: Backup DB Connection (Recovery attempt)
            if (!health.backupDbConnected) {
                logger.warn('Backup Atlas DB disconnected! Attempting reconnect...');
                health.status = health.status === 'crashed' ? 'crashed' : 'degraded';
            }

            // Save health log to backupAtlas every 60s
            if (backupDb.readyState === 1) {
                await HealthLog.create(health);
            }

            if (health.status !== 'healthy') {
                logger.info(`Health check: ${health.status} | DB: ${health.dbConnected} | Backup: ${health.backupDbConnected}`);
            }

        } catch (e) {
            logger.error(`Error in health monitor: ${e.message}`);
        }
    }, 60000);
};

module.exports = { startCrashDetector };
