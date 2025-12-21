const cron = require('node-cron');
const { prisma } = require('../db');
const proxmoxService = require('../services/proxmox.service');
const log = require('../services/logger.service');

const startSnapshotCron = () => {
    // Run every day at midnight (00:00)
    cron.schedule('0 0 * * *', async () => {
        log.cron('Starting daily snapshot task...');
        try {
            // Fetch all instances that are likely active (e.g. not deleted)
            const instances = await prisma.instance.findMany({
                where: {
                    vmid: { not: null }
                }
            });

            log.cron(`Found ${instances.length} instances to snapshot`);

            // Run sequentially to avoid overloading Proxmox
            for (const instance of instances) {
                try {
                    const dateTag = new Date().toISOString().split('T')[0];
                    const snapName = `Auto-${dateTag}`;

                    log.cron(`Creating snapshot '${snapName}' for VM ${instance.vmid}...`);

                    await proxmoxService.createLXCSnapshot(instance.vmid, snapName, "Automated Daily Snapshot");

                    log.cron(`Snapshot created for VM ${instance.vmid}`);

                } catch (err) {
                    log.error(`Failed to snapshot VM ${instance.vmid}`, { error: err.message });
                }
            }
        } catch (error) {
            log.error('Snapshot task failed', { error: error.message });
        }
    });

    log.cron('Daily Snapshot cron job started (00:00)');
};

module.exports = { startSnapshotCron };

