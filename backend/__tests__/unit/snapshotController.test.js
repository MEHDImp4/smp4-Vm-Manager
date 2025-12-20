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

        it('should handle proxmox deletion failure gracefully', async () => {
            req.params.id = 'inst1';
            req.body = { name: 'snapNew' };

            const oldSnap = { id: 'snapOld', proxmoxSnapName: 'snap_old' };
            prisma.instance.findFirst.mockResolvedValue({
                id: 'inst1',
                vmid: 100,
                userId: 'user1',
                snapshots: [oldSnap, { id: 's2' }, { id: 's3' }]
            });

            proxmoxService.deleteLXCSnapshot.mockRejectedValue(new Error('Proxmox error'));
            proxmoxService.createLXCSnapshot.mockResolvedValue('UPID:create');

            await snapshotController.createSnapshot(req, res);

            expect(proxmoxService.deleteLXCSnapshot).toHaveBeenCalled();
            // Should continue to delete from DB
            expect(prisma.snapshot.delete).toHaveBeenCalledWith({ where: { id: 'snapOld' } });
            expect(res.status).toHaveBeenCalledWith(201);
        });

        describe('getSnapshots', () => {
            it('should return list of snapshots and help sync with Proxmox', async () => {
                req.params.id = 'inst1';

                // Mock Instance
                prisma.instance.findFirst.mockResolvedValue({ id: 'inst1', vmid: 100, userId: 'user1' });

                // Mock Proxmox Snapshots (Source of Truth)
                const mockProxmoxSnaps = [
                    { name: 'snap1', snaptime: 1672531200, description: 'Test Snap' }, // Existing in DB
                    { name: 'snap2', snaptime: 1672617600, description: 'New Snap' }   // Missing in DB
                ];
                proxmoxService.listLXCSnapshots.mockResolvedValue(mockProxmoxSnaps);

                // Mock DB Snapshots (Initial State)
                const mockDbSnapsInitial = [
                    { id: 's1', proxmoxSnapName: 'snap1', name: 'Test Snap' },
                    { id: 's3', proxmoxSnapName: 'snap3', name: 'Deleted in Proxmox' } // Should be deleted
                ];
                prisma.snapshot.findMany.mockResolvedValueOnce(mockDbSnapsInitial); // First call for sync logic

                // Mock DB FindMany for Final Return
                const mockDbSnapsFinal = [
                    { id: 's1', proxmoxSnapName: 'snap1' },
                    { id: 's2', proxmoxSnapName: 'snap2' }
                ];
                prisma.snapshot.findMany.mockResolvedValueOnce(mockDbSnapsFinal); // Second call for return

                await snapshotController.getSnapshots(req, res);

                // Verification of Sync Logic
                // 1. Should create 'snap2'
                expect(prisma.snapshot.create).toHaveBeenCalledWith(expect.objectContaining({
                    data: expect.objectContaining({ proxmoxSnapName: 'snap2' })
                }));

                // 2. Should delete 's3' (snap3) because it's missing in Proxmox list
                expect(prisma.snapshot.delete).toHaveBeenCalledWith({ where: { id: 's3' } });

                expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ snapshots: mockDbSnapsFinal }));
            });

            it('should handle sync errors gracefully and return db snapshots', async () => {
                req.params.id = 'inst1';
                prisma.instance.findFirst.mockResolvedValue({ id: 'inst1', vmid: 100, userId: 'user1' });

                proxmoxService.listLXCSnapshots.mockRejectedValue(new Error('Proxmox Down'));

                const mockSnaps = [{ id: 's1' }];
                prisma.snapshot.findMany.mockResolvedValue(mockSnaps);

                await snapshotController.getSnapshots(req, res);

                // Should ignore sync error and return what we have
                expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ snapshots: mockSnaps }));
            });

            it('should return 404 if instance not found', async () => {
                req.params.id = 'inst1';
                prisma.instance.findFirst.mockResolvedValue(null);
                await snapshotController.getSnapshots(req, res);
                expect(res.status).toHaveBeenCalledWith(404);
            });

            it('should handle db errors', async () => {
                req.params.id = 'inst1';
                prisma.instance.findFirst.mockRejectedValue(new Error('DB Error'));
                await snapshotController.getSnapshots(req, res);
                expect(res.status).toHaveBeenCalledWith(500);
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
            it('should return 404 if instance not found', async () => {
                req.params = { id: 'inst1', snapId: 'snap1' };
                prisma.instance.findFirst.mockResolvedValue(null);
                await snapshotController.restoreSnapshot(req, res);
                expect(res.status).toHaveBeenCalledWith(404);
            });

            it('should return 404 if snapshot not found', async () => {
                req.params = { id: 'inst1', snapId: 'snap1' };
                prisma.instance.findFirst.mockResolvedValue({ id: 'inst1', userId: 'user1' });
                prisma.snapshot.findFirst.mockResolvedValue(null);
                await snapshotController.restoreSnapshot(req, res);
                expect(res.status).toHaveBeenCalledWith(404);
            });

            it('should return 400 if instance has no VMID', async () => {
                req.params = { id: 'inst1', snapId: 'snap1' };
                prisma.instance.findFirst.mockResolvedValue({ id: 'inst1', userId: 'user1' }); // No VMID
                prisma.snapshot.findFirst.mockResolvedValue({ id: 'snap1' });
                await snapshotController.restoreSnapshot(req, res);
                expect(res.status).toHaveBeenCalledWith(400);
            });

            it('should stop instance if running before restore', async () => {
                req.params = { id: 'inst1', snapId: 'snap1' };
                prisma.instance.findFirst.mockResolvedValue({ id: 'inst1', vmid: 100, userId: 'user1' });
                prisma.snapshot.findFirst.mockResolvedValue({ id: 'snap1', proxmoxSnapName: 'snap_123' });

                proxmoxService.getLXCStatus.mockResolvedValue({ status: 'running' });
                proxmoxService.stopLXC.mockResolvedValue('UPID:stop');
                proxmoxService.rollbackLXCSnapshot.mockResolvedValue('UPID:roll');
                proxmoxService.startLXC.mockResolvedValue('UPID:start');

                await snapshotController.restoreSnapshot(req, res);

                expect(proxmoxService.stopLXC).toHaveBeenCalled();
                expect(proxmoxService.rollbackLXCSnapshot).toHaveBeenCalled();
                expect(proxmoxService.startLXC).toHaveBeenCalled();
            });

            it('should handle errors', async () => {
                req.params = { id: 'inst1' };
                prisma.instance.findFirst.mockRejectedValue(new Error('DB Error'));
                await snapshotController.restoreSnapshot(req, res);
                expect(res.status).toHaveBeenCalledWith(500);
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
            it('should return 404 if instance not found', async () => {
                req.params = { id: 'inst1', snapId: 'snap1' };
                prisma.instance.findFirst.mockResolvedValue(null);
                await snapshotController.deleteSnapshot(req, res);
                expect(res.status).toHaveBeenCalledWith(404);
            });

            it('should return 404 if snapshot not found', async () => {
                req.params = { id: 'inst1', snapId: 'snap1' };
                prisma.instance.findFirst.mockResolvedValue({ id: 'inst1', userId: 'user1' });
                prisma.snapshot.findFirst.mockResolvedValue(null);
                await snapshotController.deleteSnapshot(req, res);
                expect(res.status).toHaveBeenCalledWith(404);
            });

            it('should handle proxmox deletion error', async () => {
                req.params = { id: 'inst1', snapId: 'snap1' };
                prisma.instance.findFirst.mockResolvedValue({ id: 'inst1', vmid: 100, userId: 'user1' });
                prisma.snapshot.findFirst.mockResolvedValue({ id: 'snap1', proxmoxSnapName: 's1' });
                proxmoxService.deleteLXCSnapshot.mockRejectedValue(new Error("Prox Error"));

                await snapshotController.deleteSnapshot(req, res);

                // Should still delete from DB
                expect(prisma.snapshot.delete).toHaveBeenCalledWith({ where: { id: 'snap1' } });
                expect(res.json).toHaveBeenCalled();
            });

            it('should handle generic errors', async () => {
                req.params = { id: 'inst1' };
                prisma.instance.findFirst.mockRejectedValue(new Error('DB Error'));
                await snapshotController.deleteSnapshot(req, res);
                expect(res.status).toHaveBeenCalledWith(500);
            });
        });

        describe('downloadSnapshot', () => {
            it('should prepare download successfully', async () => {
                req.params = { id: 'inst1', snapId: 'snap1' };
                prisma.instance.findFirst.mockResolvedValue({ id: 'inst1', vmid: 100, userId: 'user1' });
                prisma.snapshot.findFirst.mockResolvedValue({ id: 'snap1' });

                proxmoxService.createLXCBackup.mockResolvedValue('UPID:bkp');
                proxmoxService.listBackups.mockResolvedValue([{ volid: 'backup1.tar', ctime: 123456, size: 100 }]);

                await snapshotController.downloadSnapshot(req, res);

                expect(proxmoxService.createLXCBackup).toHaveBeenCalled();
                expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                    backup: expect.objectContaining({ volid: 'backup1.tar' })
                }));
            });

            it('should return 404 if instance not found', async () => {
                req.params = { id: 'inst1', snapId: 'snap1' };
                prisma.instance.findFirst.mockResolvedValue(null);
                await snapshotController.downloadSnapshot(req, res);
                expect(res.status).toHaveBeenCalledWith(404);
            });

            it('should return 404 if snapshot not found', async () => {
                req.params = { id: 'inst1', snapId: 'snap1' };
                prisma.instance.findFirst.mockResolvedValue({ id: 'inst1', userId: 'user1' });
                prisma.snapshot.findFirst.mockResolvedValue(null);
                await snapshotController.downloadSnapshot(req, res);
                expect(res.status).toHaveBeenCalledWith(404);
            });

            it('should return 400 if no VMID', async () => {
                req.params = { id: 'inst1', snapId: 'snap1' };
                prisma.instance.findFirst.mockResolvedValue({ id: 'inst1', userId: 'user1' }); // No vmid
                prisma.snapshot.findFirst.mockResolvedValue({ id: 'snap1' });
                await snapshotController.downloadSnapshot(req, res);
                expect(res.status).toHaveBeenCalledWith(400);
            });

            it('should handle backup creation failure (no backup found)', async () => {
                req.params = { id: 'inst1', snapId: 'snap1' };
                prisma.instance.findFirst.mockResolvedValue({ id: 'inst1', vmid: 100, userId: 'user1' });
                prisma.snapshot.findFirst.mockResolvedValue({ id: 'snap1' });
                proxmoxService.createLXCBackup.mockResolvedValue('UPID:bkp');
                proxmoxService.listBackups.mockResolvedValue([]); // Return empty list

                await snapshotController.downloadSnapshot(req, res);

                expect(res.status).toHaveBeenCalledWith(500);
            });

            it('should handle errors', async () => {
                req.params = { id: 'inst1' };
                prisma.instance.findFirst.mockRejectedValue(new Error('DB Error'));
                await snapshotController.downloadSnapshot(req, res);
                expect(res.status).toHaveBeenCalledWith(500);
            });
        });

        describe('deleteBackup', () => {
            it('should delete backup successfully', async () => {
                req.params = { id: 'inst1' };
                req.query = { volid: 'local:backup/vzdump-lxc-100-2023_01_01.tar.zst' };

                prisma.instance.findFirst.mockResolvedValue({ id: 'inst1', vmid: 100, userId: 'user1' });
                proxmoxService.deleteVolume.mockResolvedValue();

                await snapshotController.deleteBackup(req, res);

                expect(proxmoxService.deleteVolume).toHaveBeenCalledWith('local:backup/vzdump-lxc-100-2023_01_01.tar.zst');
                expect(res.json).toHaveBeenCalledTimes(1);
            });

            it('should reject if volid missing', async () => {
                req.params = { id: 'inst1' };
                req.query = {};
                await snapshotController.deleteBackup(req, res);
                expect(res.status).toHaveBeenCalledWith(400);
            });

            it('should return 404 if instance not found', async () => {
                req.params = { id: 'inst1' };
                req.query = { volid: 'foo' };
                prisma.instance.findFirst.mockResolvedValue(null);
                await snapshotController.deleteBackup(req, res);
                expect(res.status).toHaveBeenCalledWith(404);
            });

            it('should reject if volid does not contain vmid (security)', async () => {
                req.params = { id: 'inst1' };
                req.query = { volid: 'local:backup/vzdump-lxc-999-hack.tar' }; // VMID 999 vs 100
                prisma.instance.findFirst.mockResolvedValue({ id: 'inst1', vmid: 100, userId: 'user1' });

                await snapshotController.deleteBackup(req, res);
                expect(res.status).toHaveBeenCalledWith(403);
            });

            it('should handle error during deletion', async () => {
                req.params = { id: 'inst1' };
                req.query = { volid: 'local:backup/vzdump-lxc-100-ok.tar' };
                prisma.instance.findFirst.mockResolvedValue({ id: 'inst1', vmid: 100, userId: 'user1' });
                proxmoxService.deleteVolume.mockRejectedValue(new Error('Del Error'));

                await snapshotController.deleteBackup(req, res);
                expect(res.status).toHaveBeenCalledWith(500);
            });
        });
    });
});

