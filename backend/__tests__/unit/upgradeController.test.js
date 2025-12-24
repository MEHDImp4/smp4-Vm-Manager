const upgradeController = require('../../src/controllers/upgradeController');
const { prisma } = require('../../src/db');

// Mock dependencies
jest.mock('../../src/db', () => {
    const mockPrisma = {
        upgradePack: {
            create: jest.fn(),
            findMany: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            findUnique: jest.fn(),
        },
        instance: {
            findUnique: jest.fn(),
            update: jest.fn(),
        },
        instanceUpgrade: {
            create: jest.fn(),
        },
    };
    // Circular reference for transaction
    mockPrisma.$transaction = jest.fn((callback) => callback(mockPrisma));

    return { prisma: mockPrisma };
});

describe('Upgrade Controller Unit Tests', () => {
    let req, res;

    beforeEach(() => {
        jest.clearAllMocks();
        req = {
            params: {},
            body: {},
            user: { userId: 'user1', name: 'testuser' },
        };
        res = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis(),
        };
    });

    describe('createPack', () => {
        it('should create a new pack', async () => {
            req.body = { name: '+1 CPU', type: 'cpu', amount: 1, pointsCost: 10 };
            const mockPack = { id: 1, ...req.body };
            prisma.upgradePack.create.mockResolvedValue(mockPack);

            await upgradeController.createPack(req, res);

            expect(prisma.upgradePack.create).toHaveBeenCalledWith({
                data: {
                    name: '+1 CPU',
                    type: 'cpu',
                    amount: 1,
                    pointsCost: 10
                }
            });
            expect(res.json).toHaveBeenCalledWith(mockPack);
        });

        it('should return 400 for invalid type', async () => {
            req.body = { name: '+1 GPU', type: 'gpu', amount: 1, pointsCost: 100 };
            await upgradeController.createPack(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ error: "Invalid type. Must be cpu, ram, or storage." });
        });
    });

    describe('getPacks', () => {
        it('should return active packs', async () => {
            const mockPacks = [{ id: 1, name: 'Pack 1' }];
            prisma.upgradePack.findMany.mockResolvedValue(mockPacks);

            await upgradeController.getPacks(req, res);

            expect(prisma.upgradePack.findMany).toHaveBeenCalledWith({
                where: { isActive: true },
                orderBy: { pointsCost: 'asc' }
            });
            expect(res.json).toHaveBeenCalledWith(mockPacks);
        });
    });

    describe('applyUpgrade', () => {
        const mockInstance = {
            id: 'inst1',
            userId: 'user1',
            cpu: '1 vCPU',
            ram: '2 GB',
            storage: '20 GB',
            pointsPerDay: 5
        };
        const mockPack = {
            id: 10,
            type: 'cpu',
            amount: 1,
            pointsCost: 2,
            isActive: true
        };

        it('should apply upgrade successfully', async () => {
            req.params.instanceId = 'inst1';
            req.body.packId = 10;

            prisma.instance.findUnique.mockResolvedValue(mockInstance);
            prisma.upgradePack.findUnique.mockResolvedValue(mockPack);

            // Mock transaction results
            prisma.instanceUpgrade.create.mockResolvedValue({ id: 'upg1' });
            prisma.instance.update.mockResolvedValue({ ...mockInstance, cpu: '2 vCPU', pointsPerDay: 7 });

            await upgradeController.applyUpgrade(req, res);

            expect(prisma.instance.findUnique).toHaveBeenCalledWith({
                where: { id: 'inst1' },
                include: { upgrades: true }
            });
            expect(prisma.upgradePack.findUnique).toHaveBeenCalledWith({ where: { id: 10 } });

            // Check transaction call
            expect(prisma.$transaction).toHaveBeenCalled();
        });

        it('should fail if instance not owned by user', async () => {
            req.params.instanceId = 'inst1';
            req.body.packId = 10;
            prisma.instance.findUnique.mockResolvedValue({ ...mockInstance, userId: 'otherUser' });

            await upgradeController.applyUpgrade(req, res);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({ error: "Access denied: You do not own this instance" });
        });

        it('should fail if pack is inactive', async () => {
            req.params.instanceId = 'inst1';
            req.body.packId = 10;
            prisma.instance.findUnique.mockResolvedValue(mockInstance);
            prisma.upgradePack.findUnique.mockResolvedValue({ ...mockPack, isActive: false });

            await upgradeController.applyUpgrade(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ error: "Pack invalid or inactive" });
        });
    });
});
