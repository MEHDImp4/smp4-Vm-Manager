const cron = require('node-cron');
const { prisma } = require('../db');
const proxmoxService = require('../services/proxmox.service');
const emailService = require('../services/email.service');

const initIdleCheckCron = () => {
    // Schedule: Every day at 9:00 AM (0 9 * * *)
    cron.schedule('0 9 * * *', async () => {
        console.log('[Cron] Starting Idle VM Check (09:00)...');

        try {
            // Fetch all active instances associated with a user
            const instances = await prisma.instance.findMany({
                where: {
                    vmid: { not: null }
                },
                include: {
                    user: true
                }
            });

            console.log(`[Cron] Checking ${instances.length} instances for high uptime...`);

            const UPTIME_THRESHOLD_SECONDS = 72 * 60 * 60; // 72 hours
            const SPAM_PREVENTION_DAYS = 7; // Don't annoy user more than once a week per VM

            for (const instance of instances) {
                try {
                    // Skip if user has no email
                    if (!instance.user.email) continue;

                    // Get status from Proxmox
                    const statusData = await proxmoxService.getLXCStatus(instance.vmid);

                    // Check if running and uptime > 72h
                    if (statusData.status === 'running' && statusData.uptime > UPTIME_THRESHOLD_SECONDS) {

                        // Check if we already sent a notification recently
                        const lastNotif = instance.lastIdleNotification;
                        if (lastNotif) {
                            const daysSinceLast = (new Date() - new Date(lastNotif)) / (1000 * 60 * 60 * 24);
                            if (daysSinceLast < SPAM_PREVENTION_DAYS) {
                                // Too soon to remind again
                                continue;
                            }
                        }

                        console.log(`[Cron] VM ${instance.name} (${instance.vmid}) has been up for ${(statusData.uptime / 3600).toFixed(1)}h. Sending reminder.`);

                        const uptimeHours = Math.floor(statusData.uptime / 3600);
                        const uptimeDays = Math.floor(uptimeHours / 24);

                        // Send Email
                        await emailService.sendEmail(
                            instance.user.email,
                            `💡 Économisez vos points - ${instance.name}`,
                            `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                                <h2 style="color: #f59e0b;">Votre VM tourne depuis longtemps...</h2>
                                <p>Bonjour <strong>${instance.user.name}</strong>,</p>
                                <p>Nous avons remarqué que votre instance <strong>${instance.name}</strong> est active depuis plus de <strong>${uptimeDays} jours</strong> (${uptimeHours} heures).</p>
                                <p>
                                    Si vous n'utilisez pas cette machine actuellement, nous vous conseillons de l'éteindre pour économiser vos points ! 
                                    Une machine éteinte ne consomme aucun point.
                                </p>
                                <div style="margin: 20px 0; padding: 15px; background-color: #f3f4f6; border-radius: 5px;">
                                    <strong>Pourquoi éteindre ?</strong><br/>
                                    Les points sont précieux. Gardez-les pour quand vous en avez vraiment besoin !
                                </div>
                                <a href="https://smp4.xyz/dashboard/instance/${instance.id}" style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Gérer mon instance</a>
                            </div>`
                        );

                        // Update DB to remember we notified
                        await prisma.instance.update({
                            where: { id: instance.id },
                            data: { lastIdleNotification: new Date() }
                        });
                    }

                } catch (err) {
                    console.error(`[Cron] Failed to check idle status for VM ${instance.vmid}:`, err.message);
                }
            }

            console.log('[Cron] Idle VM Check Finished.');

        } catch (error) {
            console.error('[Cron] Idle check critical error:', error);
        }
    }, {
        timezone: "Europe/Paris"
    });
};

module.exports = { initIdleCheckCron };
