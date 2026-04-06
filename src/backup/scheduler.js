const cron = require('node-cron');
const { runBackup } = require('./backupEngine');
const logger = require('./logger');

const initMonthlyBackup = () => {
    // Run at 00:00 on day-of-month 1
    cron.schedule('0 0 1 * *', async () => {
        logger.info('Running monthly automated backup and email report...');
        try {
            await runBackup('monthly-cron', null);
            logger.info('Monthly backup completed successfully.');
        } catch (error) {
            logger.error(`Monthly backup failed: ${error.message}`);
        }
    });
    
    logger.info('Monthly backup scheduler initialized.');
};

module.exports = { initMonthlyBackup };
