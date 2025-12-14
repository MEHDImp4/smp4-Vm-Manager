/**
 * Configuration for VM Templates and Presets
 */
module.exports = {
    // IDs allowed to be used as templates for creating new Containers
    // These must match the IDs in the Proxmox server
    // IDs allowed to be used as templates for creating new Containers
    // These must match the IDs in the Proxmox server
    VALID_TEMPLATE_IDS: [100, 101, 102, 103, 104, 105],

    // IDs of containers/templates to HIDE from the main dashboard list
    // Usually you want to hide the templates themselves so users don't accidently try to start them
    HIDDEN_VM_IDS: [100, 101, 102, 103, 104, 105]
};
