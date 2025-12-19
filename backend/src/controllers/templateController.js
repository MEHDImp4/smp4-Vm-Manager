const { prisma } = require('../db');

const getAllTemplates = async (req, res) => {
    try {
        const templates = await prisma.template.findMany({
            orderBy: { points: 'asc' }
        });
        res.json(templates);
    } catch (error) {
        console.error("Get templates error:", error);
        res.status(500).json({ error: "Failed to fetch templates" });
    }
};

module.exports = { getAllTemplates };
