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

const request = require('supertest');
const express = require('express');
const { prisma } = require('../../src/db');
const templateRoutes = require('../../src/routes/templateRoutes');

const app = express();
app.use(express.json());
app.use((req, res, next) => {
  req.user = { id: 'user1', email: 'test@test.com' };
  next();
});
app.use('/api/templates', templateRoutes);

describe('Template Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/templates', () => {
    it('should get all templates', async () => {
      const mockTemplates = [
        {
          id: 'template1',
          name: 'Ubuntu 22.04',
          description: 'Ubuntu LTS',
          versions: [
            { id: 'tv1', version: '1.0', proxmoxId: 100 },
          ],
        },
      ];

      prisma.template.count.mockResolvedValueOnce(1);
      prisma.template.findMany.mockResolvedValueOnce(mockTemplates);

      const response = await request(app).get('/api/templates');

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data[0].name).toBe('Ubuntu 22.04');
    });

    it('should return empty data array if no templates exist', async () => {
      prisma.template.count.mockResolvedValueOnce(0);
      prisma.template.findMany.mockResolvedValueOnce([]);

      const response = await request(app).get('/api/templates');

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual([]);
      expect(response.body.pagination).toBeDefined();
    });
  });


});
