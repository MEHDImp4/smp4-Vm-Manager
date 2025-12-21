jest.mock('../../src/db', () => ({
  prisma: require('jest-mock-extended').mockDeep(),
}));
jest.mock('bcrypt');
jest.mock('../../src/services/proxmox.service');
jest.mock('../../src/services/vpn.service');
jest.mock('../../src/services/cloudflare.service');
jest.mock('../../src/services/email.service', () => ({
  sendVerificationCode: jest.fn().mockResolvedValue({}),
  sendAccountDeletionCode: jest.fn().mockResolvedValue({}),
}));

const request = require('supertest');
const express = require('express');
const bcrypt = require('bcrypt');
const { prisma } = require('../../src/db');
const authRoutes = require('../../src/routes/authRoutes');
const authMiddleware = require('../../src/middlewares/authMiddleware');

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

describe('Auth Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    bcrypt.hash.mockResolvedValue('hashed_password');
    bcrypt.compare.mockResolvedValue(true);
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      console.log('DEBUG PRISMA:', prisma);
      prisma.user.findUnique.mockResolvedValueOnce(null);
      prisma.user.create.mockResolvedValueOnce({
        id: 'user1',
        name: 'Test User',
        email: 'test@test.com',
        points: 100,
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test User',
          email: 'test@test.com',
          password: 'password123'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe('test@test.com');
      expect(response.body).toHaveProperty('user.token');
    });

    it('should return 400 if user already exists', async () => {
      prisma.user.findUnique.mockResolvedValueOnce({
        id: 'user1',
        email: 'test@test.com',
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test User',
          email: 'test@test.com',
          password: 'password123'
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('User already exists');
    });

    it('should return 400 if fields are missing', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@test.com',
          password: 'password123',
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('All fields are required');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login user successfully', async () => {
      prisma.user.findUnique.mockResolvedValueOnce({
        id: 'user1',
        email: 'test@test.com',
        password: '$2b$10$...', // hashed password
        name: 'Test User',
        points: 100,
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@test.com',
          password: 'password123',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('user.token');
    });

    it('should return 401 if user not found', async () => {
      prisma.user.findUnique.mockResolvedValueOnce(null);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@test.com',
          password: 'password123',
        });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Invalid credentials');
    });

    it('should return 400 if fields are missing', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@test.com',
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('All fields are required');
    });
  });

  describe('POST /api/auth/request-deletion', () => {
    it('should send deletion code to authenticated user', async () => {
      // First register and login
      prisma.user.findUnique.mockResolvedValueOnce(null);
      prisma.user.create.mockResolvedValueOnce({
        id: 'user1',
        name: 'Delete Test',
        email: 'delete@test.com',
        points: 100,
      });

      const registerRes = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Delete Test',
          email: 'delete@test.com',
          password: 'password123'
        });

      const token = registerRes.body.user.token;

      prisma.user.findUnique.mockResolvedValueOnce({
        id: 'user1',
        email: 'delete@test.com',
        name: 'Delete Test'
      });
      prisma.user.update.mockResolvedValueOnce({});

      const deletionRequestResponse = await request(app)
        .post('/api/auth/request-deletion')
        .set('Authorization', `Bearer ${token}`);

      expect(deletionRequestResponse.statusCode).toEqual(200);
      expect(deletionRequestResponse.body).toHaveProperty('message');
    });

    it('should return 401 if not authenticated', async () => {
      const deletionRequestResponse = await request(app)
        .post('/api/auth/request-deletion');

      expect(deletionRequestResponse.statusCode).toEqual(401);
    });
  });

  describe('POST /api/auth/confirm-deletion', () => {
    it('should return 400 if code is missing', async () => {
      // First register and login
      prisma.user.findUnique.mockResolvedValueOnce(null);
      prisma.user.create.mockResolvedValueOnce({
        id: 'user1',
        name: 'Delete Confirm Test',
        email: 'deleteconfirm@test.com',
        points: 100,
      });

      const registerRes = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Delete Confirm Test',
          email: 'deleteconfirm@test.com',
          password: 'password123'
        });

      const token = registerRes.body.user.token;

      const confirmDeletionResponse = await request(app)
        .post('/api/auth/confirm-deletion')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(confirmDeletionResponse.statusCode).toEqual(400);
      expect(confirmDeletionResponse.body.message).toContain('Code requis');
    });

    it('should return 400 if code is invalid', async () => {
      // First register and login
      prisma.user.findUnique.mockResolvedValueOnce(null);
      prisma.user.create.mockResolvedValueOnce({
        id: 'user1',
        name: 'Delete Invalid Test',
        email: 'deleteinvalid@test.com',
        points: 100,
      });

      const registerRes = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Delete Invalid Test',
          email: 'deleteinvalid@test.com',
          password: 'password123'
        });

      const token = registerRes.body.user.token;

      prisma.user.findUnique.mockResolvedValueOnce({
        id: 'user1',
        email: 'deleteinvalid@test.com',
        verificationCode: '123456',
        instances: []
      });

      const confirmDeletionResponse = await request(app)
        .post('/api/auth/confirm-deletion')
        .set('Authorization', `Bearer ${token}`)
        .send({ code: '999999' });

      expect(confirmDeletionResponse.statusCode).toEqual(400);
      expect(confirmDeletionResponse.body.message).toContain('Code invalide');
    });
  });
});
