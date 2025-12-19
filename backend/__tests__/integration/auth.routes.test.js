jest.mock('../../src/db', () => ({
  prisma: require('jest-mock-extended').mockDeep(),
}));
jest.mock('bcrypt');
jest.mock('../../src/services/proxmox.service');
jest.mock('../../src/services/vpn.service');
jest.mock('../../src/services/cloudflare.service');

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
          password: 'password123',
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
          password: 'password123',
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
});
