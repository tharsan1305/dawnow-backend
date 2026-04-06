const nodemailer = require('nodemailer');
const logger = require('./logger');

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT, // 465
    secure: process.env.SMTP_PORT == 465, // true for 465, false for others
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

const sendEmail = async (options) => {
    try {
        const info = await transporter.sendMail({
            from: `"DAW NOW CFRD Backup" <${process.env.SMTP_USER}>`,
            to: process.env.ADMIN_EMAIL,
            ...options,
        });
        logger.info(`Email sent: ${info.messageId}`);
    } catch (error) {
        logger.error(`Error sending email: ${error.message}`);
    }
};

const sendBackupSuccessEmail = async (snapshotId, totalDocs, pdfCount) => {
    if (process.env.BACKUP_EMAIL_ON_SUCCESS !== 'true') return;
    await sendEmail({
        subject: `✅ Backup Complete — ${totalDocs} records — CFRD DAW NOW`,
        html: `<h3>Backup Successful</h3>
               <p>Snapshot ID: ${snapshotId}</p>
               <p>Total Documents: ${totalDocs}</p>
               <p>PDFs Backed up: ${pdfCount}</p>
               <p>Time: ${new Date().toLocaleString()}</p>`
    });
};

const sendBackupFailureEmail = async (snapshotId, errorMessage) => {
    if (process.env.BACKUP_EMAIL_ON_FAILURE !== 'true') return;
    await sendEmail({
        subject: `❌ BACKUP FAILED — CFRD DAW NOW — Action Required`,
        html: `<h3>Backup Failed</h3>
               <p>Snapshot ID: ${snapshotId}</p>
               <p>Error Message: ${errorMessage}</p>
               <p>Time: ${new Date().toLocaleString()}</p>
               <p><strong>Please check the system logs immediately.</strong></p>`
    });
};

const sendCrashEmail = async () => {
    await sendEmail({
        subject: `⚠️ SYSTEM CRASH — CFRD DAW NOW Emergency Backup Created`,
        html: `<h3>System Health Warning</h3>
               <p>The main database connection was lost. An emergency backup has been attempted.</p>
               <p>Please investigate the production environment immediately.</p>
               <p>Status: Pre-crash Backup Initiated</p>
               <p>Time: ${new Date().toLocaleString()}</p>`
    });
};

const sendRestoreTokenEmail = async (adminEmail, token) => {
    await sendEmail({
        to: adminEmail,
        subject: `🔐 CFRD DAW NOW — Restore Confirmation Code: ${token}`,
        html: `<h3>Restore Confirmation</h3>
               <p>Your system restore confirmation code is:</p>
               <h1 style="font-size: 32px; letter-spacing: 5px; color: #DC2626;">${token}</h1>
               <p>This code will expire in 10 minutes.</p>
               <p>If you did not request this, please contact technical support.</p>`
    });
};

const sendRestoreSuccessEmail = async (adminEmail, results, pdfsRestored) => {
    await sendEmail({
        to: adminEmail,
        subject: `♻️ CFRD DAW NOW — System Fully Restored`,
        html: `<h3>System Restore Successful</h3>
               <p>The core database collections and media files have been restored from the backup.</p>
               <p>Records Restored: ${JSON.stringify(results)}</p>
               <p>PDFs Restored: ${pdfsRestored}</p>
               <p>Status: Fully Operational</p>
               <p>Time: ${new Date().toLocaleString()}</p>`
    });
};

module.exports = {
    sendBackupSuccessEmail,
    sendBackupFailureEmail,
    sendCrashEmail,
    sendRestoreTokenEmail,
    sendRestoreSuccessEmail
};
