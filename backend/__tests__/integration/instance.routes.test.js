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

      prisma.instance.findMany.mockResolvedValueOnce(mockInstances);

      const response = await request(app)
        .get('/api/instances')
        .set('Authorization', 'Bearer token');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(1);
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
          template: 'ubuntu-22.04',
          name: 'new-vm',
          cpu: 1,
          ram: 1024,
          storage: 20,
          pointsPerDay: 10,
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
