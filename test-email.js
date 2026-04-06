require('dotenv').config();
const { sendBackupSuccessEmail } = require('./src/backup/emailNotifier');

const testEmail = async () => {
    console.log('--- Email Connection Test ---');
    console.log(`Sending from: ${process.env.SMTP_USER}`);
    console.log(`Sending to: ${process.env.ADMIN_EMAIL}`);
    console.log('-----------------------------');

    try {
        console.log('Attempting to send test email...');
        await sendBackupSuccessEmail('TEST-SNAPSHOT-123', 500, 10);
        console.log('✅ TEST EMAIL SENT SUCCESSFULLY!');
        console.log('Please check your inbox (and spam folder) for: selvakumarsurendar@gmail.com');
    } catch (error) {
        console.error('❌ EMAIL TEST FAILED!');
        console.error(error.message);
    }
    process.exit(0);
};

testEmail();
