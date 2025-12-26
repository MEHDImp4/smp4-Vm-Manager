/**
 * Instance Controller
 * HTTP request handling - delegates business logic to services
 */

const { prisma } = require('../db');
const instanceService = require('../services/instance.service');
const domainService = require('../services/domain.service');
const log = require('../services/logger.service');

/**
 * POST /instances - Create a new instance
 */
const createInstance = async (req, res) => {
    try {
        let { name, templateId, os } = req.body;
        const userId = req.user.id;
        const role = req.user.role;



        // Fetch User
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        // Get Template
        const templateVersion = await prisma.templateVersion.findUnique({
            where: {
                templateId_os: {
                    templateId: templateId.toLowerCase(),
                    os: 'default'
                }
            },
            include: {
                template: true
            }
        });

        if (!templateVersion) {
            return res.status(400).json({ error: "Invalid template or OS combination. Please contact admin." });
        }

        const { cpu, ram, storage, points } = templateVersion.template;

        // Allocate VMID and create DB record
        const { instance, vmid, rootPassword } = await instanceService.allocateInstance({
            name,
            template: templateId,
            cpu,
            ram,
            storage,
            pointsPerDay: role === 'admin' ? 0 : points,
            userId
        });

        // Respond immediately
        res.status(201).json(instance);

        // Start background provisioning
        instanceService.provisionInBackground({
            instance,
            vmid,
            rootPassword,
            templateVersion,
            user
        });

    } catch (error) {
        log.error("Create instance error:", error);
        res.status(500).json({ error: "Failed to create instance" });
    }
};

/**
 * GET /instances - Get all user instances (paginated)
 */
const getInstances = async (req, res) => {
    try {
        const userId = req.user.id;
        const { page = 1, limit = 20 } = req.query;

        const { paginate } = require('../utils/pagination.utils');
        const result = await paginate(prisma.instance, {
            where: { userId },
            orderBy: { created_at: 'desc' },
            include: {
                domains: {
                    where: { isPaid: true },
                    select: { id: true, isPaid: true }
                }
            }
        }, { page: parseInt(page), limit: parseInt(limit) });

        // Add paidDomainsCount to each instance
        result.data = result.data.map(inst => ({
            ...inst,
            paidDomainsCount: inst.domains?.length || 0,
            domains: undefined
        }));

        res.json(result);
    } catch (error) {
        log.error("Get instances error:", error);
        res.status(500).json({ error: "Failed to fetch instances" });
    }
};

/**
 * PUT /instances/:id/toggle - Toggle instance status (start/stop)
 */
const toggleInstanceStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const instance = await instanceService.getInstanceWithOwner(id, userId);
        if (!instance) {
            return res.status(404).json({ error: "Instance not found" });
        }

        const updatedInstance = await instanceService.toggleStatus(instance);
        res.json(updatedInstance);
    } catch (error) {
        log.error("Toggle status error:", error);
        res.status(500).json({ error: "Failed to update status" });
    }
};

/**
 * POST /instances/:id/restart - Restart instance
 */
const restartInstance = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const instance = await instanceService.getInstanceWithOwner(id, userId);
        if (!instance) {
            return res.status(404).json({ error: "Instance not found" });
        }

        await instanceService.restartInstance(instance);
        res.json({ message: "Instance restarting" });
    } catch (error) {
        log.error("Restart instance error:", error);
        res.status(500).json({ error: "Failed to restart instance" });
    }
};

/**
 * DELETE /instances/:id - Delete instance
 */
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

        await instanceService.deleteInstance(instance);
        res.json({ message: "Instance deleted" });
    } catch (error) {
        log.error("Delete instance error:", error);
        res.status(500).json({ error: "Failed to delete instance" });
    }
};

/**
 * GET /instances/:id/stats - Get instance statistics
 */
const getInstanceStats = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const instance = await prisma.instance.findUnique({ where: { id } });
        if (!instance || instance.userId !== userId) {
            return res.status(404).json({ error: "Instance not found" });
        }

        try {
            const stats = await instanceService.getInstanceStats(instance);
            res.json(stats);

            // Sync DB status in background
            if (stats.status && stats.status !== 'unknown') {
                instanceService.syncDbStatus(instance, stats.status).catch(err => {
                    log.warn("Failed to sync status:", err);
                });
            }
        } catch (proxmoxError) {
            log.error(`Proxmox stats error for ${instance.vmid}:`, proxmoxError.message);
            return res.json({
                cpu: 0,
                ram: 0,
                storage: 0,
                ip: null,
                status: 'unknown'
            });
        }
    } catch (error) {
        log.error("Get stats error:", error);
        res.status(500).json({ error: "Failed to get stats" });
    }
};

/**
 * POST /instances/:id/domains - Create domain
 */
const createDomain = async (req, res) => {
    try {
        const { id } = req.params;
        const { port, customSuffix, isPaid } = req.body;
        const userId = req.user.id;

        if (!port) {
            return res.status(400).json({ error: "Port is required" });
        }

        // Fetch instance with domains
        const instance = await prisma.instance.findUnique({
            where: { id },
            include: { domains: true }
        });

        const user = await prisma.user.findUnique({ where: { id: userId } });

        if (!instance || instance.userId !== userId || !user) {
            return res.status(404).json({ error: "Instance or User not found" });
        }

        const domain = await domainService.createDomain({
            instance,
            user,
            port,
            customSuffix,
            isPaidRequest: isPaid
        });

        res.status(201).json(domain);
    } catch (error) {
        log.error("Create domain error:", error);

        if (error.requiresPurchase) {
            return res.status(400).json({
                error: error.message,
                requiresPurchase: true,
                message: "You can purchase additional domains for 2 points/day"
            });
        }

        res.status(error.statusCode || 500).json({ error: error.message });
    }
};

/**
 * DELETE /instances/:id/domains/:domainId - Delete domain
 */
const deleteDomain = async (req, res) => {
    try {
        const { id, domainId } = req.params;
        const userId = req.user.id;

        const domain = await domainService.getDomainWithOwner(domainId, id, userId);
        if (!domain) {
            return res.status(404).json({ error: "Domain not found" });
        }

        await domainService.deleteDomain(domain);
        res.json({ message: "Domain deleted successfully" });
    } catch (error) {
        log.error("Delete domain error:", error);
        res.status(500).json({ error: "Failed to delete domain" });
    }
};

/**
 * GET /instances/:id/domains - Get instance domains
 */
const getDomains = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const domains = await domainService.getInstanceDomains(id, userId);
        if (domains === null) {
            return res.status(404).json({ error: "Instance not found" });
        }

        res.json(domains);
    } catch (error) {
        log.error("Get domains error:", error);
        res.status(500).json({ error: "Failed to fetch domains" });
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
    // getVpnConfig removed
    // resetPassword removed,
    togglePower: toggleInstanceStatus // Alias for consistency with route
};
