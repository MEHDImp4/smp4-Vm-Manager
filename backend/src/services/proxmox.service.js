const ProxmoxService = require('./proxmox.core');

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
