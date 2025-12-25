/**
 * Instance Service
 * Business logic for VM instance lifecycle management
 */

const { prisma } = require('../db');
const proxmoxService = require('./proxmox.service');
const sshService = require('./ssh.service');
const cloudflareService = require('./cloudflare.service');
const vpnService = require('./vpn.service');
const emailService = require('./email.service');
const { vmCreationQueue, vmAllocationQueue } = require('./queue.service');
const log = require('./logger.service');
const crypto = require('crypto');
const systemOs = require('os');
const redisService = require('./redis.service');

// Constants
const ROOT_PASSWORD_BYTES = 8;
const IP_MAX_ATTEMPTS = 30;
const IP_POLL_DELAY_MS = 2000;
const SSH_READY_DELAY_MS = 10000;
const SSH_RESTART_DELAY_MS = 2000;

/**
 * Get backend server IP address
 * Priority: BACKEND_IP env > 192.168.x.x > any external IPv4
 */
const getBackendIp = () => {
    if (process.env.BACKEND_IP) {
        return process.env.BACKEND_IP;
    }

    const networks = systemOs.networkInterfaces();

    // Priority: Find 192.168.x.x address first
    for (const name of Object.keys(networks)) {
        for (const net of networks[name]) {
            if (net.family === 'IPv4' && !net.internal && net.address.startsWith('192.168.')) {
                return net.address;
            }
        }
    }

    // Fallback: take any external IPv4
    for (const name of Object.keys(networks)) {
        for (const net of networks[name]) {
            if (net.family === 'IPv4' && !net.internal) {
                return net.address;
            }
        }
    }

    return null;
};

/**
 * Allocate VMID and create initial DB record
 * Serialized via vmAllocationQueue to prevent race conditions
 */
const allocateInstance = async ({ name, template, cpu, ram, storage, pointsPerDay, userId }) => {
    return vmAllocationQueue.add(async () => {
        // Get next VMID from Proxmox
        let vmid = parseInt(await proxmoxService.getNextVmid());

        // Find unused VMID (handles race conditions)
        while (await prisma.instance.findFirst({ where: { vmid: vmid } })) {
            vmid++;
        }
        log.debug(`Allocated VMID ${vmid} for instance ${name}`);

        // Generate root password
        const rootPassword = crypto.randomBytes(ROOT_PASSWORD_BYTES).toString('hex');

        // Create DB record
        const instance = await prisma.instance.create({
            data: {
                name,
                template,
                cpu,
                ram,
                storage,
                pointsPerDay,
                status: "provisioning",
                userId,
                vmid: vmid,
                rootPassword: rootPassword
            },
        });

        return { instance, vmid, rootPassword };
    });
};

/**
 * Wait for VM to get an IP address
 */
const waitForVmIp = async (vmid) => {
    let ip = null;
    let attempts = 0;

    while (!ip && attempts < IP_MAX_ATTEMPTS) {
        await new Promise(r => setTimeout(r, IP_POLL_DELAY_MS));
        const interfaces = await proxmoxService.getLXCInterfaces(vmid);
        const eth0 = interfaces.find(i => i.name === 'eth0');
        if (eth0 && eth0.inet) {
            const candidateIp = eth0.inet.split('/')[0];
            ip = candidateIp && !candidateIp.startsWith('127.') ? candidateIp : null;
        }
        attempts++;
    }

    return ip;
};

/**
 * Configure SSH access on the VM
 */
const configureSshAccess = async (ip, rootPassword) => {
    // Enable Password Authentication & Root Login
    await sshService.execCommand(ip, `sed -i 's/^PasswordAuthentication no/PasswordAuthentication yes/' /etc/ssh/sshd_config && sed -i 's/^#PasswordAuthentication yes/PasswordAuthentication yes/' /etc/ssh/sshd_config && sed -i 's/^#PermitRootLogin.*/PermitRootLogin yes/' /etc/ssh/sshd_config && sed -i 's/^PermitRootLogin.*/PermitRootLogin yes/' /etc/ssh/sshd_config && service ssh restart`);

    await new Promise(r => setTimeout(r, SSH_RESTART_DELAY_MS));

    // Create smp4 user
    await sshService.execCommand(ip, 'id -u smp4 &>/dev/null || useradd -m -s /bin/bash smp4');
    await sshService.execCommand(ip, 'usermod -aG sudo smp4');
    await sshService.execCommand(ip, `echo "smp4:${rootPassword}" | chpasswd && chage -d 0 smp4`);
    await sshService.execCommand(ip, `echo "root:${rootPassword}" | chpasswd`);
};

/**
 * Configure firewall rules for the VM
 */
const configureFirewall = async (vmid) => {
    const backendIp = getBackendIp();

    if (backendIp) {
        // Block VM from attacking host sensitive ports
        const sensitivePorts = [22, 80, 85, 443, 8006];
        await Promise.all(
            sensitivePorts.map((port) =>
                proxmoxService.addFirewallRule(vmid, {
                    type: 'out',
                    action: 'DROP',
                    dest: backendIp,
                    dport: port,
                    proto: 'tcp',
                    enable: 1,
                    comment: `Block access to Host Port ${port}`
                })
            )
        );
    }

    // Allow ALL Inbound Traffic
    await proxmoxService.addFirewallRule(vmid, {
        type: 'in',
        action: 'ACCEPT',
        enable: 1,
        comment: 'Allow all inbound traffic (Web, Portainer, etc.)'
    });

    // Block access to Gateway
    await proxmoxService.addFirewallRule(vmid, {
        type: 'out',
        action: 'DROP',
        dest: '192.168.1.254',
        enable: 1,
        comment: 'Block access to Gateway Admin Interface'
    });

    // Enable firewall
    await proxmoxService.setFirewallOptions(vmid, { enable: 1 });
};

/**
 * Create Portainer domain for instance
 */
const createPortainerDomain = async (instance, user, ip) => {
    const cleanUser = user.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanInstance = instance.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const subdomain = `portainer-${cleanUser}-${cleanInstance}`.replace(/-+/g, '-').replace(/^-|-$/g, '');

    const fullHostname = `${subdomain}.smp4.xyz`;
    const serviceUrl = `http://${ip}:9000`;

    log.debug(`[Background] Creating Portainer domain: ${fullHostname} -> ${serviceUrl}`);

    await cloudflareService.addTunnelIngress(fullHostname, serviceUrl);

    await prisma.domain.create({
        data: {
            subdomain,
            port: 9000,
            isPaid: false,
            instanceId: instance.id
        }
    });

    log.debug(`[Background] Portainer domain created: ${subdomain}`);
};

/**
 * Provision instance in background (clone, configure, setup)
 */
const provisionInBackground = async ({ instance, vmid, rootPassword, templateVersion, user }) => {
    vmCreationQueue.add(async () => {
        try {
            const sanitizedUser = user.name.toLowerCase().replace(/[^a-z0-9]/g, '');
            const userIdShort = String(user.id).slice(0, 6);
            const instanceIdShort = String(instance.id).slice(0, 8);
            const technicalHostname = `${userIdShort}-${sanitizedUser}-${instance.template.toLowerCase()}-${instanceIdShort}`;

            log.debug(`[Queue] Starting processing for ${vmid}...`);

            // Clone LXC
            const upid = await proxmoxService.cloneLXC(templateVersion.proxmoxId, vmid, technicalHostname);
            await proxmoxService.waitForTask(upid);
            log.debug(`[Background] Clone complete for ${vmid}`);

            // Set tags
            try {
                const dateTag = new Date().toISOString().split('T')[0];
                await proxmoxService.configureLXC(vmid, { tags: `${sanitizedUser},${instance.template},${dateTag}` });
            } catch (tagError) {
                log.warn(`[Background] Failed to set tag for ${vmid}:`, tagError.message);
            }

            // Start LXC
            await proxmoxService.startLXC(vmid);
            log.debug(`[Background] LXC ${vmid} started`);

            // Wait for IP
            const ip = await waitForVmIp(vmid);

            if (ip) {
                log.debug(`[Background] VM ${vmid} is up at ${ip}. Configuring...`);

                await new Promise(r => setTimeout(r, SSH_READY_DELAY_MS));

                try {
                    await configureSshAccess(ip, rootPassword);
                    log.debug(`[Background] User 'smp4' configured for ${vmid}`);

                    // Send credentials email
                    if (user && user.email) {
                        await emailService.sendInstanceCredentials(user.email, user.name, instance.name, ip, rootPassword);
                    }

                    // Configure firewall
                    try {
                        await configureFirewall(vmid);
                        log.debug(`[Background] Firewall configured for ${vmid}`);
                    } catch (fwError) {
                        log.warn(`[Background] Firewall setup failed:`, fwError.message);
                    }
                } catch (sshError) {
                    log.error(`[Background] SSH configuration failed:`, sshError.message);
                }

                // Create VPN
                try {
                    const vpnData = await vpnService.createClient(ip);
                    await prisma.instance.update({
                        where: { id: instance.id },
                        data: { vpnConfig: vpnData.config }
                    });
                    log.debug(`[Background] VPN configured for ${vmid}`);
                } catch (vpnError) {
                    log.error(`[Background] VPN creation failed:`, vpnError.message);
                }

                // Create Portainer domain
                try {
                    await createPortainerDomain(instance, user, ip);
                } catch (domainError) {
                    log.error(`[Background] Portainer domain creation failed:`, domainError);
                }
            } else {
                log.error(`[Background] Timed out waiting for IP for ${vmid}`);
            }

            // Mark as online
            await prisma.instance.update({
                where: { id: instance.id },
                data: { status: 'online' }
            });
            log.debug(`[Background] Instance ${instance.id} is now ONLINE`);

        } catch (bgError) {
            log.error(`[Background] Creation failed for ${vmid}:`, bgError.message);
            await prisma.instance.update({
                where: { id: instance.id },
                data: { status: 'error' }
            });
        }
    });
};

/**
 * Get instance with ownership validation
 */
const getInstanceWithOwner = async (instanceId, userId) => {
    const instance = await prisma.instance.findUnique({
        where: { id: instanceId }
    });

    if (!instance || instance.userId !== userId) {
        return null;
    }

    return instance;
};

/**
 * Toggle instance status (start/stop)
 */
const toggleStatus = async (instance) => {
    const currentStatus = instance.status;
    let newStatus;

    if (currentStatus === "online" || currentStatus === "running") {
        log.debug(`Stopping instance ${instance.vmid}...`);
        await proxmoxService.stopLXC(instance.vmid);
        newStatus = "stopped";
    } else {
        log.debug(`Starting instance ${instance.vmid}...`);
        await proxmoxService.startLXC(instance.vmid);
        newStatus = "online";
    }

    return prisma.instance.update({
        where: { id: instance.id },
        data: { status: newStatus }
    });
};

/**
 * Restart instance
 */
const restartInstance = async (instance) => {
    await proxmoxService.rebootLXC(instance.vmid);
};

/**
 * Delete instance and cleanup all resources
 */
const deleteInstance = async (instance) => {
    // Stop if running
    if (instance.vmid) {
        try {
            log.debug(`Ensuring VM ${instance.vmid} is stopped...`);
            const upid = await proxmoxService.stopLXC(instance.vmid);
            await proxmoxService.waitForTask(upid);
        } catch (e) {
            log.warn(`Stop failed (maybe already stopped): ${e.message}`);
        }

        // Delete from Proxmox
        try {
            log.debug(`Deleting VM ${instance.vmid} from Proxmox...`);
            await proxmoxService.deleteLXC(instance.vmid);
        } catch (e) {
            log.warn(`Proxmox delete failed (VM may not exist): ${e.message}`);
        }
    }

    // Clean up VPN
    if (instance.vpnConfig) {
        log.debug(`Cleaning up VPN for instance ${instance.id}...`);
        await vpnService.deleteClient(instance.vpnConfig);
    }

    // Clean up domains
    if (instance.domains && instance.domains.length > 0) {
        log.debug(`Cleaning up ${instance.domains.length} domains...`);
        const hostnames = instance.domains.map(d => `${d.subdomain}.smp4.xyz`);
        try {
            await cloudflareService.removeMultipleTunnelIngress(hostnames);
        } catch (cfError) {
            log.error("Failed to remove domains from Cloudflare:", cfError.message);
        }
    }

    // Delete from DB (cascade deletes domains)
    await prisma.instance.delete({ where: { id: instance.id } });
};

/**
 * Get instance stats from Proxmox
 */
const getInstanceStats = async (instance) => {
    if (!instance.vmid || instance.status === 'stopped') {
        return {
            cpu: 0,
            ram: 0,
            storage: 0,
            ip: null,
            status: instance.status
        };
    }

    const cacheKey = `instance:${instance.id}:stats`;
    const cachedStats = await redisService.get(cacheKey);
    if (cachedStats) {
        return cachedStats;
    }

    const status = await proxmoxService.getLXCStatus(instance.vmid);
    const interfaces = await proxmoxService.getLXCInterfaces(instance.vmid);

    // Calculate metrics
    let cpuPercent = 0;
    if (typeof status.cpu === 'number') {
        cpuPercent = status.cpu * 100;
    }

    let ramPercent = 0;
    if (status.maxmem) {
        ramPercent = (status.mem / status.maxmem) * 100;
    }

    const storageGB = instance.storage ? parseInt(instance.storage, 10) : 0;
    let maxDiskBytes = status.maxdisk;
    if (storageGB > 0) {
        maxDiskBytes = storageGB * 1024 * 1024 * 1024;
    }

    const storagePercent = maxDiskBytes ? (status.disk / maxDiskBytes) * 100 : 0;

    // Get IP
    let ip = null;
    const eth0 = interfaces.find(i => i.name === 'eth0');
    if (eth0?.inet) {
        ip = eth0.inet.split('/')[0];
    }

    const stats = {
        cpu: parseFloat(cpuPercent.toFixed(1)),
        ram: parseFloat(ramPercent.toFixed(1)),
        storage: parseFloat(storagePercent.toFixed(1)),
        diskBytes: status.disk,
        maxDiskBytes: parseInt(maxDiskBytes),
        ip: ip,
        status: status.status,
        uptime: status.uptime,
        rootPassword: instance.rootPassword
    };

    await redisService.set(cacheKey, stats, 5); // Cache for 5 seconds
    return stats;
};

/**
 * Sync DB status with Proxmox
 */
const syncDbStatus = async (instance, proxmoxStatus) => {
    const currentDbStatus = instance.status;
    const mappedProxmoxStatus = proxmoxStatus === 'running' ? 'online' : 'stopped';

    if (currentDbStatus !== 'provisioning' && currentDbStatus !== mappedProxmoxStatus) {
        log.debug(`[Sync] Mismatch for ${instance.id}. DB: ${currentDbStatus}, Proxmox: ${proxmoxStatus}. Updating...`);
        await prisma.instance.update({
            where: { id: instance.id },
            data: { status: mappedProxmoxStatus }
        });
    }
};

/**
 * Generate or retrieve VPN config
 */
const getOrCreateVpnConfig = async (instance) => {
    if (instance.vpnConfig) {
        return instance.vpnConfig;
    }

    if (!instance.vmid) {
        throw new Error("Instance has no VMID");
    }

    const interfaces = await proxmoxService.getLXCInterfaces(instance.vmid);
    const eth0 = interfaces.find(i => i.name === 'eth0');
    const ip = eth0 && eth0.inet ? eth0.inet.split('/')[0] : null;

    if (!ip || ip.startsWith('127.')) {
        throw new Error("Instance must be running to generate VPN config");
    }

    log.debug(`[VPN] Generating missing config for ${instance.id} (${ip})...`);
    const vpnData = await vpnService.createClient(ip);

    await prisma.instance.update({
        where: { id: instance.id },
        data: { vpnConfig: vpnData.config }
    });
    log.vpn(`[DEBUG] Saved VPN config for instance ${instance.id}`);
    log.vpn(`[DEBUG] Saved VPN config for instance ${instance.id}`);

    return vpnData.config;
};

module.exports = {
    getBackendIp,
    allocateInstance,
    provisionInBackground,
    getInstanceWithOwner,
    toggleStatus,
    restartInstance,
    deleteInstance,
    getInstanceStats,
    syncDbStatus,
    getOrCreateVpnConfig,
    waitForVmIp,
    configureSshAccess,
    configureFirewall,
    createPortainerDomain
};
