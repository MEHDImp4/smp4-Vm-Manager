jest.mock('../../src/db');
jest.mock('../../src/services/proxmox.service');
jest.mock('../../src/services/vpn.service');
jest.mock('../../src/services/cloudflare.service');
jest.mock('../../src/middlewares/authMiddleware');

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

  describe('GET /api/instances/:id', () => {
    it('should get instance by id', async () => {
      const mockInstance = {
        id: 'instance1',
        hostname: 'test-vm',
        status: 'online',
        vmid: 100,
        userId: 'user1',
      };

      prisma.instance.findUnique.mockResolvedValueOnce(mockInstance);

      const response = await request(app)
        .get('/api/instances/instance1')
        .set('Authorization', 'Bearer token');

      expect(response.status).toBe(200);
      expect(response.body.hostname).toBe('test-vm');
    });

    it('should return 403 if instance belongs to different user', async () => {
      const mockInstance = {
        id: 'instance1',
        userId: 'different-user',
      };

      prisma.instance.findUnique.mockResolvedValueOnce(mockInstance);

      const response = await request(app)
        .get('/api/instances/instance1')
        .set('Authorization', 'Bearer token');

      expect(response.status).toBe(403);
    });

    it('should return 404 if instance not found', async () => {
      prisma.instance.findUnique.mockResolvedValueOnce(null);

      const response = await request(app)
        .get('/api/instances/nonexistent')
        .set('Authorization', 'Bearer token');

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/instances', () => {
    it('should create new instance', async () => {
      prisma.templateVersion.findUnique.mockResolvedValueOnce({
        id: 'template1',
        proxmoxId: 100,
      });
      prisma.instance.create.mockResolvedValueOnce({
        id: 'instance1',
        hostname: 'new-vm',
        userId: 'user1',
        status: 'provisioning',
      });

      const response = await request(app)
        .post('/api/instances')
        .set('Authorization', 'Bearer token')
        .send({
          templateVersionId: 'template1',
          hostname: 'new-vm',
        });

      expect(response.status).toBe(201);
      expect(response.body.hostname).toBe('new-vm');
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

      expect(response.status).toBe(403);
    });
  });
});
