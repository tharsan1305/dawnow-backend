const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const logger = require('./logger');
const { sendBackupSuccessEmail, sendBackupFailureEmail } = require('./emailNotifier');

// Connections
const dbOptions = {
    family: 4,
    serverSelectionTimeoutMS: 10000,
    heartbeatFrequencyMS: 10000,
};

const mainDb = mongoose.createConnection(process.env.MONGODB_URI, dbOptions);
const backupDb = mongoose.createConnection(process.env.MONGODB_BACKUP_URI, dbOptions);

// Backup System Schemas
const BackupSnapshotSchema = require('../models/backup/BackupSnapshot');
const BackupPdfSchema = require('../models/backup/BackupPdf');
const SystemHealthLogSchema = require('../models/backup/SystemHealthLog');

// Pre-define Schemas for production collections (flexible for backup)
const GenericSchema = new mongoose.Schema({}, { strict: false });

// Backup Models binding to backupDb
const BackupSnapshot = backupDb.model('BackupSnapshot', BackupSnapshotSchema, 'backup_snapshots');
const BackupPdf = backupDb.model('BackupPdf', BackupPdfSchema, 'backup_pdfs');
const HealthLog = backupDb.model('SystemHealthLog', SystemHealthLogSchema, 'system_health_logs');

// Individual Collection Backup Models (mapping mainDb collections to backupDb)
const BackupUser = backupDb.model('BackupUser', GenericSchema, 'backup_users');
const BackupTaskEntry = backupDb.model('BackupTaskEntry', GenericSchema, 'backup_taskentries');
const BackupDailyLog = backupDb.model('BackupDailyLog', GenericSchema, 'backup_dailylogs');
const BackupPdfLog = backupDb.model('BackupPdfLog', GenericSchema, 'backup_pdflogs');

/**
 * Perform a full backup of all collections and files
 */
const runBackup = async (trigger, triggeredBy = null) => {
    const snapshotId = uuidv4();
    logger.info(`Initiating backup sequence: ${snapshotId} [Trigger: ${trigger}]`);

    let snapshot;
    try {
        snapshot = await BackupSnapshot.create({
            snapshotId,
            trigger,
            triggeredBy,
            status: 'in-progress'
        });
    } catch (e) {
        logger.error(`Critical: Failed to create snapshot log - ${e.message}`);
        return;
    }

    try {
        const backupTasks = [
            backupCollection('User', 'users', BackupUser),
            backupCollection('TaskEntry', 'taskentries', BackupTaskEntry),
            backupCollection('DailyLog', 'dailylogs', BackupDailyLog),
            backupCollection('PdfLog', 'pdflogs', BackupPdfLog),
            backupPdfFiles(snapshotId)
        ];

        const [users, tasks, logs, pdfLogs, pdfFiles] = await Promise.all(backupTasks);

        snapshot.collections = {
            users: { count: users.count, success: true },
            taskentries: { count: tasks.count, success: true },
            dailylogs: { count: logs.count, success: true },
            pdflogs: { count: pdfLogs.count, success: true },
            pdfs: { count: pdfFiles.count, success: true }
        };

        snapshot.totalDocuments = 
            users.count + tasks.count + logs.count + pdfLogs.count;
        snapshot.status = 'success';
        await snapshot.save();

        logger.info(`Snapshot ${snapshotId} completed successfully. Total docs: ${snapshot.totalDocuments}`);
        await sendBackupSuccessEmail(snapshotId, snapshot.totalDocuments, pdfFiles.count);
        
        return snapshot;
    } catch (error) {
        snapshot.status = 'failed';
        snapshot.errorMessage = error.message;
        await snapshot.save();
        
        logger.error(`Snapshot ${snapshotId} failed: ${error.message}`);
        await sendBackupFailureEmail(snapshotId, error.message);
        throw error;
    }
};

/**
 * Generic function to backup a collection from mainDb to backupDb
 */
async function backupCollection(modelName, collectionName, TargetModel) {
    try {
        // Access raw collection on mainDb to avoid loading Mongoose models
        const sourceCollection = mainDb.collection(collectionName);
        const data = await sourceCollection.find({}).toArray();
        
        // Replace in backup
        await TargetModel.deleteMany({});
        if (data.length > 0) {
            await TargetModel.insertMany(data);
        }
        
        return { count: data.length, success: true };
    } catch (e) {
        logger.error(`Error backing up collection ${collectionName}: ${e.message}`);
        return { count: 0, success: false };
    }
}

/**
 * Backup PDF files from local storage to backup Atlas DB as Base64
 */
async function backupPdfFiles(snapshotId) {
    try {
        const uploadDir = path.join(__dirname, '../../uploads/pdfs');
        if (!fs.existsSync(uploadDir)) {
            return { count: 0, success: true };
        }

        const files = fs.readdirSync(uploadDir).filter(f => f.endsWith('.pdf'));
        let count = 0;

        // Clear old PDF backups for fresh sync? 
        // Rule: Drop and replace strategy
        await BackupPdf.deleteMany({});

        for (const file of files) {
            const filePath = path.join(uploadDir, file);
            const stats = fs.statSync(filePath);
            const base64Data = fs.readFileSync(filePath, { encoding: 'base64' });

            await BackupPdf.create({
                filename: file,
                sizeBytes: stats.size,
                base64Data,
                snapshotId,
                uploadedAt: stats.mtime
            });
            count++;
        }

        return { count, success: true };
    } catch (e) {
        logger.error(`Error backing up PDF files: ${e.message}`);
        return { count: 0, success: false };
    }
}

module.exports = {
    mainDb,
    backupDb,
    BackupSnapshot,
    BackupPdf,
    HealthLog,
    BackupUser,
    BackupTaskEntry,
    BackupDailyLog,
    runBackup
};
