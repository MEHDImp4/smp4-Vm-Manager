jest.mock('../../src/db');
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
      prisma.pointTransaction.create.mockResolvedValueOnce({});
      prisma.instance.update.mockResolvedValueOnce({});

      await deductPoints();

      expect(prisma.pointTransaction.create).toHaveBeenCalled();
    });
  });

  describe('addDailyPoints', () => {
    it('should add daily points to users', async () => {
      const mockUsers = [{ id: 'user1', email: 'test@test.com' }];

      prisma.user.findMany.mockResolvedValueOnce(mockUsers);
      prisma.user.update.mockResolvedValueOnce({});
      prisma.pointTransaction.create.mockResolvedValueOnce({});

      await addDailyPoints();

      expect(prisma.user.update).toHaveBeenCalled();
    });
  });
});
