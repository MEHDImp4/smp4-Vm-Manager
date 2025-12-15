const axios = require('axios');

class ProxmoxService {
    constructor() {
        this.baseURL = process.env.PROXMOX_URL;
        this.apiToken = process.env.PROXMOX_API_TOKEN; // Format: USER@REALM!TOKENID=UUID
        this.node = process.env.PROXMOX_NODE || 'pve';

        if (!this.baseURL || !this.apiToken) {
            console.warn('Proxmox URL or API Token not configured');
        }

        this.client = axios.create({
            baseURL: this.baseURL,
            headers: {
                'Authorization': `PVEAPIToken=${this.apiToken}`,
                'Content-Type': 'application/json',
            },
            httpsAgent: new (require('https').Agent)({
                rejectUnauthorized: false // Often Proxmox uses self-signed certs
            })
        });
    }

    async getLXCList() {
        try {
            const response = await this.client.get(`/api2/json/nodes/${this.node}/lxc`);
            return response.data.data;
        } catch (error) {
            console.error('Error fetching LXC list:', error.response?.data || error.message);
            throw new Error('Failed to get LXC list');
        }
    }

    async getNextVmid() {
        try {
            const response = await this.client.get('/api2/json/cluster/nextid');
            return response.data.data;
        } catch (error) {
            console.error('Error fetching next VMID:', error.response?.data || error.message);
            throw new Error('Failed to get next VMID');
        }
    }

    async cloneLXC(templateId, newVmid, hostname, storage = 'local-lvm') {
        try {
            // Endpoint: /nodes/{node}/lxc/{vmid}/clone
            const response = await this.client.post(`/api2/json/nodes/${this.node}/lxc/${templateId}/clone`, {
                newid: newVmid,
                hostname: hostname,
                full: 1, // Full clone
                storage: storage
            });
            return response.data.data; // Returns a task UPID
        } catch (error) {
            console.error('Error cloning LXC:', error.response?.data || error.message);
            throw new Error(`Failed to clone LXC ${templateId}`);
        }
    }

    async configureLXC(vmid, config) {
        try {
            // Endpoint: /nodes/{node}/lxc/{vmid}/config
            const response = await this.client.put(`/api2/json/nodes/${this.node}/lxc/${vmid}/config`, config);
            return response.data.data;
        } catch (error) {
            console.error('Error configuring LXC:', error.response?.data || error.message);
            throw new Error(`Failed to configure LXC ${vmid}`);
        }
    }

    async getLXCConfig(vmid) {
        try {
            // Endpoint: /nodes/{node}/lxc/{vmid}/config
            const response = await this.client.get(`/api2/json/nodes/${this.node}/lxc/${vmid}/config`);
            return response.data.data;
        } catch (error) {
            console.error('Error getting LXC config:', error.response?.data || error.message);
            throw new Error(`Failed to get config for LXC ${vmid}`);
        }
    }

    async startLXC(vmid) {
        try {
            const response = await this.client.post(`/api2/json/nodes/${this.node}/lxc/${vmid}/status/start`, {});
            return response.data.data;
        } catch (error) {
            console.error('Error starting LXC:', error.response?.data || error.message);
            throw new Error(`Failed to start LXC ${vmid}`);
        }
    }

    async stopLXC(vmid) {
        try {
            const response = await this.client.post(`/api2/json/nodes/${this.node}/lxc/${vmid}/status/stop`, {});
            return response.data.data;
        } catch (error) {
            console.error('Error stopping LXC:', error.response?.data || error.message);
            throw new Error(`Failed to stop LXC ${vmid}`);
        }
    }

    async rebootLXC(vmid) {
        try {
            const response = await this.client.post(`/api2/json/nodes/${this.node}/lxc/${vmid}/status/reboot`, {});
            return response.data.data;
        } catch (error) {
            console.error('Error rebooting LXC:', error.response?.data || error.message);
            throw new Error(`Failed to reboot LXC ${vmid}`);
        }
    }

    async getLXCStatus(vmid) {
        try {
            const response = await this.client.get(`/api2/json/nodes/${this.node}/lxc/${vmid}/status/current`);
            return response.data.data;
        } catch (error) {
            // If VM doesn't exist, this might throw
            throw new Error(`Failed to get status for LXC ${vmid}`);
        }
    }

    async getLXCInterfaces(vmid) {
        try {
            // Retrieve network interfaces to find IP
            const response = await this.client.get(`/api2/json/nodes/${this.node}/lxc/${vmid}/interfaces`);
            return response.data.data;
        } catch (error) {
            console.error(`Error getting interfaces for LXC ${vmid}:`, error.message); // Don't throw, just return empty
            return [];
        }
    }
    async deleteLXC(vmid) {
        try {
            // "purge" removes configuration and disk
            // Note: LXC must be stopped first
            const response = await this.client.delete(`/api2/json/nodes/${this.node}/lxc/${vmid}?purge=1`);
            return response.data.data;
        } catch (error) {
            console.error('Error deleting LXC:', error.response?.data || error.message);
            throw new Error(`Failed to delete LXC ${vmid}`);
        }
    }

    async waitForTask(upid) {
        return new Promise((resolve, reject) => {
            const check = async () => {
                try {
                    const response = await this.client.get(`/api2/json/nodes/${this.node}/tasks/${upid}/status`);
                    const status = response.data.data;
                    if (status.status === 'stopped') {
                        if (status.exitstatus === 'OK') {
                            resolve();
                        } else {
                            reject(new Error(`Task failed with exit status ${status.exitstatus}`));
                        }
                    } else {
                        setTimeout(check, 1000);
                    }
                } catch (error) {
                    reject(error);
                }
            };
            check();
        });
    }
}

module.exports = new ProxmoxService();
