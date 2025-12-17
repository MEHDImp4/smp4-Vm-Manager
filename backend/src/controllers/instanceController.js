const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const proxmoxService = require('../services/proxmox.service');
const sshService = require('../services/ssh.service');
const crypto = require('crypto');
const systemOs = require('os');

const createInstance = async (req, res) => {
    try {
        const { name, template, cpu, ram, storage, pointsPerDay, os } = req.body;
        const userId = req.user.id;

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
        console.log(`Allocated VMID ${vmid} for instance ${name}`);

        // Generate Technical Hostname: [UserID]-[UserName]-[Template]-[InstanceID]
        // Sanitize user name (remove spaces, special chars)
        const sanitizedUser = user.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        // We'll use the instance ID later, so generate a temp hostname first
        // The final hostname will be set after instance creation

        // Generate Root Password
        const rootPassword = crypto.randomBytes(8).toString('hex'); // 16 chars hex

        // 3. Create Database Record
        const instance = await prisma.instance.create({
            data: {
                name, // Start using user-provided friendly name
                template,
                cpu,
                ram,
                storage,
                pointsPerDay,
                status: "stopped",
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

        // 4. Background Process: Clone, Start, Configure
        (async () => {
            try {
                console.log(`[Background] Cloning VM ${vmid} from template ${templateVersion.proxmoxId} as ${technicalHostname}...`);
                // Use technicalHostname for Proxmox
                const upid = await proxmoxService.cloneLXC(templateVersion.proxmoxId, vmid, technicalHostname);

                await proxmoxService.waitForTask(upid);
                console.log(`[Background] Clone complete for ${vmid}. Starting...`);

                // Set User & Date Tag
                try {
                    const dateTag = new Date().toISOString().split('T')[0];
                    console.log(`[Background] Setting tags '${sanitizedUser},${template},${dateTag}' for ${vmid}...`);
                    await proxmoxService.configureLXC(vmid, { tags: `${sanitizedUser},${template},${dateTag}` });
                } catch (tagError) {
                    console.warn(`[Background] Failed to set tag for ${vmid}:`, tagError.message);
                    // Continue creation even if tagging fails
                }

                // Password setting via Proxmox API is not supported for LXC config in this version.
                // We will set it via SSH after boot.

                await proxmoxService.startLXC(vmid);

                await prisma.instance.update({
                    where: { id: instance.id },
                    data: { status: 'online' }
                });

                console.log(`[Background] LXC ${vmid} started.`);

                // Wait for IP and Configure 'smp4' user
                let ip = null;
                let attempts = 0;
                while (!ip && attempts < 30) { // Wait up to 60s
                    await new Promise(r => setTimeout(r, 2000));
                    const interfaces = await proxmoxService.getLXCInterfaces(vmid);
                    const eth0 = interfaces.find(i => i.name === 'eth0');
                    if (eth0 && eth0.inet) {
                        ip = eth0.inet.split('/')[0];
                        if (ip === '127.0.0.1') ip = null; // Ignore loopback if reported incorrectly
                    }
                    attempts++;
                }

                if (ip) {
                    console.log(`[Background] VM ${vmid} is up at ${ip}. Configuring 'smp4' user...`);

                    // Allow SSH to come up fully (sometimes IP is ready before SSHd)
                    await new Promise(r => setTimeout(r, 10000));

                    try {
                        // 1. Enable Password Authentication & Root Login
                        await sshService.execCommand(ip, `sed -i 's/^PasswordAuthentication no/PasswordAuthentication yes/' /etc/ssh/sshd_config && sed -i 's/^#PasswordAuthentication yes/PasswordAuthentication yes/' /etc/ssh/sshd_config && sed -i 's/^#PermitRootLogin.*/PermitRootLogin yes/' /etc/ssh/sshd_config && sed -i 's/^PermitRootLogin.*/PermitRootLogin yes/' /etc/ssh/sshd_config && service ssh restart`);

                        // Wait for SSH to restart
                        await new Promise(r => setTimeout(r, 2000));

                        // 2. Create smp4 user if not exists
                        await sshService.execCommand(ip, 'id -u smp4 &>/dev/null || useradd -m -s /bin/bash smp4');

                        // 3. Add to sudo (MUST be before password change!)
                        await sshService.execCommand(ip, 'usermod -aG sudo smp4');

                        // 4. Set Password for smp4 AND force password change on first login (combined)
                        await sshService.execCommand(ip, `echo "smp4:${rootPassword}" | chpasswd && chage -d 0 smp4`);

                        // 5. Set Password for root (LAST - changes root password, locks us out)
                        await sshService.execCommand(ip, `echo "root:${rootPassword}" | chpasswd`);

                        console.log(`[Background] User 'smp4' configured successfully for ${vmid}`);

                        // 6. Security: Configure Firewall
                        try {
                            // 6a. Whitelist Backend IP for WebSocket/SSH access
                            const networks = systemOs.networkInterfaces();
                            let backendIp = process.env.BACKEND_IP; // Use configured IP first

                            if (!backendIp) {
                                // Priority: Find 192.168.x.x address first as it matches the blocked subnet
                                for (const name of Object.keys(networks)) {
                                    for (const net of networks[name]) {
                                        if (net.family === 'IPv4' && !net.internal && net.address.startsWith('192.168.')) {
                                            backendIp = net.address;
                                            break;
                                        }
                                    }
                                    if (backendIp) break;
                                }

                                // Fallback: take any external IPv4 if no 192.168.x.x found
                                if (!backendIp) {
                                    for (const name of Object.keys(networks)) {
                                        for (const net of networks[name]) {
                                            if (net.family === 'IPv4' && !net.internal) {
                                                backendIp = net.address;
                                                break;
                                            }
                                        }
                                        if (backendIp) break;
                                    }
                                }
                            }

                            if (backendIp) {
                                // SECURITY HARDENING: Block VM from attacking Unraid Admin Interfaces
                                const sensitivePorts = [22, 80, 85, 443, 8006];
                                for (const port of sensitivePorts) {
                                    await proxmoxService.addFirewallRule(vmid, {
                                        type: 'out',
                                        action: 'DROP',
                                        dest: backendIp,
                                        dport: port,
                                        proto: 'tcp',
                                        enable: 1,
                                        comment: `Block access to Host Port ${port}`
                                    });
                                }
                            }

                            // 6b. Allow ALL Inbound Traffic (User Requirement: "Access with whatever device/app")
                            // Since we enable the firewall, we must explicitly allow inbound traffic if we want it to be accessible.
                            // Users are deploying arbitrary apps (Portainer:9000, Web:80, etc.)
                            console.log(`[Background] Adding firewall rule: ACCEPT ALL INBOUND for ${vmid}...`);
                            await proxmoxService.addFirewallRule(vmid, {
                                type: 'in',
                                action: 'ACCEPT',
                                enable: 1,
                                comment: 'Allow all inbound traffic (Web, Portainer, etc.)'
                            });

                            // 6c. Allow Established Connections (Fix for Return Traffic)
                            // Crucial: If we drop outbound to LAN, we kill the response packets to the user's laptop.
                            // We must allow ESTABLISHED connections first.
                            // Note: Proxmox firewall macro 'Standard-Security-Group' often handles this, but we add explicit rule to remain safe.
                            // However, simply adding "ACCEPT dest: 0.0.0.0/0" for established isn't direct in simplistic API calls without macro awareness.
                            // Best approach for "Isolation but Accessibility":
                            // 1. Allow Outbound to Gateway/DNS (Essential) - usually covered by default policies?
                            // 2. Drop access to Private RFC1918 ranges, BUT...
                            // If the User is ON the same subnet (192.168.1.x), we CANNOT block outbound to 192.168.1.x because that blocks the response to the user.
                            // Stateful filtering handles this: "Allow if state=ESTABLISHED".
                            // But if we can't reliably configure stateful rules via this simple API logic (requires deeper Proxmox config),
                            // AND the user explicitly said "I want to access really with the IP",
                            // we must REMOVE the "Drop LAN" rule.
                            // Security Trade-off: The VM can access the user's printer/router. Correct.
                            // But the User prioritized connectivity ("fixe la connexion").
                            // We will COMMENT OUT the drop rule for now to ensure functionality.

                            // 6c. Allow LAN Access but Protect Gateway
                            // User provided the Router Admin IP: 192.168.1.254.
                            // We will DROP access to that specific IP to protect the router.
                            console.log(`[Background] Adding firewall DROP rule for Gateway 192.168.1.254 to ${vmid}...`);
                            await proxmoxService.addFirewallRule(vmid, {
                                type: 'out',
                                action: 'DROP',
                                dest: '192.168.1.254',
                                enable: 1,
                                comment: 'Block access to Gateway Admin Interface'
                            });

                            /*
                            console.log(`[Background] Adding firewall DROP rule for 192.168.1.0/24 to ${vmid}...`);
                            await proxmoxService.addFirewallRule(vmid, {
                                type: 'out',
                                action: 'DROP',
                                dest: '192.168.1.0/24',
                                enable: 1,
                                comment: 'Block access to local network'
                            });
                            */

                            console.log(`[Background] Firewall rules added for ${vmid}`);

                            // 7. Security: Enable Firewall
                            console.log(`[Background] Enabling firewall for ${vmid}...`);
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

            } catch (bgError) {
                console.error(`[Background] Creation failed for ${vmid}:`, bgError.message);
                // Optionally update status to 'error'
            }
        })();

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
        });

        res.json(instances);
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
            console.log(`Stopping instance ${instance.vmid}...`);
            await proxmoxService.stopLXC(instance.vmid);
            newStatus = "stopped";
        } else {
            console.log(`Starting instance ${instance.vmid}...`);
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

        const instance = await prisma.instance.findUnique({ where: { id } });
        if (!instance || instance.userId !== userId) {
            return res.status(404).json({ error: "Instance not found" });
        }

        // 1. Stop if running (with wait)
        if (instance.vmid) {
            try {
                console.log(`Ensuring VM ${instance.vmid} is stopped before deletion...`);
                await proxmoxService.stopLXC(instance.vmid);
                // Wait for stop to complete
                await new Promise(r => setTimeout(r, 3000));
            } catch (e) {
                console.warn(`Stop failed (maybe already stopped): ${e.message}`);
            }

            // 2. Delete from Proxmox
            try {
                console.log(`Deleting VM ${instance.vmid} from Proxmox...`);
                await proxmoxService.deleteLXC(instance.vmid);
            } catch (e) {
                console.warn(`Proxmox delete failed (VM may not exist): ${e.message}`);
                // Continue to delete from DB anyway
            }
        }

        // 3. Delete from DB
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

            // Calculate metrics
            // CPU: returns standard linux load or similar? Proxmox 'cpu' is typically usage ratio (0.0 to 1.0) or percentage?
            // "cpu": 0.00288204680856082
            // We'll treat it as ratio 0-1 and multiply on frontend or here. Let's return percentage (0-100)
            const cpuPercent = (status.cpu * 100) || 0;

            // RAM
            const ramPercent = status.maxmem ? (status.mem / status.maxmem) * 100 : 0;

            // Storage
            // Use instance.storage (GB) from DB as the source of truth for total size
            // Parse int to handle potential string formats like "12GB" or "12"
            const storageGB = instance.storage ? parseInt(instance.storage) : 0;
            const maxDiskBytes = storageGB > 0
                ? storageGB * 1024 * 1024 * 1024
                : status.maxdisk;

            const storagePercent = maxDiskBytes ? (status.disk / maxDiskBytes) * 100 : 0;

            // IP
            // interfaces is array. Find eth0.
            const eth0 = interfaces.find(i => i.name === 'eth0');
            const ip = eth0 && eth0.inet ? eth0.inet.split('/')[0] : null;

            res.json({
                cpu: parseFloat(cpuPercent.toFixed(1)),
                ram: parseFloat(ramPercent.toFixed(1)),
                storage: parseFloat(storagePercent.toFixed(1)),
                diskBytes: status.disk,
                maxDiskBytes: parseInt(maxDiskBytes),
                ip: ip,
                status: status.status,
                rootPassword: instance.rootPassword
            });

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

module.exports = { createInstance, getInstances, toggleInstanceStatus, restartInstance, deleteInstance, getInstanceStats };
