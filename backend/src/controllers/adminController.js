const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const proxmoxService = require('../services/proxmox.service');

const getAllUsers = async (req, res) => {
    try {
        const users = await prisma.user.findMany({
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
        });
        res.json(users);
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
        // 1. Soft Delete User
        const user = await prisma.user.update({
            where: { id: parseInt(id) },
            data: {
                isDeleted: true,
                isBanned: true, // Also ban to be safe
                banReason: reason || "Account deleted"
            }
        });

        // 2. Fetch all user instances to delete them
        const instances = await prisma.instance.findMany({
            where: { userId: user.id }
        });

        // 3. Delete each instance resources
        // We import the logic from services directly to avoid circular dependency or req/res mocking issues if possible.
        // However, to save time and ensure consistency, we can use the existing services (proxmox, vpn, cloudflare)
        // just like instanceController does.

        // Helper to cleanup instance (duplicated logic from instanceController, but safer than mocking)
        for (const inst of instances) {
            try {
                if (inst.vmid) {
                    await proxmoxService.stopLXC(inst.vmid).catch(() => { });
                    // Wait a bit? No, proceed.
                    await proxmoxService.deleteLXC(inst.vmid).catch(() => { });
                }
                if (inst.vpnConfig) {
                    const vpnService = require('../services/vpn.service');
                    await vpnService.deleteClient(inst.vpnConfig).catch(() => { });
                }
                const domains = await prisma.domain.findMany({ where: { instanceId: inst.id } });
                if (domains.length > 0) {
                    const cloudflareService = require('../services/cloudflare.service');
                    const hostnames = domains.map(d => `${d.subdomain}.smp4.xyz`);
                    await cloudflareService.removeMultipleTunnelIngress(hostnames).catch(() => { });
                }
                await prisma.instance.delete({ where: { id: inst.id } });
            } catch (cleanupError) {
                console.error(`Failed to cleanup instance ${inst.id} for user ${user.id}`, cleanupError);
            }
        }

        // 4. Send Email
        await emailService.sendAccountDeletedEmail(user.email, user.name, reason);

        res.json({ message: "User deleted and resources cleaned up" });
    } catch (error) {
        console.error("Delete user error", error);
        res.status(500).json({ error: "Failed to delete user" });
    }
};

const getAllInstances = async (req, res) => {
    try {
        const instances = await prisma.instance.findMany({
            include: {
                user: {
                    select: { name: true, email: true }
                }
            }
        });
        res.json(instances);
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

module.exports = {
    getAllUsers,
    updateUser,
    deleteUser,
    getAllInstances,
    getNodeStats
};
