const { prisma } = require('../db');
const log = require('../services/logger.service');

// ADMIN: Create a new upgrade pack
exports.createPack = async (req, res) => {
    try {
        const { name, type, amount, pointsCost } = req.body;

        if (!['cpu', 'ram', 'storage'].includes(type)) {
            return res.status(400).json({ error: "Invalid type. Must be cpu, ram, or storage." });
        }

        const pack = await prisma.upgradePack.create({
            data: {
                name,
                type,
                amount: parseInt(amount),
                pointsCost: parseFloat(pointsCost),
            }
        });

        res.json(pack);
    } catch (error) {
        log.error("Create pack error:", error);
        res.status(500).json({ error: "Failed to create pack" });
    }
};

// PUBLIC/USER: Get available packs
exports.getPacks = async (req, res) => {
    try {
        const packs = await prisma.upgradePack.findMany({
            where: { isActive: true },
            orderBy: { pointsCost: 'asc' }
        });
        res.json(packs);
    } catch (error) {
        log.error("Get packs error:", error);
        res.status(500).json({
            error: "Failed to fetch packs",
            details: error.message,
            stack: error.stack,
            isPrismaError: !!error.code
        });
    }
};

// ADMIN: Update pack (e.g. deactivate)
exports.updatePack = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, isActive, pointsCost } = req.body;

        const pack = await prisma.upgradePack.update({
            where: { id: parseInt(id) },
            data: {
                name,
                isActive,
                pointsCost: pointsCost ? parseFloat(pointsCost) : undefined
            }
        });
        res.json(pack);
    } catch (error) {
        res.status(500).json({ error: "Failed to update pack" });
    }
};

// ADMIN: Delete pack
exports.deletePack = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.upgradePack.delete({ where: { id: parseInt(id) } });
        res.json({ message: "Pack deleted" });
    } catch (error) {
        res.status(500).json({ error: "Failed to delete pack" });
    }
};

// USER: Apply upgrade to instance
exports.applyUpgrade = async (req, res) => {
    try {
        const { instanceId } = req.params; // instance ID
        const { packId } = req.body;
        const userId = req.user.userId;

        log.info(`[Upgrade] Request for instance ${instanceId} by user ${userId} with pack ${packId}`);

        // 1. Verify instance ownership
        const instance = await prisma.instance.findUnique({
            where: { id: instanceId },
            include: { upgrades: true }
        });

        if (!instance) {
            log.error(`[Upgrade] Instance ${instanceId} not found in DB`);
            return res.status(404).json({ error: `Instance ${instanceId} not found` });
        }

        if (instance.userId !== userId) {
            log.error(`[Upgrade] Instance ${instanceId} belongs to user ${instance.userId}, not ${userId}`);
            return res.status(403).json({ error: "Access denied: You do not own this instance" });
        }

        // 2. Get pack details
        const pack = await prisma.upgradePack.findUnique({
            where: { id: parseInt(packId) }
        });

        if (!pack || !pack.isActive) {
            return res.status(400).json({ error: "Pack invalid or inactive" });
        }

        // 3. Update detailed specs based on type
        let newCpu = instance.cpu;
        let newRam = instance.ram;
        // Don't modify storage string yet if not changing storage
        let newStorage = instance.storage;

        if (pack.type === 'cpu') {
            // Logic: "2 vCPU" -> 2 + amount
            const currentCpu = parseInt(instance.cpu.split(' ')[0]) || 1;
            newCpu = `${currentCpu + pack.amount} vCPU`;
        } else if (pack.type === 'ram') {
            // Logic: "4 GB" -> 4 + amount (if amount is in GB) or convert
            const currentRam = parseInt(instance.ram.split(' ')[0]) || 2;
            newRam = `${currentRam + pack.amount} GB`;
        } else if (pack.type === 'storage') {
            const currentStorage = parseInt(instance.storage.split(' ')[0]) || 20;
            newStorage = `${currentStorage + pack.amount} GB`;
        }

        // 4. Update Instance: add cost, update specs, record upgrade
        const updatedInstance = await prisma.$transaction(async (tx) => {
            // Create record
            await tx.instanceUpgrade.create({
                data: {
                    instanceId: instance.id,
                    upgradePackId: pack.id
                }
            });

            // Update instance
            return await tx.instance.update({
                where: { id: instance.id },
                data: {
                    pointsPerDay: {
                        increment: pack.pointsCost
                    },
                    cpu: newCpu,
                    ram: newRam,
                    storage: newStorage
                }
            });
        });

        // TODO: Call Proxmox Service to actually resize the VM?
        // For now, we update DB state. User asked for "manage upgrade packs", effectively.

        res.json({ message: "Upgrade applied", instance: updatedInstance });

    } catch (error) {
        log.error("Apply upgrade error:", error);
        res.status(500).json({
            error: "Failed to apply upgrade",
            details: error.message,
            stack: error.stack
        });
    }
};
