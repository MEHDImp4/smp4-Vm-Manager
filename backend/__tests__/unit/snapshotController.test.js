const snapshotController = require('../../src/controllers/snapshotController');
const { prisma } = require('../../src/db');
const proxmoxService = require('../../src/services/proxmox.service');

// Mock dependencies
jest.mock('../../src/db', () => ({
    prisma: {
        instance: {
            findFirst: jest.fn(),
        },
        snapshot: {
            create: jest.fn(),
            findMany: jest.fn(),
            count: jest.fn(),
            findFirst: jest.fn(),
            delete: jest.fn(),
        },
    },
}));

jest.mock('../../src/services/proxmox.service');

describe('Snapshot Controller Unit Tests', () => {
    let req, res;

    beforeEach(() => {
        jest.clearAllMocks();
        console.error = jest.fn(); // Silence errors
        req = {
            params: {},
            body: {},
            userId: 'user1', // Corrected from req.user.id
            user: { id: 'user1' },
        };
        res = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis(),
        };
    });

    describe('createSnapshot', () => {
        it('should create a snapshot successfully', async () => {
            req.params.id = 'inst1';
            req.body = { name: 'snap1' };

            prisma.instance.findFirst.mockResolvedValue({
                id: 'inst1',
                vmid: 100,
                userId: 'user1',
                snapshots: []
            });

            proxmoxService.createLXCSnapshot.mockResolvedValue('UPID:...');
            proxmoxService.waitForTask.mockResolvedValue();

            prisma.snapshot.create.mockResolvedValue({
                id: 'snap1',
                name: 'snap1',
                instanceId: 'inst1',
            });

            await snapshotController.createSnapshot(req, res);

            expect(proxmoxService.createLXCSnapshot).toHaveBeenCalledWith(100, expect.any(String), expect.any(String));
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalled();
        });

        it('should rotate snapshots if limit reached (delete oldest)', async () => {
            req.params.id = 'inst1';
            req.body = { name: 'snapNew' };

            const oldSnap = { id: 'snapOld', proxmoxSnapName: 'snap_old', createdAt: new Date('2023-01-01') };
            prisma.instance.findFirst.mockResolvedValue({
                id: 'inst1',
                vmid: 100,
                userId: 'user1',
                snapshots: [oldSnap, { id: 's2' }, { id: 's3' }] // 3 existing
            });

            proxmoxService.deleteLXCSnapshot.mockResolvedValue('UPID:del');
            proxmoxService.createLXCSnapshot.mockResolvedValue('UPID:create');

            await snapshotController.createSnapshot(req, res);

            expect(proxmoxService.deleteLXCSnapshot).toHaveBeenCalledWith(100, 'snap_old');
            expect(prisma.snapshot.delete).toHaveBeenCalledWith({ where: { id: 'snapOld' } });
            expect(proxmoxService.createLXCSnapshot).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(201);
        });
    });

    describe('getSnapshots', () => {
        it('should return list of snapshots', async () => {
            req.params.id = 'inst1';
            prisma.instance.findFirst.mockResolvedValue({ id: 'inst1', userId: 'user1' });

            const mockSnapshots = [{ id: 'snap1', name: 'snap1' }];
            prisma.snapshot.findMany.mockResolvedValue(mockSnapshots);

            await snapshotController.getSnapshots(req, res);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ snapshots: mockSnapshots }));
        });
    });

    describe('restoreSnapshot', () => {
        it('should restore snapshot', async () => {
            req.params = { id: 'inst1', snapId: 'snap1' };

            prisma.instance.findFirst.mockResolvedValue({ id: 'inst1', vmid: 100, userId: 'user1' });
            prisma.snapshot.findFirst.mockResolvedValue({ id: 'snap1', name: 'my-snap', proxmoxSnapName: 'snap_123', instanceId: 'inst1' });

            proxmoxService.getLXCStatus.mockResolvedValue({ status: 'stopped' });
            proxmoxService.rollbackLXCSnapshot.mockResolvedValue('UPID:...');

            await snapshotController.restoreSnapshot(req, res);

            expect(proxmoxService.rollbackLXCSnapshot).toHaveBeenCalledWith(100, 'snap_123');
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: "Snapshot restored successfully" }));
        });
    });

    describe('deleteSnapshot', () => {
        it('should delete snapshot', async () => {
            req.params = { id: 'inst1', snapId: 'snap1' };

            prisma.instance.findFirst.mockResolvedValue({ id: 'inst1', vmid: 100, userId: 'user1' });
            prisma.snapshot.findFirst.mockResolvedValue({ id: 'snap1', name: 'my-snap', proxmoxSnapName: 'snap_123', instanceId: 'inst1' });

            proxmoxService.deleteLXCSnapshot.mockResolvedValue('UPID:...');

            await snapshotController.deleteSnapshot(req, res);

            expect(proxmoxService.deleteLXCSnapshot).toHaveBeenCalledWith(100, 'snap_123');
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: "Snapshot deleted successfully" }));
        });
    });
});
