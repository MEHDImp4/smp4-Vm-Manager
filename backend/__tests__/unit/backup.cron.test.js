
const { runBackupTask, rotateBackups, processInstanceBackup } = require('../../src/cron/backup.cron');
const { prisma } = require('../../src/db');
const proxmoxService = require('../../src/services/proxmox.service');

// Mock dependencies
jest.mock('../../src/db', () => ({
    prisma: {
        instance: {
            findMany: jest.fn(),
        },
    },
}));

jest.mock('../../src/services/proxmox.service', () => ({
    listBackups: jest.fn(),
    deleteVolume: jest.fn(),
    createLXCBackup: jest.fn(),
    waitForTask: jest.fn(),
}));

describe('Backup Cron Job', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Silence console logs during tests
        console.log = jest.fn();
        console.error = jest.fn();
    });

    describe('runBackupTask', () => {
        it('should fetch instances and process backups', async () => {
            const mockInstances = [
                { id: 1, vmid: 100, name: 'vm1' },
                { id: 2, vmid: 101, name: 'vm2' },
            ];
            prisma.instance.findMany.mockResolvedValue(mockInstances);

            // Mock listBackups to return empty for simplicity in this test
            proxmoxService.listBackups.mockResolvedValue([]);
            proxmoxService.createLXCBackup.mockResolvedValue('UPID:100:backup');

            await runBackupTask();

            expect(prisma.instance.findMany).toHaveBeenCalledWith({ where: { vmid: { not: null } } });
            // Should verify processInstanceBackup is called for each (implicitly via mock calls)
            expect(proxmoxService.listBackups).toHaveBeenCalledTimes(2);
            expect(proxmoxService.createLXCBackup).toHaveBeenCalledTimes(2);
        });

        it('should handle critical error gracefully', async () => {
            prisma.instance.findMany.mockRejectedValue(new Error('DB Error'));

            await runBackupTask();

            expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Backup task critical error'), expect.anything());
        });
    });

    describe('rotateBackups', () => {
        it('should delete old backups if count > MAX_BACKUPS (3)', async () => {
            // MAX_BACKUPS is 3. We have 4. Correct logic is: length - (3 - 1) = 4 - 2 = 2 to delete?
            // Wait, logic in code: Math.max(0, backups.length - (MAX_BACKUPS - 1));
            // If MAX=3, we want to keep 2 old ones + 1 new one = 3 total.
            // If we have 3, we delete 1 (oldest). 3 - (3-1) = 1. Correct.
            // If we have 2, we delete 0. 2 - 2 = 0. Correct.

            const vmid = 100;
            const mockBackups = [
                { volid: 'backup1', ctime: 100 }, // Oldest
                { volid: 'backup2', ctime: 200 },
                { volid: 'backup3', ctime: 300 },
            ];

            // 3 existing. Should delete 1 so we have 2 left, then create 1 -> 3 total.
            proxmoxService.deleteVolume.mockResolvedValue('UPID:delete');

            await rotateBackups(vmid, mockBackups);

            expect(proxmoxService.deleteVolume).toHaveBeenCalledTimes(1);
            expect(proxmoxService.deleteVolume).toHaveBeenCalledWith('backup1');
            expect(proxmoxService.waitForTask).toHaveBeenCalled();
        });

        it('should not delete if count is low', async () => {
            const vmid = 100;
            const mockBackups = [
                { volid: 'backup1', ctime: 100 },
                { volid: 'backup2', ctime: 200 },
            ];
            // 2 existing. Target 2. Need 0 deletes.

            await rotateBackups(vmid, mockBackups);

            expect(proxmoxService.deleteVolume).not.toHaveBeenCalled();
        });
    });

    describe('processInstanceBackup', () => {
        it('should list, rotate, and create backup', async () => {
            const instance = { vmid: 100, name: 'vm1' };
            const mockBackups = [{ volid: 'b1', ctime: 1 }];

            proxmoxService.listBackups.mockResolvedValue(mockBackups);
            proxmoxService.createLXCBackup.mockResolvedValue('UPID:create');

            await processInstanceBackup(instance);

            expect(proxmoxService.listBackups).toHaveBeenCalledWith('local', 100);
            expect(proxmoxService.createLXCBackup).toHaveBeenCalledWith(100, 'local', 'stop');
            expect(proxmoxService.waitForTask).toHaveBeenCalledWith('UPID:create');
        });

        it('should handle errors for specific instance', async () => {
            const instance = { vmid: 100, name: 'vm1' };
            proxmoxService.listBackups.mockRejectedValue(new Error('Proxmox Down'));

            await processInstanceBackup(instance);

            expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Failed to backup VM 100'), expect.anything());
        });
    });
});
