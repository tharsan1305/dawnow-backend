const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const logger = require('./logger');
const { runBackup, mainDb, backupDb, BackupUser, BackupTaskEntry, BackupDailyLog, BackupPdLog } = require('./backupEngine');
const RestoreTokenSchema = require('../models/backup/RestoreToken');
const { sendRestoreTokenEmail, sendRestoreSuccessEmail } = require('./emailNotifier');

// RestoreToken Model on backupDb
const RestoreToken = backupDb.model('RestoreToken', RestoreTokenSchema, 'restore_tokens');

/**
 * Generate a 6-digit confirmation token for restore
 */
const requestRestoreToken = async (adminId, adminEmail) => {
    try {
        // Clear old tokens for this admin
        await RestoreToken.deleteMany({ adminId });
        
        const token = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + (parseInt(process.env.RESTORE_TOKEN_EXPIRY_MINUTES) || 10) * 60000);
        
        await RestoreToken.create({
            adminId,
            token,
            expiresAt
        });

        await sendRestoreTokenEmail(adminEmail, token);
        logger.info(`Restore token generated and emailed to admin ${adminId}`);
        return true;
    } catch (e) {
        logger.error(`Error requesting restore token: ${e.message}`);
        throw e;
    }
};

/**
 * Perform a full system restore from backupDb to mainDb
 */
const restoreFromBackup = async (adminId, adminEmail, confirmationToken) => {
    try {
        // 1. Verify token
        const tokenRecord = await RestoreToken.findOne({
            adminId,
            token: confirmationToken,
            used: false,
            expiresAt: { $gt: new Date() }
        });

        if (!tokenRecord) {
            throw new Error('Invalid or expired confirmation token');
        }

        // Mark as used immediately to prevent replay
        tokenRecord.used = true;
        await tokenRecord.save();

        logger.warn(`System RESTORE initiated by admin ${adminId}`);

        // 2. Safety Snapshot BEFORE restore
        await runBackup('pre-restore', adminId);

        // 3. Restore Metadata Collections
        const restoreResults = {};
        
        restoreResults.users = await syncRestore('users', BackupUser);
        restoreResults.taskentries = await syncRestore('taskentries', BackupTaskEntry);
        restoreResults.dailylogs = await syncRestore('dailylogs', BackupDailyLog);
        // restoreResults.pdflogs = await syncRestore('pdflogs', BackupPdfLog);

        // 4. Restore PDF Files
        const pdfsRestored = await restorePdfFiles();

        logger.info(`System restore completed successfully for all collections.`);
        await sendRestoreSuccessEmail(adminEmail, restoreResults, pdfsRestored);
        
        return { success: true, results: restoreResults, pdfs: pdfsRestored };
    } catch (e) {
        logger.error(`CRITICAL: Restore failed - ${e.message}`);
        throw e;
    }
};

/**
 * Generic function to restore a collection from backupDb to mainDb
 */
async function syncRestore(collectionName, SourceModel) {
    try {
        const data = await SourceModel.find({}).lean();
        if (data.length === 0) return { count: 0, status: 'empty' };

        const targetCollection = mainDb.collection(collectionName);
        
        // Remove ALL current production data
        await targetCollection.deleteMany({});
        
        // Insert backup data
        await targetCollection.insertMany(data);
        
        return { count: data.length, status: 'restored' };
    } catch (e) {
        logger.error(`Failed to restore ${collectionName}: ${e.message}`);
        return { count: 0, status: 'failed', error: e.message };
    }
}

/**
 * Restore PDF files from backupAtlas to local FS
 */
async function restorePdfFiles() {
    try {
        const BackupPdfModel = backupDb.model('BackupPdf');
        const pdfs = await BackupPdfModel.find({}).lean();
        
        const uploadDir = path.join(__dirname, '../../uploads/pdfs');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        let count = 0;
        for (const pdf of pdfs) {
            const buffer = Buffer.from(pdf.base64Data, 'base64');
            fs.writeFileSync(path.join(uploadDir, pdf.filename), buffer);
            count++;
        }
        
        return count;
    } catch (e) {
        logger.error(`Error restoring PDF files: ${e.message}`);
        return 0;
    }
}

module.exports = {
    requestRestoreToken,
    restoreFromBackup
};
