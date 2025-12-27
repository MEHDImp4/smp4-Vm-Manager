const request = require('supertest');
const express = require('express');
const { prisma } = require('../../src/db');
const adminRoutes = require('../../src/routes/adminRoutes');

// Mock dependencies
jest.mock('../../src/db', () => ({
    prisma: require('jest-mock-extended').mockDeep(),
}));
jest.mock('../../src/services/proxmox.service');
jest.mock('../../src/services/email.service');
jest.mock('../../src/services/vpn.service');
jest.mock('../../src/services/cloudflare.service');

// Mock pagination
jest.mock('../../src/utils/pagination.utils', () => ({
    paginate: jest.fn().mockResolvedValue({
        data: [],
        meta: { total: 0, page: 1, lastPage: 1 }
    })
}));

// Mock middlewares to control auth/admin status
jest.mock('../../src/middlewares/authMiddleware', () => ({
    verifyToken: (req, res, next) => {
        req.user = { id: 1, role: 'admin' };
        next();
    }
}));

jest.mock('../../src/middlewares/adminMiddleware', () => (req, res, next) => next());

const app = express();
app.use(express.json());
app.use('/api/admin', adminRoutes);

describe('Admin Routes', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /api/admin/users', () => {
        it('should return all users', async () => {
            // Mock paginate response
            const { paginate } = require('../../src/utils/pagination.utils');
            paginate.mockResolvedValue({
                data: [{ id: 1, name: 'Admin', role: 'admin' }],
                meta: { total: 1, page: 1, lastPage: 1 }
            });

            const response = await request(app).get('/api/admin/users');
            expect(response.status).toBe(200);
            expect(response.body.data).toHaveLength(1);
        });
    });

    describe('PUT /api/admin/users/:id', () => {
        it('should update user', async () => {
            // Setup update mock
            prisma.user.update.mockResolvedValue({ id: 2, points: 500 }); // Mock on the imported prisma instance

            const response = await request(app)
                .put('/api/admin/users/2')
                .send({ points: 500 });

            if (response.status === 500) {
                console.error(response.body);
            }
            expect(response.status).toBe(200);
            expect(prisma.user.update).toHaveBeenCalled();
        });
    });

    describe('DELETE /api/admin/users/:id', () => {
        it('should delete user', async () => {
            // Mock finding user to delete (logic inside deleteUser usually checks existence)
            prisma.user.findUnique.mockResolvedValue({ id: 2, name: 'DelUser', email: 'del@test.com', role: 'user', instances: [] });
            prisma.deletedUser.create.mockResolvedValue({});
            prisma.instance.findMany.mockResolvedValue([]); // Important: Must be array
            // Other deletes
            prisma.pointTransaction.deleteMany.mockResolvedValue({ count: 0 });
            prisma.dailySpin.deleteMany.mockResolvedValue({ count: 0 });
            prisma.socialClaim.deleteMany.mockResolvedValue({ count: 0 });
            prisma.user.delete.mockResolvedValue({ id: 2 });
            prisma.$transaction.mockImplementation((callback) => callback(prisma));

            const response = await request(app).delete('/api/admin/users/2').send({ reason: 'Bye' });
            expect(response.status).toBe(200);
        });
    });

    describe('GET /api/admin/instances', () => {
        it('should return instances', async () => {
            const { paginate } = require('../../src/utils/pagination.utils');
            paginate.mockResolvedValue({
                data: [],
                meta: { total: 0, page: 1, lastPage: 1 }
            });

            const response = await request(app).get('/api/admin/instances');
            expect(response.status).toBe(200);
        });
    });
});
