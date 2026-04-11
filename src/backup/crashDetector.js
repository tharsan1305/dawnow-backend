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
    
    // record start time for grace period
    const startTime = Date.now();
    const GRACE_PERIOD = 3 * 60 * 1000; // 3 minutes

    setInterval(async () => {
        // Skip check during grace period after startup
        if (Date.now() - startTime < GRACE_PERIOD) return;

        const health = {
            status: 'healthy',
            // States: 0: disconnected, 1: connected, 2: connecting, 3: disconnecting
            dbConnected: mainDb.readyState === 1 || mainDb.readyState === 2,
            backupDbConnected: backupDb.readyState === 1 || backupDb.readyState === 2,
            uploadsOk: fs.existsSync(path.join(__dirname, '../../uploads/pdfs')),
            checkedAt: new Date()
        };

        try {
            // CHECK 1: Main DB Connection
            // ONLY trigger pre-crash backup if state is truly 0 (disconnected) or 3 (disconnecting)
            if (mainDb.readyState === 0 || mainDb.readyState === 3) {
                logger.warn('Main DB disconnected! Attempting emergency backup...');
                health.status = 'crashed';
                health.recoveryAction = 'Emergency Backup Triggered';
                
                try {
                    // Only backup if backup Atlas is still reachable
                    if (backupDb.readyState === 1) {
                        await runBackup('pre-crash');
                        await sendCrashEmail();
                    } else {
                        logger.error('Critical: Both production and backup DBs are unreachable. Skipping pre-crash backup.');
                    }
                } catch (backupError) {
                    logger.error(`Critical: Pre-crash backup failed - ${backupError.message}`);
                }
            }

            // CHECK 2: Backup DB Connection (Recovery attempt)
            if (backupDb.readyState === 0 || backupDb.readyState === 3) {
                logger.warn('Backup Atlas DB disconnected! Health degraded.');
                health.status = health.status === 'crashed' ? 'crashed' : 'degraded';
            }

            // Save health log to backupAtlas every 60s
            if (backupDb.readyState === 1) {
                await HealthLog.create(health);
            }

            if (health.status !== 'healthy') {
                logger.info(`Health check: ${health.status} | DB State: ${mainDb.readyState} | Backup State: ${backupDb.readyState}`);
            }

        } catch (e) {
            logger.error(`Error in health monitor: ${e.message}`);
        }
    }, 60000);
};

module.exports = { startCrashDetector };
