const cron = require('node-cron');
const { deductPoints } = require('../services/pointsService');
const log = require('../services/logger.service');

const startConsumptionCron = () => {
    // Run every minute
    cron.schedule('* * * * *', () => {
        deductPoints();
    });
    log.cron('Consumption cron job started');
};

module.exports = { startConsumptionCron };

