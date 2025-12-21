const mockCron = {
    schedule: jest.fn(),
};

const mockPrisma = {
    instance: {
        findMany: jest.fn(),
        update: jest.fn(),
    },
};

const mockProxmoxService = {
    getLXCStatus: jest.fn(),
};

const mockEmailService = {
    sendEmail: jest.fn(),
};

jest.mock('node-cron', () => mockCron);
jest.mock('../../src/db', () => ({ prisma: mockPrisma }));
jest.mock('../../src/services/proxmox.service', () => mockProxmoxService);
jest.mock('../../src/services/email.service', () => mockEmailService);

const { initIdleCheckCron } = require('../../src/cron/idleCheck.cron');

describe('IdleCheck Cron', () => {
    let cronCallback;

    beforeEach(() => {
        jest.clearAllMocks();
        // Capture the cron callback
        mockCron.schedule.mockImplementation((schedule, callback) => {
            cronCallback = callback;
        });
    });

    const UPTIME_72_HOURS = 72 * 60 * 60;
    const UPTIME_80_HOURS = 80 * 60 * 60;

    it('should initialize cron job at 9 AM', () => {
        initIdleCheckCron();
        expect(mockCron.schedule).toHaveBeenCalledWith(
            '0 9 * * *',
            expect.any(Function),
            expect.objectContaining({ timezone: 'Europe/Paris' })
        );
    });

    it('should check instances and send reminders for long-running VMs', async () => {
        initIdleCheckCron();

        const mockInstance = {
            id: 'inst1',
            name: 'TestVM',
            vmid: 100,
            lastIdleNotification: null,
            user: { name: 'TestUser', email: 'user@test.com' }
        };

        mockPrisma.instance.findMany.mockResolvedValue([mockInstance]);
        mockProxmoxService.getLXCStatus.mockResolvedValue({
            status: 'running',
            uptime: UPTIME_80_HOURS
        });
        mockEmailService.sendEmail.mockResolvedValue();
        mockPrisma.instance.update.mockResolvedValue({});

        await cronCallback();

        expect(mockProxmoxService.getLXCStatus).toHaveBeenCalledWith(100);
        expect(mockEmailService.sendEmail).toHaveBeenCalledWith(
            'user@test.com',
            expect.stringContaining('Économisez'),
            expect.stringContaining('TestVM')
        );
        expect(mockPrisma.instance.update).toHaveBeenCalledWith({
            where: { id: 'inst1' },
            data: { lastIdleNotification: expect.any(Date) }
        });
    });

    it('should not send reminder if uptime is below threshold', async () => {
        initIdleCheckCron();

        const mockInstance = {
            id: 'inst1',
            name: 'TestVM',
            vmid: 100,
            lastIdleNotification: null,
            user: { name: 'TestUser', email: 'user@test.com' }
        };

        mockPrisma.instance.findMany.mockResolvedValue([mockInstance]);
        mockProxmoxService.getLXCStatus.mockResolvedValue({
            status: 'running',
            uptime: 50 * 60 * 60 // 50 hours - below 72h threshold
        });

        await cronCallback();

        expect(mockEmailService.sendEmail).not.toHaveBeenCalled();
    });

    it('should not send reminder if VM is stopped', async () => {
        initIdleCheckCron();

        const mockInstance = {
            id: 'inst1',
            name: 'TestVM',
            vmid: 100,
            lastIdleNotification: null,
            user: { name: 'TestUser', email: 'user@test.com' }
        };

        mockPrisma.instance.findMany.mockResolvedValue([mockInstance]);
        mockProxmoxService.getLXCStatus.mockResolvedValue({
            status: 'stopped',
            uptime: 0
        });

        await cronCallback();

        expect(mockEmailService.sendEmail).not.toHaveBeenCalled();
    });

    it('should skip user without email', async () => {
        initIdleCheckCron();

        const mockInstance = {
            id: 'inst1',
            vmid: 100,
            user: { name: 'NoEmailUser', email: null }
        };

        mockPrisma.instance.findMany.mockResolvedValue([mockInstance]);

        await cronCallback();

        expect(mockProxmoxService.getLXCStatus).not.toHaveBeenCalled();
        expect(mockEmailService.sendEmail).not.toHaveBeenCalled();
    });

    it('should not spam if notified recently (within 7 days)', async () => {
        initIdleCheckCron();

        const recentNotification = new Date();
        recentNotification.setDate(recentNotification.getDate() - 3); // 3 days ago

        const mockInstance = {
            id: 'inst1',
            name: 'TestVM',
            vmid: 100,
            lastIdleNotification: recentNotification,
            user: { name: 'TestUser', email: 'user@test.com' }
        };

        mockPrisma.instance.findMany.mockResolvedValue([mockInstance]);
        mockProxmoxService.getLXCStatus.mockResolvedValue({
            status: 'running',
            uptime: UPTIME_80_HOURS
        });

        await cronCallback();

        expect(mockEmailService.sendEmail).not.toHaveBeenCalled();
    });

    it('should send reminder after 7+ days since last notification', async () => {
        initIdleCheckCron();

        const oldNotification = new Date();
        oldNotification.setDate(oldNotification.getDate() - 10); // 10 days ago

        const mockInstance = {
            id: 'inst1',
            name: 'TestVM',
            vmid: 100,
            lastIdleNotification: oldNotification,
            user: { name: 'TestUser', email: 'user@test.com' }
        };

        mockPrisma.instance.findMany.mockResolvedValue([mockInstance]);
        mockProxmoxService.getLXCStatus.mockResolvedValue({
            status: 'running',
            uptime: UPTIME_80_HOURS
        });
        mockEmailService.sendEmail.mockResolvedValue();
        mockPrisma.instance.update.mockResolvedValue({});

        await cronCallback();

        expect(mockEmailService.sendEmail).toHaveBeenCalled();
    });

    it('should handle proxmox error gracefully for individual instance', async () => {
        initIdleCheckCron();

        const mockInstances = [
            { id: 'inst1', name: 'VM1', vmid: 100, lastIdleNotification: null, user: { email: 'u1@test.com' } },
            { id: 'inst2', name: 'VM2', vmid: 101, lastIdleNotification: null, user: { email: 'u2@test.com' } }
        ];

        mockPrisma.instance.findMany.mockResolvedValue(mockInstances);
        mockProxmoxService.getLXCStatus
            .mockRejectedValueOnce(new Error('Proxmox unreachable'))
            .mockResolvedValueOnce({ status: 'running', uptime: UPTIME_80_HOURS });
        mockEmailService.sendEmail.mockResolvedValue();
        mockPrisma.instance.update.mockResolvedValue({});

        await cronCallback();

        // Should still process second instance despite first failing
        expect(mockEmailService.sendEmail).toHaveBeenCalledTimes(1);
    });

    it('should handle database error gracefully', async () => {
        initIdleCheckCron();

        mockPrisma.instance.findMany.mockRejectedValue(new Error('DB Error'));

        // Should not throw
        await expect(cronCallback()).resolves.not.toThrow();
    });
});
