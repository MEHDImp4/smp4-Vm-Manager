const { prisma } = require('../db');
const cloudflareService = require('./cloudflare.service');
const vpnService = require('./vpn.service');
const proxmox = require('./proxmox.service');
const log = require('./logger.service');

/**
 * Execute full cleanup of user resources
 * @param {string} userId - ID of the user to delete
 * @param {string} userName - Name of the user (for subdomain reconstruction)
 * @param {Array} instances - List of user instances with domains included
 */
const cleanupUserResources = async (userId, userName, instances) => {
    log.auth(`Starting resource cleanup for user: ${userId}`);

    // 1. Collect all resources to delete
    const allHostnames = [];

    log.auth(`Found ${instances.length} instances to clean up for user ${userId}`);

    for (const instance of instances) {
        // Collect hostnames
        if (instance.domains && instance.domains.length > 0) {
            instance.domains.forEach(d => {
                allHostnames.push(`${d.subdomain}.smp4.xyz`);
            });
        }

        // Reconstruct Portainer Name
        if (instance.name) {
            const cleanUser = userName.toLowerCase().replace(/[^a-z0-9]/g, '');
            const cleanInstance = instance.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
            const subdomain = `portainer-${cleanUser}-${cleanInstance}`.replace(/-+/g, '-').replace(/^-|-$/g, '');
            allHostnames.push(`${subdomain}.smp4.xyz`);
        }
    }

    // 2. Bulk Delete from Cloudflare
    if (allHostnames.length > 0) {
        log.auth(`Removing ${allHostnames.length} domains from Cloudflare...`);
        try {
            await cloudflareService.removeMultipleTunnelIngress(allHostnames);
        } catch (cfError) {
            log.error(`[Delete] Cloudflare cleanup error (continuing): ${cfError.message}`);
        }
    }

    // 3. Delete Instances (Proxmox + VPN)
    for (const instance of instances) {
        log.auth(`Processing instance ${instance.id} (VMID: ${instance.vmid})...`);

        // VPN Cleanup
        if (instance.vpnConfig) {
            try {
                log.auth(`Removing VPN client...`);
                await vpnService.deleteClient(instance.vpnConfig);
            } catch (vpnError) {
                log.warn(`[Delete] VPN cleanup error (continuing): ${vpnError.message}`);
            }
        }

        // Proxmox Cleanup
        if (instance.vmid) {
            try {
                log.auth(`Stopping VM ${instance.vmid}...`);
                try {
                    const upid = await proxmox.stopLXC(instance.vmid);
                    log.auth(`Waiting for stop task ${upid}...`);
                    await proxmox.waitForTask(upid);
                } catch (e) {
                    // Ignore if already stopped or error
                    log.warn(`[Delete] VM stop warning: ${e.message}`);
                }

                log.auth(`Deleting VM ${instance.vmid}...`);
                await proxmox.deleteLXC(instance.vmid);
            } catch (proxmoxError) {
                log.error(`[Delete] Proxmox deletion error for ${instance.vmid} (continuing): ${proxmoxError.message}`);
            }
        }
    }

    // 4. Delete user from database
    log.auth('Deleting user from database...');
    try {
        // Get all instance IDs for cascade deletion
        const instanceIds = instances.map(i => i.id);

        // Delete in correct order to avoid foreign key violations
        log.auth('Deleting snapshots...');
        await prisma.snapshot.deleteMany({ where: { instanceId: { in: instanceIds } } });

        log.auth('Deleting domains...');
        await prisma.domain.deleteMany({ where: { instanceId: { in: instanceIds } } });

        log.auth('Deleting instances...');
        await prisma.instance.deleteMany({ where: { userId } });

        log.auth('Deleting point transactions...');
        await prisma.pointTransaction.deleteMany({ where: { userId } });

        log.auth('Deleting daily spins...');
        await prisma.dailySpin.deleteMany({ where: { userId } });

        log.auth('Deleting social claims...');
        await prisma.socialClaim.deleteMany({ where: { userId } });

        log.auth('Finally deleting user...');
        await prisma.user.delete({ where: { id: userId } });

        log.auth('User deleted successfully');
    } catch (dbError) {
        log.error('[Delete] Database deletion error:', dbError);
        throw new Error('Impossible de supprimer le compte: ' + dbError.message);
    }
};

module.exports = {
    cleanupUserResources
};
