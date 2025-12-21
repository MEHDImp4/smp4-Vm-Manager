const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const proxmoxService = require('../services/proxmox.service');

const { paginate } = require('../utils/pagination.utils');

const getAllUsers = async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;

        const result = await paginate(prisma.user, {
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                points: true,
                isBanned: true,
                created_at: true,
                _count: {
                    select: { instances: true }
                }
            }
        }, { page: parseInt(page), limit: parseInt(limit) });

        res.json(result);
    } catch (error) {
        console.error("Get all users error", error);
        res.status(500).json({ error: "Failed to fetch users" });
    }
};

const emailService = require('../services/email.service');
const instanceController = require('./instanceController'); // Warning: direct import might have issues if logic is tied to req/res.
// Instead of importing instanceController (which expects req/res), we will replicate/call the service logic.
// But instance logic is complex (Cloudflare, VPN, Proxmox). 
// Best approach given constraints: Simulate req/res or copy logic.
// Let's rely on the fact that we can interact with Prisma directly and use services.

const updateUser = async (req, res) => {
    const { id } = req.params;
    const { isBanned, points, role, banReason, banDuration } = req.body;

    try {
        const data = {};
        if (typeof points === 'number') data.points = points;
        if (role) data.role = role;

        // Handle Ban Logic
        if (typeof isBanned === 'boolean') {
            data.isBanned = isBanned;
            if (isBanned) {
                // If banning, set reason and expiration
                data.banReason = banReason || "Non spécifiée";
                if (banDuration) {
                    // Duration in hours
                    const expiresAt = new Date();
                    expiresAt.setHours(expiresAt.getHours() + parseInt(banDuration));
                    data.banExpiresAt = expiresAt;
                } else {
                    data.banExpiresAt = null; // Permanent
                }
            } else {
                // Unbanning
                data.banReason = null;
                data.banExpiresAt = null;
            }
        }

        const user = await prisma.user.update({
            where: { id: parseInt(id) },
            data,
            select: { id: true, name: true, email: true, points: true, role: true, isBanned: true, banReason: true, banExpiresAt: true }
        });

        // Send Email if status changed to banned
        if (isBanned === true) {
            await emailService.sendAccountBannedEmail(user.email, user.name, user.banReason, user.banExpiresAt);
        }

        res.json(user);
    } catch (error) {
        console.error("Update user error", error);
        res.status(500).json({ error: "Failed to update user" });
    }
};

const deleteUser = async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;

    try {
        const userId = parseInt(id);

        // 1. Fetch User Data
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return res.status(404).json({ error: "User not found" });

        // 2. Archive User
        await prisma.deletedUser.create({
            data: {
                email: user.email,
                name: user.name,
                role: user.role,
                userData: JSON.stringify(user)
            }
        });

        // 3. Fetch all user instances to delete them
        const instances = await prisma.instance.findMany({
            where: { userId: user.id }
        });

        // 4. Delete each instance resources
        for (const inst of instances) {
            try {
                if (inst.vmid) {
                    await proxmoxService.stopLXC(inst.vmid).catch((e) => console.warn(`Failed to stop LXC ${inst.vmid}:`, e.message));
                    await proxmoxService.deleteLXC(inst.vmid).catch((e) => console.warn(`Failed to delete LXC ${inst.vmid}:`, e.message));
                }
                if (inst.vpnConfig) {
                    const vpnService = require('../services/vpn.service');
                    await vpnService.deleteClient(inst.vpnConfig).catch((e) => console.warn(`Failed to delete VPN client:`, e.message));
                }
                const domains = await prisma.domain.findMany({ where: { instanceId: inst.id } });
                if (domains.length > 0) {
                    const cloudflareService = require('../services/cloudflare.service');
                    const hostnames = domains.map(d => `${d.subdomain}.smp4.xyz`);
                    await cloudflareService.removeMultipleTunnelIngress(hostnames).catch((e) => console.warn(`Failed to remove Cloudflare ingress:`, e.message));
                }
                // Check if related records need manual cleanup or if onDelete Cascade handles it.
                // Instance deletion from DB:
                await prisma.instance.delete({ where: { id: inst.id } });
            } catch (cleanupError) {
                console.error(`Failed to cleanup instance ${inst.id} for user ${user.id}`, cleanupError);
            }
        }

        // 5. Send Email
        await emailService.sendAccountDeletedEmail(user.email, user.name, reason);

        // 6. Hard Delete User (Resources and dependent records should be gone or cascaded if configured)
        // Note: Prisma schema relations might need onDelete: Cascade for transactions/spins/claims 
        // OR we manually delete them. schema.prisma didn't show strict relations with Cascade for these.
        // Let's safe-delete dependent records first to avoid foreign key constraints.

        await prisma.pointTransaction.deleteMany({ where: { userId } });
        await prisma.dailySpin.deleteMany({ where: { userId } });
        await prisma.socialClaim.deleteMany({ where: { userId } });

        // Final delete
        await prisma.user.delete({ where: { id: userId } });

        res.json({ message: "User archived and permanently deleted" });
    } catch (error) {
        console.error("Delete user error", error);
        res.status(500).json({ error: "Failed to delete user" });
    }
};

const getAllInstances = async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;

        const result = await paginate(prisma.instance, {
            include: {
                user: {
                    select: { name: true, email: true }
                }
            }
        }, { page: parseInt(page), limit: parseInt(limit) });

        // Fetch IP addresses from Proxmox for online instances
        // We do this in parallel, but handle failures gracefully
        // Enhance with IP addresses
        result.data = await Promise.all(result.data.map(async (inst) => {
            let ip = "-";
            if (inst.status === 'online' && inst.vmid) {
                try {
                    const interfaces = await proxmoxService.getLXCInterfaces(inst.vmid);
                    const eth0 = interfaces.find(i => i.name === 'eth0');
                    if (eth0 && eth0.inet) {
                        ip = eth0.inet.split('/')[0];
                    }
                } catch (e) {
                    console.warn(`Failed to get network interfaces for VM ${inst.vmid}:`, e.message);
                }
            }
            return { ...inst, ip };
        }));

        res.json(result);
    } catch (error) {
        console.error("Get all instances error", error);
        res.status(500).json({ error: "Failed to fetch instances" });
    }
};

const getNodeStats = async (req, res) => {
    try {
        const stats = await proxmoxService.getNodeStatus();
        res.json(stats);
    } catch (error) {
        console.error("Get node stats error", error);
        res.status(500).json({ error: "Failed to fetch node stats" });
    }
};

const getTemplates = async (req, res) => {
    try {
        const templates = await prisma.template.findMany({
            orderBy: { points: 'asc' },
            include: { versions: true }
        });
        res.json(templates);
    } catch (error) {
        console.error("Get templates error", error);
        res.status(500).json({ error: "Failed to fetch templates" });
    }
};

const updateTemplatePrice = async (req, res) => {
    const { id } = req.params;
    const { points, oldPrice } = req.body;

    if (points === undefined || points < 0) {
        return res.status(400).json({ error: "Invalid points value" });
    }

    try {
        const template = await prisma.template.findUnique({ where: { id } });
        if (!template) return res.status(404).json({ error: "Template not found" });

        const newPoints = parseFloat(points);
        // Explicit logic:
        // If oldPrice is provided (explicitly set by admin), use it.
        // If oldPrice is explicitly null (admin unchecked promo), clear it.
        // We expect req.body.oldPrice to be passed.

        const updated = await prisma.template.update({
            where: { id },
            data: {
                points: newPoints,
                oldPrice: oldPrice !== undefined ? oldPrice : template.oldPrice // If undefined, preserve. If null/value, update.
            }
        });

        res.json(updated);
    } catch (error) {
        console.error("Update template error", error);
        res.status(500).json({ error: "Failed to update template" });
    }
};


module.exports = {
    getAllUsers,
    updateUser,
    deleteUser,
    getAllInstances,
    getNodeStats,
    getTemplates,
    updateTemplatePrice
};
