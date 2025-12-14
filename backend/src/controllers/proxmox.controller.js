const proxmoxService = require('../services/proxmox.service');
const sshService = require('../services/ssh.service');
const crypto = require('crypto');
const { VALID_TEMPLATE_IDS, HIDDEN_VM_IDS } = require('../config/presets');

class ProxmoxController {
    async createVM(req, res) {
        try {
            const { name, storage, templateId } = req.body;

            if (!name) {
                return res.status(400).json({ error: 'Container Hostname (name) is required' });
            }

            // Validate Template ID matches user presets
            const selectedTemplateId = Number(templateId);

            if (!VALID_TEMPLATE_IDS.includes(selectedTemplateId)) {
                return res.status(400).json({ error: `Invalid Template ID. Allowed: ${VALID_TEMPLATE_IDS.join(', ')}` });
            }

            // Generate random password for smp4 user
            const smp4Password = crypto.randomBytes(6).toString('hex'); // 12 chars

            // 1. Get next available VMID
            const newVmid = await proxmoxService.getNextVmid();

            console.log(`Creating LXC ${name} with ID ${newVmid} from template ${selectedTemplateId} `);
            const upid = await proxmoxService.cloneLXC(selectedTemplateId, newVmid, name, storage);

            // Respond immediately with the generated password
            res.status(202).json({
                message: 'LXC Container creation started. It will start automatically when ready.',
                vmid: newVmid,
                name: name,
                templateId: selectedTemplateId,
                task: upid,
                smp4Password: smp4Password
            });

            // Background: Wait for clone to finish, then start, then set password
            (async () => {
                try {
                    console.log(`Waiting for clone task ${upid}...`);
                    await proxmoxService.waitForTask(upid);
                    await proxmoxService.startLXC(newVmid);
                    console.log(`LXC ${newVmid} started successfully.`);

                    // Wait for IP and SSH (Polling)
                    console.log(`[LXC ${newVmid}] Waiting for network/SSH for password setup...`);
                    let ip = null;
                    for (let i = 0; i < 60; i++) { // Try for 120 seconds
                        await new Promise(r => setTimeout(r, 2000));

                        // Check IP
                        const interfaces = await proxmoxService.getLXCInterfaces(newVmid);
                        const eth0 = interfaces.find(i => i.name === 'eth0');
                        if (eth0 && eth0.inet) {
                            ip = eth0.inet.split('/')[0];

                            // Try setting password via SSH
                            try {
                                const command = `echo "smp4:${smp4Password}" | chpasswd && chage -d 0 smp4`;
                                await sshService.execCommand(ip, command);
                                console.log(`[LXC ${newVmid}] Password for smp4 set successfully.`);

                                // Update Description (Notes) with Password for persistence
                                try {
                                    await proxmoxService.configureLXC(newVmid, { description: `SMP4_PASSWORD: ${smp4Password}` });
                                    console.log(`[LXC ${newVmid}] Password saved to notes.`);
                                } catch (noteErr) {
                                    console.error(`[LXC ${newVmid}] Failed to save password to notes:`, noteErr.message);
                                }

                                // User requested NO reboot here. Just exit.
                                break;
                            } catch (sshErr) {
                                console.log(`[LXC ${newVmid}] SSH not ready yet: ${sshErr.message}`);
                            }
                        }
                    }

                    if (!ip) console.warn(`[LXC ${newVmid}] Timed out waiting for IP/SSH.`);

                } catch (bgError) {
                    console.error(`Auto-start/config failed for ${newVmid}:`, bgError.message);
                }
            })();

        } catch (error) {
            console.error(error);
            res.status(500).json({ error: error.message });
        }
    }

    async getStatus(req, res) {
        try {
            const { vmid } = req.params;
            const status = await proxmoxService.getLXCStatus(vmid);

            // Enrich with IP address if running
            let ip = null;
            if (status.status === 'running') {
                const interfaces = await proxmoxService.getLXCInterfaces(vmid);
                const eth0 = interfaces.find(i => i.name === 'eth0');
                if (eth0 && eth0.inet) {
                    ip = eth0.inet.split('/')[0]; // Valid for CIDR like 192.168.1.50/24
                }
            }

            res.json({ ...status, ipAddress: ip });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async list(req, res) {
        try {
            const vms = await proxmoxService.getLXCList();

            // Filter out templates/presets using config
            const filteredVms = vms.filter(vm => !HIDDEN_VM_IDS.includes(Number(vm.vmid)));

            // Enrich VMs with password from config/description
            const enrichedVms = await Promise.all(filteredVms.map(async (vm) => {
                try {
                    const config = await proxmoxService.getLXCConfig(vm.vmid);
                    // Parse description for "SMP4_PASSWORD: xyz"
                    const description = config.description || '';
                    const match = description.match(/SMP4_PASSWORD:\s*(\S+)/);
                    return {
                        ...vm,
                        smp4Password: match ? match[1] : null
                    };
                } catch (e) {
                    console.warn(`Failed to fetch config for VM ${vm.vmid}`);
                    return vm;
                }
            }));

            res.json(enrichedVms);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async start(req, res) {
        try {
            const { vmid } = req.params;
            await proxmoxService.startLXC(vmid);
            res.json({ message: `LXC ${vmid} start command sent` });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async stop(req, res) {
        try {
            const { vmid } = req.params;
            await proxmoxService.stopLXC(vmid);
            res.json({ message: `LXC ${vmid} stop command sent` });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async delete(req, res) {
        try {
            const { vmid } = req.params;

            // Optional: Check status first or just try to delete (Proxmox will error if running)
            await proxmoxService.deleteLXC(vmid);

            res.json({ message: `LXC ${vmid} deletion started` });
        } catch (error) {
            // Handle running VM error specifically if possible, but general error is fine
            res.status(500).json({ error: error.message });
        }
    }

    async recreate(req, res) {
        try {
            const { vmid } = req.params;
            const { name, templateId } = req.body; // Passed from frontend heuristic
            
            if (!templateId) {
                return res.status(400).json({ error: 'Template ID required for recreation' });
            }

            console.log(`Recreating LXC ${vmid} (${name}) with template ${templateId}`);

            // Respond immediately
            res.status(202).json({ message: 'Recreation started. Status will update shortly.' });

            // Background Workflow
            (async () => {
                try {
                    // 1. Stop (if running)
                    try {
                        console.log(`[Recreate ${vmid}] Stopping...`);
                        const stopTask = await proxmoxService.stopLXC(vmid);
                        await proxmoxService.waitForTask(stopTask);
                    } catch (e) {
                        // Ignore error if already stopped, but log it
                        console.warn(`[Recreate ${vmid}] Stop failed/skipped: ${e.message}`);
                    }

                    // 2. Delete
                    console.log(`[Recreate ${vmid}] Deleting...`);
                    const deleteTask = await proxmoxService.deleteLXC(vmid);
                    await proxmoxService.waitForTask(deleteTask);

                    // 3. Clone (Reuse ID)
                    console.log(`[Recreate ${vmid}] Cloning from ${templateId}...`);
                    const cloneTask = await proxmoxService.cloneLXC(templateId, vmid, name || `LXC${vmid}`, 'local-lvm');
                    await proxmoxService.waitForTask(cloneTask);

                    // 4. Start
                    console.log(`[Recreate ${vmid}] Starting...`);
                    await proxmoxService.startLXC(vmid);
                    console.log(`[Recreate ${vmid}] Complete!`);

                } catch (bgError) {
                    console.error(`[Recreate ${vmid}] FAILED:`, bgError.message);
                }
            })();

        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async getTemplates(req, res) {
        try {
            const templates = await Promise.all(VALID_TEMPLATE_IDS.map(async (id) => {
                try {
                    const config = await proxmoxService.getLXCConfig(id);
                    // Extract helpful info
                    // "memory": 512, "swap": 512, "cores": 1, "rootfs": "local-lvm:vm-100-disk-0,size=8G"
                    const rootfs = config.rootfs || '';
                    const sizeMatch = rootfs.match(/size=([^,]+)/);
                    const size = sizeMatch ? sizeMatch[1] : 'Unknown';

                    return {
                        id: id,
                        name: config.hostname || `Template ${id}`, // Fallback if hostname not set
                        memory: config.memory,
                        cores: config.cores || 1,
                        disk: size
                    };
                } catch (e) {
                    console.warn(`Failed to fetch config for template ${id}`, e.message);
                    return null;
                }
            }));

            // Filter out failed fetches
            res.json(templates.filter(t => t !== null));
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = new ProxmoxController();

