const axios = require('axios');
const log = require('./logger.service');

class ProxmoxService {
    constructor() {
        this.baseURL = process.env.PROXMOX_URL;
        this.apiToken = process.env.PROXMOX_API_TOKEN; // Format: USER@REALM!TOKENID=UUID
        this.node = process.env.PROXMOX_NODE || 'pve';

        if (!this.baseURL || !this.apiToken) {
            log.warn('Proxmox URL or API Token not configured');
        }

        this.client = axios.create({
            baseURL: this.baseURL,
            headers: {
                'Authorization': `PVEAPIToken=${this.apiToken}`,
                'Content-Type': 'application/json',
            },
            httpsAgent: new (require('https').Agent)({
                rejectUnauthorized: process.env.PROXMOX_SSL_VERIFY === 'true' // Defaults to false if not set
            })
        });

        if (process.env.PROXMOX_SSL_VERIFY !== 'true') {
            log.warn('Proxmox SSL verification is disabled (PROXMOX_SSL_VERIFY!=true). This is insecure for production.');
        }
    }

    async getLXCList() {
        try {
            const response = await this.client.get(`/api2/json/nodes/${this.node}/lxc`);
            return response.data.data;
        } catch (error) {
            log.error('Error fetching LXC list:', error.response?.data || error.message);
            throw new Error('Failed to get LXC list');
        }
    }

    async getNextVmid() {
        try {
            const response = await this.client.get('/api2/json/cluster/nextid');
            return response.data.data;
        } catch (error) {
            log.error('Error fetching next VMID:', error.response?.data || error.message);
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
            log.error('Error cloning LXC:', error.response?.data || error.message);
            throw new Error(`Failed to clone LXC ${templateId}`);
        }
    }

    async configureLXC(vmid, config) {
        try {
            // Endpoint: /nodes/{node}/lxc/{vmid}/config
            const response = await this.client.put(`/api2/json/nodes/${this.node}/lxc/${vmid}/config`, config);
            return response.data.data;
        } catch (error) {
            log.error('Error configuring LXC:', error.response?.data || error.message);
            throw new Error(`Failed to configure LXC ${vmid}`);
        }
    }

    async getLXCConfig(vmid) {
        try {
            // Endpoint: /nodes/{node}/lxc/{vmid}/config
            const response = await this.client.get(`/api2/json/nodes/${this.node}/lxc/${vmid}/config`);
            return response.data.data;
        } catch (error) {
            log.error('Error getting LXC config:', error.response?.data || error.message);
            throw new Error(`Failed to get config for LXC ${vmid}`);
        }
    }

    async startLXC(vmid) {
        try {
            const response = await this.client.post(`/api2/json/nodes/${this.node}/lxc/${vmid}/status/start`, {});
            return response.data.data;
        } catch (error) {
            log.error('Error starting LXC:', error.response?.data || error.message);
            throw new Error(`Failed to start LXC ${vmid}`);
        }
    }

    async stopLXC(vmid) {
        try {
            const response = await this.client.post(`/api2/json/nodes/${this.node}/lxc/${vmid}/status/stop`, {});
            return response.data.data;
        } catch (error) {
            log.error('Error stopping LXC:', error.response?.data || error.message);
            throw new Error(`Failed to stop LXC ${vmid}`);
        }
    }

    async rebootLXC(vmid) {
        try {
            const response = await this.client.post(`/api2/json/nodes/${this.node}/lxc/${vmid}/status/reboot`, {});
            return response.data.data;
        } catch (error) {
            log.error('Error rebooting LXC:', error.response?.data || error.message);
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
            log.error(`Error getting interfaces for LXC ${vmid}: ${error.message}`); // Don't throw, just return empty
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
            log.error('Error deleting LXC:', error.response?.data || error.message);
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

    // ==================== SNAPSHOT METHODS ====================

    /**
     * Create a snapshot of an LXC container
     * @param {number} vmid - Container VMID
     * @param {string} snapname - Snapshot name (alphanumeric, no spaces)
     * @param {string} description - Optional description
     */
    async createLXCSnapshot(vmid, snapname, description = '') {
        try {
            const response = await this.client.post(
                `/api2/json/nodes/${this.node}/lxc/${vmid}/snapshot`,
                { snapname, description }
            );
            return response.data.data; // Returns task UPID
        } catch (error) {
            log.error('Error creating LXC snapshot:', error.response?.data || error.message);
            throw new Error(`Failed to create snapshot for LXC ${vmid}`);
        }
    }

    /**
     * List all snapshots of an LXC container
     * @param {number} vmid - Container VMID
     */
    async listLXCSnapshots(vmid) {
        try {
            const response = await this.client.get(
                `/api2/json/nodes/${this.node}/lxc/${vmid}/snapshot`
            );
            // Filter out 'current' which is not a real snapshot
            return (response.data.data || []).filter(snap => snap.name !== 'current');
        } catch (error) {
            log.error('Error listing LXC snapshots:', error.response?.data || error.message);
            throw new Error(`Failed to list snapshots for LXC ${vmid}`);
        }
    }

    /**
     * Delete a snapshot from an LXC container
     * @param {number} vmid - Container VMID
     * @param {string} snapname - Snapshot name to delete
     */
    async deleteLXCSnapshot(vmid, snapname) {
        try {
            const response = await this.client.delete(
                `/api2/json/nodes/${this.node}/lxc/${vmid}/snapshot/${snapname}`
            );
            return response.data.data; // Returns task UPID
        } catch (error) {
            log.error('Error deleting LXC snapshot:', error.response?.data || error.message);
            throw new Error(`Failed to delete snapshot ${snapname} for LXC ${vmid}`);
        }
    }

    /**
     * Rollback an LXC container to a snapshot
     * @param {number} vmid - Container VMID
     * @param {string} snapname - Snapshot name to rollback to
     */
    async rollbackLXCSnapshot(vmid, snapname) {
        try {
            const response = await this.client.post(
                `/api2/json/nodes/${this.node}/lxc/${vmid}/snapshot/${snapname}/rollback`,
                {}
            );
            return response.data.data; // Returns task UPID
        } catch (error) {
            log.error('Error rolling back LXC snapshot:', error.response?.data || error.message);
            throw new Error(`Failed to rollback to snapshot ${snapname} for LXC ${vmid}`);
        }
    }

    /**
     * Create a vzdump backup of an LXC container (for download)
     * @param {number} vmid - Container VMID
     * @param {string} storage - Storage to save backup (default: local)
     * @param {string} mode - Backup mode: snapshot, suspend, or stop
     */
    async createLXCBackup(vmid, storage = 'local', mode = 'snapshot') {
        try {
            const response = await this.client.post(
                `/api2/json/nodes/${this.node}/vzdump`,
                {
                    vmid: vmid,
                    storage: storage,
                    mode: mode,
                    compress: 'zstd'
                }
            );
            return response.data.data; // Returns task UPID
        } catch (error) {
            log.error('Error creating LXC backup:', error.response?.data || error.message);
            throw new Error(`Failed to create backup for LXC ${vmid}`);
        }
    }

    /**
     * List backups for a specific VMID
     * @param {string} storage - Storage name (default: local)
     * @param {number} vmid - Optional VMID to filter
     */
    async listBackups(storage = 'local', vmid = null) {
        try {
            const response = await this.client.get(
                `/api2/json/nodes/${this.node}/storage/${storage}/content`,
                { params: { content: 'backup' } }
            );
            let backups = response.data.data || [];
            if (vmid) {
                backups = backups.filter(b => b.vmid === vmid);
            }
            return backups;
        } catch (error) {
            log.error('Error listing backups:', error.response?.data || error.message);
            throw new Error('Failed to list backups');
        }
    }

    /**
     * Delete a backup file
     * @param {string} storage - Storage name
     * @param {string} volid - Volume ID of the backup
     */
    async deleteBackup(storage, volid) {
        try {
            const response = await this.client.delete(
                `/api2/json/nodes/${this.node}/storage/${storage}/content/${encodeURIComponent(volid)}`
            );
            return response.data.data;
        } catch (error) {
            log.error('Error deleting backup:', error.response?.data || error.message);
            throw new Error(`Failed to delete backup ${volid}`);
        }
    }

    /**
     * Get download URL/info for a backup file
     * Note: Proxmox API requires direct file access; this returns the volid for download
     * @param {string} storage - Storage name
     * @param {string} volid - Volume ID
     */
    async getBackupDownloadTicket(volid) {
        try {
            // Request a download ticket for the file
            const response = await this.client.post(
                `/api2/json/nodes/${this.node}/storage/local/file-restore/download`,
                { volume: volid, filepath: '/' }
            );
            return response.data.data;
        } catch (error) {
            // Fallback: return direct volume path
            log.warn('Download ticket not available, using direct path');
            return { volid };
        }
    }

    /**
     * Delete a volume (backup, disk, etc)
     * @param {string} volid - Volume ID
     */
    async deleteVolume(volid) {
        // Parse volid to get storage and file. Format: storage:type/file
        // E.g., local:backup/vzdump-lxc-100...
        const parts = volid.split(':');
        if (parts.length < 2) throw new Error('Invalid volid format');
        const storage = parts[0];
        // Ensure path uses encoded volid

        try {
            const response = await this.client.delete(
                `/api2/json/nodes/${this.node}/storage/${storage}/content/${encodeURIComponent(volid)}`
            );
            return response.data.data;
        } catch (error) {
            log.error('Error deleting volume:', error.response?.data || error.message);
            throw new Error(`Failed to delete volume ${volid}`);
        }
    }
    /**
     * Add a firewall rule to an LXC container
     * @param {number} vmid - Container VMID
     * @param {object} rule - Rule configuration (e.g. { type: 'in', action: 'ACCEPT', dport: 22, enable: 1 })
     */
    async addFirewallRule(vmid, rule) {
        try {
            const response = await this.client.post(
                `/api2/json/nodes/${this.node}/lxc/${vmid}/firewall/rules`,
                rule
            );
            return response.data.data;
        } catch (error) {
            log.error('Error adding firewall rule:', error.response?.data || error.message);
            throw new Error(`Failed to add firewall rule for LXC ${vmid}`);
        }
    }

    /**
     * Set firewall options for an LXC container
     * @param {number} vmid - Container VMID
     * @param {object} options - Firewall options (e.g. { enable: 1 })
     */
    async setFirewallOptions(vmid, options) {
        try {
            const response = await this.client.put(
                `/api2/json/nodes/${this.node}/lxc/${vmid}/firewall/options`,
                options
            );
            return response.data.data;
        } catch (error) {
            log.error('Error setting firewall options:', error.response?.data || error.message);
            throw new Error(`Failed to set firewall options for LXC ${vmid}`);
        }
    }
    /**
     * Get Proxmox Node Status (CPU, RAM, Uptime, etc.)
     */
    async getNodeStatus() {
        try {
            const response = await this.client.get(`/api2/json/nodes/${this.node}/status`);
            return response.data.data;
        } catch (error) {
            log.error('Error getting node status:', error.response?.data || error.message);
            throw new Error('Failed to get node status');
        }
    }
}

// ============================================================================
// Circuit Breaker Wrapper
// ============================================================================

const { wrapWithBreaker } = require('../utils/circuit-breaker.utils');

const proxmoxInstance = new ProxmoxService();

// Wrap critical methods with circuit breaker
const wrappedService = {
    // Read operations - with fallback to empty/null
    getLXCList: wrapWithBreaker(
        () => proxmoxInstance.getLXCList(),
        'getLXCList', 'proxmox',
        () => [] // Fallback: empty list
    ),
    getLXCStatus: wrapWithBreaker(
        (vmid) => proxmoxInstance.getLXCStatus(vmid),
        'getLXCStatus', 'proxmox'
    ),
    getLXCInterfaces: wrapWithBreaker(
        (vmid) => proxmoxInstance.getLXCInterfaces(vmid),
        'getLXCInterfaces', 'proxmox',
        () => [] // Fallback: no interfaces
    ),
    getNodeStatus: wrapWithBreaker(
        () => proxmoxInstance.getNodeStatus(),
        'getNodeStatus', 'proxmox'
    ),
    getNextVmid: wrapWithBreaker(
        () => proxmoxInstance.getNextVmid(),
        'getNextVmid', 'proxmox'
    ),
    getLXCConfig: wrapWithBreaker(
        (vmid) => proxmoxInstance.getLXCConfig(vmid),
        'getLXCConfig', 'proxmox'
    ),

    // Write operations - no fallback (must fail)
    cloneLXC: wrapWithBreaker(
        (templateId, newVmid, hostname, storage) => proxmoxInstance.cloneLXC(templateId, newVmid, hostname, storage),
        'cloneLXC', 'proxmox'
    ),
    configureLXC: wrapWithBreaker(
        (vmid, config) => proxmoxInstance.configureLXC(vmid, config),
        'configureLXC', 'proxmox'
    ),
    startLXC: wrapWithBreaker(
        (vmid) => proxmoxInstance.startLXC(vmid),
        'startLXC', 'proxmox'
    ),
    stopLXC: wrapWithBreaker(
        (vmid) => proxmoxInstance.stopLXC(vmid),
        'stopLXC', 'proxmox'
    ),
    rebootLXC: wrapWithBreaker(
        (vmid) => proxmoxInstance.rebootLXC(vmid),
        'rebootLXC', 'proxmox'
    ),
    deleteLXC: wrapWithBreaker(
        (vmid) => proxmoxInstance.deleteLXC(vmid),
        'deleteLXC', 'proxmox'
    ),

    // Snapshot methods
    createLXCSnapshot: wrapWithBreaker(
        (vmid, snapname, description) => proxmoxInstance.createLXCSnapshot(vmid, snapname, description),
        'createLXCSnapshot', 'proxmox'
    ),
    listLXCSnapshots: wrapWithBreaker(
        (vmid) => proxmoxInstance.listLXCSnapshots(vmid),
        'listLXCSnapshots', 'proxmox',
        () => [] // Fallback
    ),
    deleteLXCSnapshot: wrapWithBreaker(
        (vmid, snapname) => proxmoxInstance.deleteLXCSnapshot(vmid, snapname),
        'deleteLXCSnapshot', 'proxmox'
    ),
    rollbackLXCSnapshot: wrapWithBreaker(
        (vmid, snapname) => proxmoxInstance.rollbackLXCSnapshot(vmid, snapname),
        'rollbackLXCSnapshot', 'proxmox'
    ),

    // Backup methods
    createLXCBackup: wrapWithBreaker(
        (vmid, storage, mode) => proxmoxInstance.createLXCBackup(vmid, storage, mode),
        'createLXCBackup', 'proxmox'
    ),
    listBackups: wrapWithBreaker(
        (storage, vmid) => proxmoxInstance.listBackups(storage, vmid),
        'listBackups', 'proxmox',
        () => [] // Fallback
    ),
    deleteBackup: wrapWithBreaker(
        (storage, volid) => proxmoxInstance.deleteBackup(storage, volid),
        'deleteBackup', 'proxmox'
    ),
    getBackupDownloadTicket: wrapWithBreaker(
        (volid) => proxmoxInstance.getBackupDownloadTicket(volid),
        'getBackupDownloadTicket', 'proxmox'
    ),
    deleteVolume: wrapWithBreaker(
        (volid) => proxmoxInstance.deleteVolume(volid),
        'deleteVolume', 'proxmox'
    ),

    // Firewall methods
    addFirewallRule: wrapWithBreaker(
        (vmid, rule) => proxmoxInstance.addFirewallRule(vmid, rule),
        'addFirewallRule', 'proxmox'
    ),
    setFirewallOptions: wrapWithBreaker(
        (vmid, options) => proxmoxInstance.setFirewallOptions(vmid, options),
        'setFirewallOptions', 'proxmox'
    ),

    // Pass-through for task waiting (uses internal polling)
    waitForTask: (upid) => proxmoxInstance.waitForTask(upid),

    // Expose internals for testing
    get client() { return proxmoxInstance.client; },
    set client(val) { proxmoxInstance.client = val; },
    get node() { return proxmoxInstance.node; },
};

module.exports = wrappedService;
