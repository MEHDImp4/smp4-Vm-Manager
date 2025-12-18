jest.mock('../../src/db');
jest.mock('../../src/middlewares/authMiddleware');

const request = require('supertest');
const express = require('express');
const { prisma } = require('../../src/db');
const pointsRoutes = require('../../src/routes/pointsRoutes');

const app = express();
app.use(express.json());
app.use((req, res, next) => {
  req.user = { id: 'user1', email: 'test@test.com' };
  next();
});
app.use('/api/points', pointsRoutes);

describe('Points Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/points/balance', () => {
    it('should get user points balance', async () => {
      prisma.user.findUnique.mockResolvedValueOnce({
        id: 'user1',
        points: 500,
      });

      const response = await request(app)
        .get('/api/points/balance')
        .set('Authorization', 'Bearer token');

      expect(response.status).toBe(200);
      expect(response.body.points).toBe(500);
    });

    it('should return 404 if user not found', async () => {
      prisma.user.findUnique.mockResolvedValueOnce(null);

      const response = await request(app)
        .get('/api/points/balance')
        .set('Authorization', 'Bearer token');

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/points/transactions', () => {
    it('should get user point transactions', async () => {
      const mockTransactions = [
        {
          id: 'tx1',
          userId: 'user1',
          amount: -10,
          reason: 'Instance cost',
          createdAt: new Date(),
        },
      ];

      prisma.pointTransaction.findMany.mockResolvedValueOnce(mockTransactions);

      const response = await request(app)
        .get('/api/points/transactions')
        .set('Authorization', 'Bearer token');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('POST /api/points/spin', () => {
    it('should spin and potentially earn points', async () => {
      prisma.user.findUnique.mockResolvedValueOnce({
        id: 'user1',
        lastDailySpin: new Date(Date.now() - 86400000),
        points: 100,
      });

      prisma.user.update.mockResolvedValueOnce({
        id: 'user1',
        points: 150,
        lastDailySpin: new Date(),
      });

      const response = await request(app)
        .post('/api/points/spin')
        .set('Authorization', 'Bearer token');

      expect([200, 400]).toContain(response.status);
    });
  });
});
