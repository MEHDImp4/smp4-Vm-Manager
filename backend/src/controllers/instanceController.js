const emailService = require('../services/email.service');
const { prisma } = require('../db');
const proxmoxService = require('../services/proxmox.service');
const sshService = require('../services/ssh.service');
const crypto = require('crypto');
const systemOs = require('os');
const cloudflareService = require('../services/cloudflare.service');
const vpnService = require('../services/vpn.service');

const ROOT_PASSWORD_BYTES = 8; // yields 16 hex chars
const IP_MAX_ATTEMPTS = 30; // poll limit for VM IP
const IP_POLL_DELAY_MS = 2000;
const SSH_READY_DELAY_MS = 10000;
const SSH_RESTART_DELAY_MS = 2000;

const debugLog = (...args) => {
    if (process.env.NODE_ENV !== 'production') {
        console.log(...args);
    }
};



const getBackendIp = () => {
    // 1. Check explicitly configured IP
    if (process.env.BACKEND_IP) {
        return process.env.BACKEND_IP;
    }

    const networks = systemOs.networkInterfaces();

    // 2. Priority: Find 192.168.x.x address first
    for (const name of Object.keys(networks)) {
        for (const net of networks[name]) {
            if (net.family === 'IPv4' && !net.internal && net.address.startsWith('192.168.')) {
                return net.address;
            }
        }
    }

    // 3. Fallback: take any external IPv4
    for (const name of Object.keys(networks)) {
        for (const net of networks[name]) {
            if (net.family === 'IPv4' && !net.internal) {
                return net.address;
            }
        }
    }

    return null;
};

const createInstance = async (req, res) => {
    try {
        let { name, template, cpu, ram, storage, pointsPerDay, os } = req.body;
        const userId = req.user.id;
        const role = req.user.role;

        // Admins don't pay points
        if (role === 'admin') {
            pointsPerDay = 0;
        }

        // Fetch User for Hostname Generation
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return res.status(404).json({ error: "User not found" });

        // 1. Get Proxmox Template ID (Default OS)
        const templateVersion = await prisma.templateVersion.findUnique({
            where: {
                templateId_os: {
                    templateId: template.toLowerCase(),
                    os: 'default' // Hardcoded default as per user request
                }
            }
        });

        if (!templateVersion) {
            return res.status(400).json({ error: "Invalid template or OS combination. Please contact admin." });
        }

        // 2. Get Next VMID from Proxmox
        const vmid = await proxmoxService.getNextVmid();
        debugLog(`Allocated VMID ${vmid} for instance ${name}`);

        // Generate Technical Hostname: [UserID]-[UserName]-[Template]-[InstanceID]
        // Sanitize user name (remove spaces, special chars)
        const sanitizedUser = user.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        // We'll use the instance ID later, so generate a temp hostname first
        // The final hostname will be set after instance creation

        // Generate Root Password
        const rootPassword = crypto.randomBytes(ROOT_PASSWORD_BYTES).toString('hex'); // 16 chars hex

        // 3. Create Database Record
        const instance = await prisma.instance.create({
            data: {
                name, // Start using user-provided friendly name
                template,
                cpu,
                ram,
                storage,
                pointsPerDay,
                status: "provisioning", // Initial status
                userId,
                vmid: parseInt(vmid),
                rootPassword: rootPassword
            },
        });

        // Respond immediately to UI
        res.status(201).json(instance);

        // Generate Technical Hostname NOW that we have instance.id
        // Format: [UserID short]-[UserName]-[Template]-[InstanceID short]
        const userIdShort = String(user.id).slice(0, 6); // First 6 chars of user ID
        const instanceIdShort = String(instance.id).slice(0, 8); // First 8 chars of instance ID
        const technicalHostname = `${userIdShort}-${sanitizedUser}-${template.toLowerCase()}-${instanceIdShort}`;

        // 4. Background Process: Clone, Start, Configure (Queued)
        const { vmCreationQueue } = require('../services/queue.service');

        vmCreationQueue.add(async () => {
            try {
                debugLog(`[Queue] Starting processing for ${vmid}...`);
                debugLog(`[Background] Cloning VM ${vmid} from template ${templateVersion.proxmoxId} as ${technicalHostname}...`);
                // Use technicalHostname for Proxmox
                const upid = await proxmoxService.cloneLXC(templateVersion.proxmoxId, vmid, technicalHostname);

                await proxmoxService.waitForTask(upid);
                debugLog(`[Background] Clone complete for ${vmid}. Starting...`);

                // Set User & Date Tag
                try {
                    const dateTag = new Date().toISOString().split('T')[0];
                    debugLog(`[Background] Setting tags '${sanitizedUser},${template},${dateTag}' for ${vmid}...`);
                    await proxmoxService.configureLXC(vmid, { tags: `${sanitizedUser},${template},${dateTag}` });
                } catch (tagError) {
                    console.warn(`[Background] Failed to set tag for ${vmid}:`, tagError.message);
                    // Continue creation even if tagging fails
                }

                // Password setting via Proxmox API is not supported for LXC config in this version.
                // We will set it via SSH after boot.

                await proxmoxService.startLXC(vmid);
                // Note: We do NOT set status to 'online' here anymore. We wait for SSH config.

                debugLog(`[Background] LXC ${vmid} started.`);

                // Wait for IP and Configure 'smp4' user
                let ip = null;
                let attempts = 0;
                // Sequential polling is intentional: Proxmox needs time to report a non-loopback IP
                while (!ip && attempts < IP_MAX_ATTEMPTS) { // Wait up to 60s
                    await new Promise(r => setTimeout(r, IP_POLL_DELAY_MS));
                    const interfaces = await proxmoxService.getLXCInterfaces(vmid);
                    const eth0 = interfaces.find(i => i.name === 'eth0');
                    if (eth0 && eth0.inet) {
                        const candidateIp = eth0.inet.split('/')[0];
                        // Ignore loopback addresses that Proxmox may temporarily report
                        ip = candidateIp && !candidateIp.startsWith('127.') ? candidateIp : null;
                    }
                    attempts++;
                }

                if (ip) {
                    debugLog(`[Background] VM ${vmid} is up at ${ip}. Configuring 'smp4' user...`);

                    // Allow SSH to come up fully (sometimes IP is ready before SSHd)
                    await new Promise(r => setTimeout(r, SSH_READY_DELAY_MS));

                    try {
                        // 1. Enable Password Authentication & Root Login
                        await sshService.execCommand(ip, `sed -i 's/^PasswordAuthentication no/PasswordAuthentication yes/' /etc/ssh/sshd_config && sed -i 's/^#PasswordAuthentication yes/PasswordAuthentication yes/' /etc/ssh/sshd_config && sed -i 's/^#PermitRootLogin.*/PermitRootLogin yes/' /etc/ssh/sshd_config && sed -i 's/^PermitRootLogin.*/PermitRootLogin yes/' /etc/ssh/sshd_config && service ssh restart`);

                        // Wait for SSH to restart
                        await new Promise(r => setTimeout(r, SSH_RESTART_DELAY_MS));

                        // 2. Create smp4 user if not exists
                        await sshService.execCommand(ip, 'id -u smp4 &>/dev/null || useradd -m -s /bin/bash smp4');

                        // 3. Add to sudo (MUST be before password change!)
                        await sshService.execCommand(ip, 'usermod -aG sudo smp4');

                        // 4. Set Password for smp4 AND force password change on first login (combined)
                        await sshService.execCommand(ip, `echo "smp4:${rootPassword}" | chpasswd && chage -d 0 smp4`);

                        // 5. Set Password for root (LAST - changes root password, locks us out)
                        await sshService.execCommand(ip, `echo "root:${rootPassword}" | chpasswd`);

                        debugLog(`[Background] User 'smp4' configured successfully for ${vmid}`);

                        // Send Email Notification
                        if (user && user.email) {
                            debugLog(`[Background] Sending credential email to ${user.email}...`);
                            await emailService.sendInstanceCredentials(user.email, user.name, instance.name, ip, rootPassword);
                        }

                        // 6. Security: Configure Firewall
                        try {
                            // 6a. Whitelist Backend IP for WebSocket/SSH access
                            const backendIp = getBackendIp();

                            if (backendIp) {
                                // SECURITY HARDENING: Block VM from attacking Unraid Admin Interfaces
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

                            // 6b. Allow ALL Inbound Traffic
                            debugLog(`[Background] Adding firewall rule: ACCEPT ALL INBOUND for ${vmid}...`);
                            await proxmoxService.addFirewallRule(vmid, {
                                type: 'in',
                                action: 'ACCEPT',
                                enable: 1,
                                comment: 'Allow all inbound traffic (Web, Portainer, etc.)'
                            });

                            // 6c. Allow LAN Access but Protect Gateway
                            debugLog(`[Background] Adding firewall DROP rule for Gateway 192.168.1.254 to ${vmid}...`);
                            await proxmoxService.addFirewallRule(vmid, {
                                type: 'out',
                                action: 'DROP',
                                dest: '192.168.1.254',
                                enable: 1,
                                comment: 'Block access to Gateway Admin Interface'
                            });

                            debugLog(`[Background] Firewall rules added for ${vmid}`);

                            // 7. Security: Enable Firewall
                            debugLog(`[Background] Enabling firewall for ${vmid}...`);
                            await proxmoxService.setFirewallOptions(vmid, { enable: 1 });
                        } catch (fwError) {
                            console.warn(`[Background] Failed to add firewall rule via API:`, fwError.message);
                        }
                    } catch (sshError) {
                        console.error(`[Background] Failed to configure 'smp4' user via SSH:`, sshError.message);
                    }
                } else {
                    console.error(`[Background] Timed out waiting for IP for ${vmid}`);
                }

                // Create VPN Client
                try {
                    if (ip) {
                        debugLog(`[Background] Creating WireGuard VPN access for ${ip}...`);
                        const vpnData = await vpnService.createClient(ip);

                        // Parse VPN Config to get PublicKey (simple helper)
                        // Actually the service returns public key separately now

                        await prisma.instance.update({
                            where: { id: instance.id },
                            data: {
                                vpnConfig: vpnData.config
                            }
                        });
                        debugLog(`[Background] VPN configured for ${vmid}`);
                    }
                } catch (vpnError) {
                    console.error(`[Background] VPN creation failed for ${vmid}:`, vpnError.message);
                    // Non-fatal, continue
                }

                // Auto-create Portainer Domain (Port 9000)
                try {
                    if (ip) {
                        debugLog(`[Background] Creating Portainer domain for ${instance.name}...`);

                        // Generate Subdomain: portainer-[user]-[vm]
                        // Ensure strict sanitization matching the createDomain logic
                        const cleanUser = user.name.toLowerCase().replace(/[^a-z0-9]/g, '');
                        const cleanInstance = instance.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
                        // Format: [suffix]-[user]-[vm] => portainer-${cleanUser}-${cleanInstance}
                        const subdomain = `portainer-${cleanUser}-${cleanInstance}`.replace(/-+/g, '-').replace(/^-|-$/g, '');

                        const fullHostname = `${subdomain}.smp4.xyz`;
                        const serviceUrl = `http://${ip}:9000`;

                        debugLog(`[Background] Attempting to create Portainer domain: ${fullHostname} -> ${serviceUrl}`);

                        // Add to Cloudflare
                        await cloudflareService.addTunnelIngress(fullHostname, serviceUrl);

                        // Save to DB (First domain is free)
                        await prisma.domain.create({
                            data: {
                                subdomain,
                                port: 9000,
                                isPaid: false, // First domain is always free
                                instanceId: instance.id
                            }
                        });
                        debugLog(`[Background] Portainer domain successfully created in DB: ${subdomain}`);
                    } else {
                        console.warn(`[Background] Skipping Portainer domain creation: No IP available for ${vmid}`);
                    }
                } catch (domainError) {
                    console.error(`[Background] Portainer domain creation FAILED for ${vmid}:`, domainError);
                    // Non-fatal
                }

                // ALL DONE - SET ONLINE
                await prisma.instance.update({
                    where: { id: instance.id },
                    data: { status: 'online' }
                });
                debugLog(`[Background] Instance ${instance.id} is now ONLINE.`);


            } catch (bgError) {
                console.error(`[Background] Creation failed for ${vmid}:`, bgError.message);
                // Update status to 'error' or 'stopped' so user knows
                await prisma.instance.update({
                    where: { id: instance.id },
                    data: { status: 'error' } // Or 'stopped'
                });
            }
        });

    } catch (error) {
        console.error("Create instance error:", error);
        res.status(500).json({ error: "Failed to create instance" });
    }
};

const getInstances = async (req, res) => {
    try {
        const userId = req.user.id;
        const instances = await prisma.instance.findMany({
            where: { userId },
            orderBy: { created_at: 'desc' },
            include: {
                domains: {
                    where: {
                        isPaid: true
                    },
                    select: {
                        id: true,
                        isPaid: true
                    }
                }
            }
        });

        // Add paidDomainsCount to each instance
        const instancesWithCosts = instances.map(inst => ({
            ...inst,
            paidDomainsCount: inst.domains?.length || 0,
            domains: undefined // Don't send full domain list to dashboard
        }));

        res.json(instancesWithCosts);
    } catch (error) {
        console.error("Get instances error:", error);
        res.status(500).json({ error: "Failed to fetch instances" });
    }
};

// Toggle status (start/stop)
const toggleInstanceStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const instance = await prisma.instance.findUnique({
            where: { id: id }
        });

        if (!instance || instance.userId !== userId) {
            return res.status(404).json({ error: "Instance not found" });
        }

        const currentStatus = instance.status;
        let newStatus;

        if (currentStatus === "online" || currentStatus === "running") {
            debugLog(`Stopping instance ${instance.vmid}...`);
            await proxmoxService.stopLXC(instance.vmid);
            newStatus = "stopped";
        } else {
            debugLog(`Starting instance ${instance.vmid}...`);
            await proxmoxService.startLXC(instance.vmid);
            newStatus = "online";
        }

        const updatedInstance = await prisma.instance.update({
            where: { id: id },
            data: { status: newStatus }
        });

        res.json(updatedInstance);
    } catch (error) {
        console.error("Toggle status error:", error);
        res.status(500).json({ error: "Failed to update status" });
    }
};

const restartInstance = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const instance = await prisma.instance.findUnique({
            where: { id: id }
        });

        if (!instance || instance.userId !== userId) {
            return res.status(404).json({ error: "Instance not found" });
        }

        await proxmoxService.rebootLXC(instance.vmid);
        res.json({ message: "Instance restarting" });

    } catch (error) {
        console.error("Restart instance error:", error);
        res.status(500).json({ error: "Failed to restart instance" });
    }
};

const deleteInstance = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const instance = await prisma.instance.findUnique({
            where: { id },
            include: { domains: true }
        });
        if (!instance || instance.userId !== userId) {
            return res.status(404).json({ error: "Instance not found" });
        }

        // 1. Stop if running (with wait)
        if (instance.vmid) {
            try {
                debugLog(`Ensuring VM ${instance.vmid} is stopped before deletion...`);
                await proxmoxService.stopLXC(instance.vmid);
                // Wait for stop to complete
                await new Promise(r => setTimeout(r, 3000));
            } catch (e) {
                console.warn(`Stop failed (maybe already stopped): ${e.message}`);
            }

            // 2. Delete from Proxmox
            try {
                debugLog(`Deleting VM ${instance.vmid} from Proxmox...`);
                await proxmoxService.deleteLXC(instance.vmid);
            } catch (e) {
                console.warn(`Proxmox delete failed (VM may not exist): ${e.message}`);
                // Continue to delete from DB anyway
            }
        }

        // 3a. Clean up VPN (if exists)
        // 3a. Clean up VPN (if exists)
        if (instance.vpnConfig) {
            debugLog(`Cleaning up VPN for instance ${id}...`);
            await vpnService.deleteClient(instance.vpnConfig);
        }

        // 3b. Clean up Domains
        if (instance.domains && instance.domains.length > 0) {
            debugLog(`Cleaning up ${instance.domains.length} domains for instance ${id}...`);

            const hostnames = instance.domains.map(d => `${d.subdomain}.smp4.xyz`);
            try {
                await cloudflareService.removeMultipleTunnelIngress(hostnames);
            } catch (cfError) {
                console.error("Failed to remove domains from Cloudflare:", cfError.message);
                // Continue deletion anyway
            }
        }

        // 3. Delete from DB
        // Note: Domains are deleted via CASCADE; configured in Prisma schema.
        await prisma.instance.delete({ where: { id } });
        res.json({ message: "Instance deleted" });


    } catch (error) {
        console.error("Delete instance error:", error);
        res.status(500).json({ error: "Failed to delete instance" });
    }
}


const getInstanceStats = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const instance = await prisma.instance.findUnique({ where: { id } });
        if (!instance || instance.userId !== userId) {
            return res.status(404).json({ error: "Instance not found" });
        }

        if (!instance.vmid || instance.status === 'stopped') {
            return res.json({
                cpu: 0,
                ram: 0,
                storage: 0,
                ip: null,
                status: instance.status
            });
        }

        // Fetch stats from Proxmox
        try {
            const status = await proxmoxService.getLXCStatus(instance.vmid);
            const interfaces = await proxmoxService.getLXCInterfaces(instance.vmid);

            // Calculate metrics with explicit guards for readability
            let cpuPercent = 0;
            if (typeof status.cpu === 'number') {
                cpuPercent = status.cpu * 100;
            }

            let ramPercent = 0;
            if (status.maxmem) {
                ramPercent = (status.mem / status.maxmem) * 100;
            }

            // Use instance.storage (GB) from DB as the source of truth for total size
            const storageGB = instance.storage ? parseInt(instance.storage, 10) : 0;
            let maxDiskBytes = status.maxdisk;
            if (storageGB > 0) {
                maxDiskBytes = storageGB * 1024 * 1024 * 1024;
            }

            const storagePercent = maxDiskBytes ? (status.disk / maxDiskBytes) * 100 : 0;

            // interfaces is array. Find eth0.
            let ip = null;
            const eth0 = interfaces.find(i => i.name === 'eth0');
            if (eth0?.inet) {
                ip = eth0.inet.split('/')[0];
            }

            res.json({
                cpu: parseFloat(cpuPercent.toFixed(1)),
                ram: parseFloat(ramPercent.toFixed(1)),
                storage: parseFloat(storagePercent.toFixed(1)),
                diskBytes: status.disk,
                maxDiskBytes: parseInt(maxDiskBytes),
                ip: ip,
                status: status.status,
                uptime: status.uptime,
                rootPassword: instance.rootPassword
            });

            // SYNC DB STATUS: PROXMOX -> DB
            try {
                const currentDbStatus = instance.status;
                const proxmoxStatus = status.status; // 'running' or 'stopped'

                // Map Proxmox 'running' to DB 'online'
                const mappedProxmoxStatus = proxmoxStatus === 'running' ? 'online' : 'stopped';

                // Only update if DIFFERENT and NOT 'provisioning' (to avoid race conditions during creation)
                if (currentDbStatus !== 'provisioning' && currentDbStatus !== mappedProxmoxStatus) {
                    debugLog(`[Sync] Mismatch for ${instance.id}. DB: ${currentDbStatus}, Proxmox: ${proxmoxStatus}. Updating DB...`);
                    await prisma.instance.update({
                        where: { id: instance.id },
                        data: { status: mappedProxmoxStatus }
                    });
                }
            } catch (syncError) {
                console.warn("Failed to sync status to DB:", syncError);
                // Non-fatal, stats still returned
            }

        } catch (proxmoxError) {
            // If Proxmox call fails (e.g. timeout), return cached database status or zeros
            console.error(`Proxmox stats error for ${instance.vmid}:`, proxmoxError.message);
            return res.json({
                cpu: 0,
                ram: 0,
                storage: 0,
                ip: null,
                status: 'unknown'
            });
        }

    } catch (error) {
        console.error("Get stats error:", error);
        res.status(500).json({ error: "Failed to get stats" });
    }
};

const createDomain = async (req, res) => {
    try {
        const { id } = req.params;
        const { port, customSuffix } = req.body;
        const userId = req.user.id;

        // Validation
        if (!port) {
            return res.status(400).json({ error: "Port is required" });
        }
        if (!customSuffix) {
            return res.status(400).json({ error: "Custom suffix is required" });
        }

        // Sanitize suffix: alphanumeric only, lowercase
        const cleanSuffix = customSuffix.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (cleanSuffix.length < 3) {
            return res.status(400).json({ error: "Suffix must be at least 3 alphanumeric characters" });
        }

        // Fetch Instance AND User
        const instance = await prisma.instance.findUnique({
            where: { id },
            include: { domains: true }
        });

        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!instance || instance.userId !== userId || !user) {
            return res.status(404).json({ error: "Instance or User not found" });
        }

        // Check limits: 3 free, unlimited paid (with isPaid flag)
        const freeDomains = instance.domains.filter(d => !d.isPaid);
        const isPaidDomain = freeDomains.length >= 3;

        if (isPaidDomain && req.body.isPaid !== true) {
            return res.status(400).json({
                error: "Maximum of 3 free domains reached",
                requiresPurchase: true,
                message: "You can purchase additional domains for 2 points/day"
            });
        }

        // Generate Subdomain: [username]-[instancename]-[suffix]
        const cleanUser = user.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        const cleanInstance = instance.name.toLowerCase().replace(/[^a-z0-9]/g, '-');

        const subdomain = `${cleanSuffix}-${cleanUser}-${cleanInstance}`.replace(/-+/g, '-').replace(/^-|-$/g, '');

        // Check if subdomain is taken (global check)
        const existingDomain = await prisma.domain.findUnique({
            where: { subdomain }
        });
        if (existingDomain) {
            return res.status(400).json({ error: `Domain ${subdomain} is already active` });
        }

        // Get Instance IP
        const interfaces = await proxmoxService.getLXCInterfaces(instance.vmid);
        const eth0 = interfaces.find(i => i.name === 'eth0');
        const ip = eth0 && eth0.inet ? eth0.inet.split('/')[0] : null;

        if (!ip) {
            return res.status(400).json({ error: "Instance must have an IP address to bind a domain" });
        }

        const fullHostname = `${subdomain}.smp4.xyz`;
        const serviceUrl = `http://${ip}:${port}`;

        // Add to Cloudflare
        await cloudflareService.addTunnelIngress(fullHostname, serviceUrl);

        // Save to DB
        const domain = await prisma.domain.create({
            data: {
                subdomain,
                port: parseInt(port),
                isPaid: isPaidDomain,
                instanceId: id
            }
        });

        res.status(201).json(domain);
    } catch (error) {
        console.error("Create domain error:", error);
        res.status(500).json({ error: error.message });
    }
};

const deleteDomain = async (req, res) => {
    try {
        const { id, domainId } = req.params;
        const userId = req.user.id;

        const domain = await prisma.domain.findUnique({
            where: { id: domainId },
            include: { instance: true }
        });

        if (!domain || domain.instance.id !== id || domain.instance.userId !== userId) {
            return res.status(404).json({ error: "Domain not found" });
        }

        const fullHostname = `${domain.subdomain}.smp4.xyz`;

        // Remove from Cloudflare
        await cloudflareService.removeTunnelIngress(fullHostname);

        // Remove from DB
        await prisma.domain.delete({
            where: { id: domainId }
        });

        res.json({ message: "Domain deleted successfully" });
    } catch (error) {
        console.error("Delete domain error:", error);
        res.status(500).json({ error: "Failed to delete domain" });
    }
};

const getDomains = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const instance = await prisma.instance.findUnique({
            where: { id },
            include: {
                domains: {
                    select: {
                        id: true,
                        subdomain: true,
                        port: true,
                        isPaid: true,
                        createdAt: true
                    }
                }
            }
        });

        if (!instance || instance.userId !== userId) {
            return res.status(404).json({ error: "Instance not found" });
        }

        res.json(instance.domains);
    } catch (error) {
        console.error("Get domains error:", error);
        res.status(500).json({ error: "Failed to fetch domains" });
    }
};


const getVpnConfig = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const instance = await prisma.instance.findUnique({ where: { id } });
        if (!instance || instance.userId !== userId) {
            return res.status(404).json({ error: "Instance not found" });
        }

        // If config exists, return it
        if (instance.vpnConfig) {
            return res.json({ config: instance.vpnConfig });
        }

        // If missing, try to generate it (only if VM is running/has IP)
        if (!instance.vmid) {
            return res.status(400).json({ error: "Instance has no VMID" });
        }

        try {
            const interfaces = await proxmoxService.getLXCInterfaces(instance.vmid);
            const eth0 = interfaces.find(i => i.name === 'eth0');
            const ip = eth0 && eth0.inet ? eth0.inet.split('/')[0] : null;

            if (!ip || ip.startsWith('127.')) {
                return res.status(400).json({ error: "Instance must be running to generate VPN config" });
            }

            debugLog(`[VPN] Generating missing config for ${instance.id} (${ip})...`);
            const vpnData = await vpnService.createClient(ip);

            // Save to DB
            await prisma.instance.update({
                where: { id: instance.id },
                data: { vpnConfig: vpnData.config }
            });

            return res.json({ config: vpnData.config });

        } catch (genError) {
            console.error("Auto-generate VPN error:", genError);
            return res.status(500).json({ error: "Failed to generate VPN config. Ensure VM is running." });
        }

    } catch (error) {
        console.error("Get VPN config error:", error);
        res.status(500).json({ error: "Failed to fetch VPN config" });
    }
};

module.exports = {
    createInstance,
    getInstances,
    toggleInstanceStatus,
    restartInstance,
    deleteInstance,
    getInstanceStats,
    createDomain,
    deleteDomain,
    getDomains,
    getVpnConfig

};
