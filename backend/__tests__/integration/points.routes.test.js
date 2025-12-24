jest.mock('../../src/db', () => ({
  prisma: require('jest-mock-extended').mockDeep(),
}));
jest.mock('../../src/middlewares/authMiddleware', () => ({
  verifyToken: (req, res, next) => {
    req.user = { id: 'user1', email: 'test@test.com' };
    next();
  },
  isAdmin: (req, res, next) => next(),
}));

jest.mock('../../src/services/email.service', () => ({
  sendEmail: jest.fn().mockResolvedValue({}),
}));

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

  describe('POST /api/points/spin', () => {
    it('should spin and potentially earn points', async () => {
      // Mock necessary database calls
      prisma.user.findUnique.mockResolvedValue({ isVerified: true });
      prisma.dailySpin.findFirst.mockResolvedValue(null); // No previous spin
      prisma.$transaction.mockResolvedValue([
        { points: 100 }, // user update result
        { id: 'spin1' }, // dailySpin create result
        { id: 'tx1' }    // transaction create result
      ]);

      const response = await request(app)
        .post('/api/points/spin')
        .set('Authorization', 'Bearer token');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('points');
      expect(response.body.success).toBe(true);
    });

    it('should return 400 if already spun today', async () => {
      prisma.user.findUnique.mockResolvedValue({ isVerified: true });
      prisma.dailySpin.findFirst.mockResolvedValue({
        id: 'spin_prev',
        spinDate: new Date()
      });

      const response = await request(app)
        .post('/api/points/spin')
        .set('Authorization', 'Bearer token');

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Vous devez attendre 24h entre chaque tour !');
    });
  });
});
