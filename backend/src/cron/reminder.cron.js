const cron = require('node-cron');
const log = require('../services/logger.service');
const { prisma } = require('../db');
const emailService = require('../services/email.service');

// Schedule: 10:00 AM every day
const initDailyReminder = () => {
    log.cron('Initializing Daily Reminder Cron Job (10:00 AM Europe/Paris)');

    cron.schedule('0 10 * * *', async () => {
        log.cron('Running Daily Spin Reminder...');
        try {
            // Logic: Find users who spun "yesterday" (active users) but haven't spun "today"
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);

            // 1. Get users who spun yesterday (to target active users only)
            const activeUsersSpins = await prisma.dailySpin.findMany({
                where: {
                    spinDate: {
                        gte: yesterday,
                        lt: today
                    }
                },
                include: {
                    user: true
                }
            });

            // unique users from yesterday
            const activeUserIds = [...new Set(activeUsersSpins.map(s => s.userId))];

            log.cron(`Found ${activeUserIds.length} active users from yesterday.`);

            for (const userId of activeUserIds) {
                // 2. Check if they already spun *today*
                const spunToday = await prisma.dailySpin.findFirst({
                    where: {
                        userId,
                        spinDate: { gte: today }
                    }
                });

                if (!spunToday) {
                    // 3. User is active but hasn't spun today -> Send Email
                    const user = await prisma.user.findUnique({ where: { id: userId } });

                    if (user && user.email) {
                        log.cron(`Sending reminder to ${user.email}`);
                        await emailService.sendEmail(
                            user.email,
                            "🎁 Votre tour quotidien vous attend !",
                            `<div style="font-family: sans-serif; color: #333;">
                                <h2>La Roue tourne ! 🎡</h2>
                                <p>Bonjour ${user.name || 'Champion'},</p>
                                <p>Vous n'avez pas encore récupéré vos points gratuits aujourd'hui.</p>
                                <p>Revenez vite pour tenter de gagner jusqu'à <strong>200 points</strong> !</p>
                                <br/>
                                <a href="https://smp4.xyz" style="background: #eab308; color: black; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Tourner la Roue</a>
                            </div>`
                        );
                    }
                }
            }

        } catch (error) {
            log.error('[Cron] Error running daily reminder:', error);
        }
    }, {
        timezone: "Europe/Paris"
    });
};

module.exports = { initDailyReminder };
