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

const updateUser = async (req, res) => {
    const { id } = req.params;
    const { isBanned, points, role } = req.body;

    try {
        const data = {};
        if (typeof isBanned === 'boolean') data.isBanned = isBanned;
        if (typeof points === 'number') data.points = points;
        if (role) data.role = role;

        const user = await prisma.user.update({
            where: { id: parseInt(id) },
            data,
            select: {
                id: true,
                name: true,
                email: true,
                points: true,
                role: true,
                isBanned: true
            }
        });
        res.json(user);
    } catch (error) {
        console.error("Update user error", error);
        res.status(500).json({ error: "Failed to update user" });
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
    getAllInstances,
    getNodeStats
};
