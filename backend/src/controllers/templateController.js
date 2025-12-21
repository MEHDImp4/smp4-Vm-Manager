const { prisma } = require('../db');
const { paginate } = require('../utils/pagination.utils');

const getAllTemplates = async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;

        const result = await paginate(prisma.template, {
            orderBy: { points: 'asc' }
        }, { page: parseInt(page), limit: parseInt(limit) });

        res.json(result);
    } catch (error) {
        console.error("Get templates error:", error);
        res.status(500).json({ error: "Failed to fetch templates" });
    }
};

module.exports = { getAllTemplates };
