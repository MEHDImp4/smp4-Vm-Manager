const proxmoxService = require('../services/proxmox.service');

class ProxmoxController {
    async createVM(req, res) {
        try {
            const { name, storage, templateId } = req.body;

            if (!name) {
                return res.status(400).json({ error: 'Container Hostname (name) is required' });
            }

            // Validate Template ID matches user presets
            const validTemplates = [101, 102, 103];
            const selectedTemplateId = Number(templateId);

            if (!validTemplates.includes(selectedTemplateId)) {
                return res.status(400).json({ error: 'Invalid Template ID. Must be 101, 102, or 103.' });
            }

            // 1. Get next available VMID
            const newVmid = await proxmoxService.getNextVmid();

            console.log(`Creating LXC ${name} with ID ${newVmid} from template ${selectedTemplateId} `);
            await proxmoxService.cloneLXC(selectedTemplateId, newVmid, name, storage);

            res.status(202).json({
                message: 'LXC Container creation started',
                vmid: newVmid,
                name: name,
                templateId: selectedTemplateId
            });

        } catch (error) {
            console.error(error);
            res.status(500).json({ error: error.message });
        }
    }

    async getStatus(req, res) {
        try {
            const { vmid } = req.params;
            const status = await proxmoxService.getLXCStatus(vmid);
            res.json(status);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = new ProxmoxController();
