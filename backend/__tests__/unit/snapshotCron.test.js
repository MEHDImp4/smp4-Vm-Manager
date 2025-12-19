jest.mock('../../src/db', () => ({
  prisma: require('jest-mock-extended').mockDeep(),
}));
jest.mock('../../src/services/proxmox.service');
jest.mock('node-cron', () => ({
  schedule: jest.fn(),
}));

const cron = require('node-cron');
const { prisma } = require('../../src/db');
const proxmoxService = require('../../src/services/proxmox.service');
const { startSnapshotCron } = require('../../src/cron/snapshotCron');

describe('Snapshot Cron', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize snapshot cron', () => {
    startSnapshotCron();
    expect(cron.schedule).toHaveBeenCalledWith('0 0 * * *', expect.any(Function));
  });

  it('should run snapshot logic correctly', async () => {
    startSnapshotCron();
    const cronCallback = cron.schedule.mock.calls[0][1];

    const mockInstances = [
      { id: '1', vmid: 100 },
      { id: '2', vmid: 101 },
    ];
    prisma.instance.findMany.mockResolvedValue(mockInstances);
    proxmoxService.createLXCSnapshot.mockResolvedValue({});

    await cronCallback();

    expect(prisma.instance.findMany).toHaveBeenCalledWith({ where: { vmid: { not: null } } });
    expect(proxmoxService.createLXCSnapshot).toHaveBeenCalledTimes(2);
    expect(proxmoxService.createLXCSnapshot).toHaveBeenCalledWith(100, expect.stringContaining('Auto-'), expect.any(String));
    expect(proxmoxService.createLXCSnapshot).toHaveBeenCalledWith(101, expect.stringContaining('Auto-'), expect.any(String));
  });

  it('should handle errors for specific instances', async () => {
    startSnapshotCron();
    const cronCallback = cron.schedule.mock.calls[0][1];

    const mockInstances = [{ id: '1', vmid: 100 }];
    prisma.instance.findMany.mockResolvedValue(mockInstances);
    proxmoxService.createLXCSnapshot.mockRejectedValue(new Error("Snap failed"));

    // Should not throw
    await cronCallback();

    expect(proxmoxService.createLXCSnapshot).toHaveBeenCalled();
  });

  it('should handle general errors', async () => {
    startSnapshotCron();
    const cronCallback = cron.schedule.mock.calls[0][1];

    prisma.instance.findMany.mockRejectedValue(new Error("DB Error"));

    await cronCallback();

    expect(prisma.instance.findMany).toHaveBeenCalled();
  });
});
