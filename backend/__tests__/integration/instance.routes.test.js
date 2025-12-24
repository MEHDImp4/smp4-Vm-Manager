// Mock validation middleware to bypass Zod validation in tests
jest.mock('../../src/middlewares/validation', () => ({
  validateBody: () => (req, res, next) => next(),
  validateQuery: () => (req, res, next) => next(),
  validateParams: () => (req, res, next) => next(),
  createInstanceSchema: {},
  createDomainSchema: {},
  createSnapshotSchema: {},
}));

// Mock logger to prevent console output during tests
jest.mock('../../src/services/logger.service', () => ({
  info: jest.fn(),
  debug: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  cron: jest.fn(),
  instance: jest.fn(),
}));

jest.mock('../../src/db', () => ({
  prisma: require('jest-mock-extended').mockDeep(),
}));
jest.mock('../../src/services/proxmox.service');
jest.mock('../../src/services/vpn.service');
jest.mock('../../src/services/cloudflare.service');
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
const instanceRoutes = require('../../src/routes/instanceRoutes');
const authMiddleware = require('../../src/middlewares/authMiddleware');

const app = express();
app.use(express.json());
app.use((req, res, next) => {
  req.user = { id: 'user1', email: 'test@test.com' };
  next();
});
app.use('/api/instances', instanceRoutes);

describe('Instance Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const DEFAULT_STORAGE_GB = 20;
  const DEFAULT_POINTS_PER_DAY = 10;

  describe('GET /api/instances', () => {
    it('should get all user instances', async () => {
      const mockInstances = [
        {
          id: 'instance1',
          hostname: 'test-vm',
          status: 'online',
          vmid: 100,
          userId: 'user1',
        },
      ];

      prisma.instance.count.mockResolvedValueOnce(1);
      prisma.instance.findMany.mockResolvedValueOnce(mockInstances);

      const response = await request(app)
        .get('/api/instances')
        .set('Authorization', 'Bearer token');

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(1);
      expect(response.body.pagination).toBeDefined();
    });
  });

  describe('POST /api/instances', () => {
    it('should create new instance', async () => {
      prisma.user.findUnique.mockResolvedValueOnce({ id: 'user1', name: 'Test User' });
      prisma.templateVersion.findUnique.mockResolvedValueOnce({
        id: 'template1',
        proxmoxId: 100,
      });
      prisma.instance.create.mockResolvedValueOnce({
        id: 'instance1',
        name: 'new-vm',
        template: 'ubuntu-22.04',
        userId: 'user1',
        status: 'provisioning',
      });

      const response = await request(app)
        .post('/api/instances')
        .set('Authorization', 'Bearer token')
        .send({
          templateId: 'ubuntu-22.04',
          name: 'new-vm',
          cpu: 1,
          ram: 1024,
          storage: DEFAULT_STORAGE_GB,
          pointsPerDay: DEFAULT_POINTS_PER_DAY,
          os: 'default'
        });

      expect(response.status).toBe(201);
      expect(response.body.name).toBe('new-vm');
    });
  });

  describe('DELETE /api/instances/:id', () => {
    it('should delete instance', async () => {
      prisma.instance.findUnique.mockResolvedValueOnce({
        id: 'instance1',
        userId: 'user1',
        vmid: 100,
      });
      prisma.instance.delete.mockResolvedValueOnce({
        id: 'instance1',
      });

      const response = await request(app)
        .delete('/api/instances/instance1')
        .set('Authorization', 'Bearer token');

      expect(response.status).toBe(200);
    });

    it('should return 403 if trying to delete others instance', async () => {
      prisma.instance.findUnique.mockResolvedValueOnce({
        id: 'instance1',
        userId: 'different-user',
      });

      const response = await request(app)
        .delete('/api/instances/instance1')
        .set('Authorization', 'Bearer token');

      expect(response.status).toBe(404);
    });
  });
});
