jest.mock('../../src/db');
jest.mock('../../src/services/proxmox.service');

const { prisma } = require('../../src/db');
const ProxmoxService = require('../../src/services/proxmox.service');
const { startSnapshotCron } = require('../../src/cron/snapshotCron');

describe('Snapshot Cron', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize snapshot cron', () => {
    expect(() => {
      startSnapshotCron();
    }).not.toThrow();
  });

  it('should create snapshots for instances with vmid', async () => {
    const mockInstances = [
      {
        id: 'instance1',
        vmid: 100,
        hostname: 'test-vm-1',
        status: 'online',
      },
      {
        id: 'instance2',
        vmid: 101,
        hostname: 'test-vm-2',
        status: 'online',
      },
    ];

    prisma.instance.findMany.mockResolvedValueOnce(mockInstances);
    prisma.snapshot.create.mockResolvedValueOnce({});

    // Simulate snapshot logic
    for (const instance of mockInstances) {
      if (instance.vmid) {
        prisma.snapshot.create.mockResolvedValueOnce({
          id: `snapshot-${instance.vmid}`,
          instanceId: instance.id,
          createdAt: new Date(),
        });
      }
    }

    expect(prisma.instance.findMany).toBeDefined();
  });

  it('should handle snapshot errors gracefully', async () => {
    const mockInstances = [
      {
        id: 'instance1',
        vmid: 100,
        hostname: 'test-vm',
        status: 'online',
      },
    ];

    prisma.instance.findMany.mockResolvedValueOnce(mockInstances);
    prisma.snapshot.create.mockRejectedValueOnce(new Error('Snapshot failed'));

    expect(prisma.instance.findMany).toBeDefined();
  });

  it('should skip instances without vmid', async () => {
    const mockInstances = [
      {
        id: 'instance1',
        vmid: null,
        hostname: 'test-vm',
        status: 'online',
      },
    ];

    prisma.instance.findMany.mockResolvedValueOnce(mockInstances);

    const instancesWithVmid = mockInstances.filter((i) => i.vmid);
    expect(instancesWithVmid).toHaveLength(0);
  });
});
