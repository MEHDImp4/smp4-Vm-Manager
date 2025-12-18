const cron = require('node-cron');
const { deductPoints } = require('../services/pointsService');

const log = (...args) => {
    if (process.env.NODE_ENV !== 'production') {
        console.log(...args);
    }
};

const startConsumptionCron = () => {
    // Run every minute
    cron.schedule('* * * * *', () => {
        deductPoints();
    });
    log('Consumption cron job started.');
};

module.exports = { startConsumptionCron };
