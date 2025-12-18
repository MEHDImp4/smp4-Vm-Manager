const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const proxmoxService = require('../services/proxmox.service');

const log = (...args) => {
    if (process.env.NODE_ENV !== 'production') {
        console.log(...args);
    }
};

const startSnapshotCron = () => {
    // Run every day at midnight (00:00)
    cron.schedule('0 0 * * *', async () => {
        log('[Cron] Starting daily snapshot task...');
        try {
            // Fetch all instances that are likely active (e.g. not deleted)
            // We'll try to snapshot everything that has a VMID
            const instances = await prisma.instance.findMany({
                where: {
                    vmid: { not: null }
                }
            });

            log(`[Cron] Found ${instances.length} instances to snapshot.`);

            // Run sequentially to avoid overloading Proxmox with concurrent snapshot tasks
            for (const instance of instances) {
                try {
                    const dateTag = new Date().toISOString().split('T')[0];
                    const snapName = `Auto-${dateTag}`;

                    log(`[Cron] Creating snapshot '${snapName}' for VM ${instance.vmid}...`);

                    // Create snapshot
                    await proxmoxService.createLXCSnapshot(instance.vmid, snapName, "Automated Daily Snapshot");

                    log(`[Cron] Snapshot created for VM ${instance.vmid}`);

                    // Cleanup: Optionally implement retention here (e.g., keep last 3)
                    // For now, we rely on Proxmox or manual cleanup as per initial request simplicity

                } catch (err) {
                    console.error(`[Cron] Failed to snapshot VM ${instance.vmid}:`, err.message);
                }
            }
        } catch (error) {
            console.error('[Cron] Snapshot task failed:', error);
        }
    });

    log('Daily Snapshot cron job started (00:00).');
};

module.exports = { startSnapshotCron };
