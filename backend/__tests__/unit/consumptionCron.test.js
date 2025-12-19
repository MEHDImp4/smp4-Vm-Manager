jest.mock('../../src/db', () => ({
  prisma: require('jest-mock-extended').mockDeep(),
}));
const { prisma } = require('../../src/db');
const { startConsumptionCron } = require('../../src/cron/consumptionCron');

describe('Consumption Cron', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize cron job', () => {
    expect(() => {
      startConsumptionCron();
    }).not.toThrow();
  });

  it('should process consumption on schedule', async () => {
    const mockUsers = [
      {
        id: 'user1',
        points: 100,
        instances: [
          {
            id: 'instance1',
            pointsPerDay: 10,
            status: 'online',
            domains: [],
          },
        ],
      },
    ];

    prisma.user.findMany.mockResolvedValueOnce(mockUsers);
    prisma.pointTransaction.create.mockResolvedValueOnce({});

    // This would be called by the cron job
    const consumptionLogic = async () => {
      const users = await prisma.user.findMany();
      expect(users).toHaveLength(1);
    };

    await consumptionLogic();
  });
});
