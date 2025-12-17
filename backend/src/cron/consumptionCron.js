const cron = require('node-cron');
const { deductPoints } = require('../services/pointsService');

const startConsumptionCron = () => {
    // Run every minute
    cron.schedule('* * * * *', () => {
        deductPoints();
    });
    console.log('Consumption cron job started.');
};

module.exports = { startConsumptionCron };
