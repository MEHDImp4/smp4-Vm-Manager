jest.mock('../../src/db', () => ({
  prisma: require('jest-mock-extended').mockDeep(),
}));
jest.mock('../../src/services/proxmox.service', () => {
  return jest.fn().mockImplementation(() => ({
    stopLXC: jest.fn().mockResolvedValue({}),
  }));
});
const { prisma } = require('../../src/db');
const { deductPoints, addDailyPoints } = require('../../src/services/pointsService');

describe('PointsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('deductPoints', () => {
    it('should deduct points from users with online instances', async () => {
      const mockUsers = [
        {
          id: 'user1',
          points: 1000,
          instances: [
            { id: 'instance1', pointsPerDay: 10, domains: [] },
          ],
        },
      ];

      prisma.user.findMany.mockResolvedValueOnce(mockUsers);
      prisma.pointTransaction.create.mockResolvedValueOnce({});
      prisma.user.update.mockResolvedValueOnce({});

      await deductPoints();

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            instances: { some: { status: 'online' } },
          }),
        })
      );
    });

    it('should stop instances when points reach zero', async () => {
      const mockUsers = [
        {
          id: 'user1',
          points: 1,
          instances: [
            { id: 'instance1', pointsPerDay: 1440, vmid: 100, domains: [] },
          ],
        },
      ];

      prisma.user.findMany.mockResolvedValueOnce(mockUsers);
      prisma.instance.findMany.mockResolvedValueOnce([
        { id: 'instance1', vmid: 100 }
      ]);
      prisma.instance.updateMany.mockResolvedValueOnce({});
      prisma.pointTransaction.create.mockResolvedValueOnce({});

      await deductPoints();

      expect(prisma.pointTransaction.create).toHaveBeenCalled();
    });
  });


});
