const cron = require('node-cron');
const { prisma } = require('../db');
const proxmoxService = require('../services/proxmox.service');

const MAX_BACKUPS = 3;


const rotateBackups = async (vmid, backups) => {
    const backupsToDeleteCount = Math.max(0, backups.length - (MAX_BACKUPS - 1));

    for (let i = 0; i < backupsToDeleteCount; i++) {
        const backupToDelete = backups[i];
        console.log(`[Cron] Rotation: Deleting old backup ${backupToDelete.volid}...`);
        try {
            const deleteUpid = await proxmoxService.deleteVolume(backupToDelete.volid);
            if (deleteUpid && deleteUpid.startsWith('UPID')) {
                await proxmoxService.waitForTask(deleteUpid);
            }
        } catch (delErr) {
            console.error(`[Cron] Failed to delete old backup ${backupToDelete.volid}:`, delErr.message);
        }
    }
};

const processInstanceBackup = async (instance) => {
    try {
        console.log(`[Cron] Processing backup for VM ${instance.vmid} (${instance.name})...`);

        // 1. List existing backups for this VM
        const backups = await proxmoxService.listBackups('local', instance.vmid);

        // Sort by time (ctime), oldest first
        backups.sort((a, b) => a.ctime - b.ctime);

        console.log(`[Cron] VM ${instance.vmid} has ${backups.length} existing backups.`);

        // 2. Rotate: Delete oldest if we have >= MAX_BACKUPS
        await rotateBackups(instance.vmid, backups);

        // 3. Create new backup
        console.log(`[Cron] Creating new backup for VM ${instance.vmid}...`);
        const upid = await proxmoxService.createLXCBackup(instance.vmid, 'local', 'stop');
        await proxmoxService.waitForTask(upid);

        console.log(`[Cron] Backup completed for VM ${instance.vmid}`);

    } catch (err) {
        console.error(`[Cron] Failed to backup VM ${instance.vmid}:`, err.message);
        // Continue to next instance logic handled by caller loop
    }
};

const runBackupTask = async () => {
    console.log('[Cron] Starting Daily Backup Task (00:00)...');

    try {
        // Fetch all active instances with a VMID
        const instances = await prisma.instance.findMany({
            where: {
                vmid: { not: null }
            }
        });

        console.log(`[Cron] Found ${instances.length} instances to backup.`);

        // Process sequentially to avoid overloading Proxmox I/O
        for (const instance of instances) {
            await processInstanceBackup(instance);
        }

        console.log('[Cron] Daily Backup Task Finished.');

    } catch (error) {
        console.error('[Cron] Backup task critical error:', error);
    }
};

const initBackupCron = () => {
    // Schedule: Midnight every day (0 0 * * *)
    cron.schedule('0 0 * * *', runBackupTask, {
        timezone: "Europe/Paris"
    });
};

module.exports = { initBackupCron, runBackupTask, processInstanceBackup, rotateBackups };

