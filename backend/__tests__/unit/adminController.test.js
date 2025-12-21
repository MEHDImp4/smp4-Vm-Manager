const mockPrisma = {
    user: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
    },
    instance: {
        findMany: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
    },
    domain: {
        findMany: jest.fn(),
    },
    template: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
    },
    deletedUser: {
        create: jest.fn(),
    },
    pointTransaction: {
        deleteMany: jest.fn(),
    },
    dailySpin: {
        deleteMany: jest.fn(),
    },
    socialClaim: {
        deleteMany: jest.fn(),
    },
};

const mockProxmoxService = {
    stopLXC: jest.fn(),
    deleteLXC: jest.fn(),
    getLXCInterfaces: jest.fn(),
    getNodeStatus: jest.fn(),
};

const mockEmailService = {
    sendAccountBannedEmail: jest.fn(),
    sendAccountDeletedEmail: jest.fn(),
};

const mockVpnService = {
    deleteClient: jest.fn(),
};

const mockCloudflareService = {
    removeMultipleTunnelIngress: jest.fn(),
};

const mockPaginate = jest.fn();

jest.mock('@prisma/client', () => ({
    PrismaClient: jest.fn(() => mockPrisma)
}));

jest.mock('../../src/services/proxmox.service', () => mockProxmoxService);
jest.mock('../../src/services/email.service', () => mockEmailService);
jest.mock('../../src/services/vpn.service', () => mockVpnService);
jest.mock('../../src/services/cloudflare.service', () => mockCloudflareService);
jest.mock('../../src/utils/pagination.utils', () => ({
    paginate: mockPaginate,
}));

const {
    getAllUsers,
    updateUser,
    deleteUser,
    getAllInstances,
    getNodeStats,
    getTemplates,
    updateTemplatePrice
} = require('../../src/controllers/adminController');

describe('Admin Controller Unit Tests', () => {
    let req, res;

    beforeEach(() => {
        jest.clearAllMocks();
        req = {
            params: {},
            body: {},
            query: { page: 1, limit: 20 },
            user: { id: 'admin1', role: 'admin' },
        };
        res = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis(),
        };
    });

    describe('getAllUsers', () => {
        it('should return paginated users', async () => {
            const mockUsers = [
                { id: 1, name: 'User1', email: 'u1@test.com' },
                { id: 2, name: 'User2', email: 'u2@test.com' },
            ];
            mockPaginate.mockResolvedValue({
                data: mockUsers,
                pagination: { page: 1, limit: 20, total: 2, totalPages: 1 }
            });

            await getAllUsers(req, res);

            expect(mockPaginate).toHaveBeenCalled();
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                data: mockUsers,
                pagination: expect.any(Object)
            }));
        });

        it('should handle errors', async () => {
            mockPaginate.mockRejectedValue(new Error('DB Error'));

            await getAllUsers(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ error: "Failed to fetch users" });
        });
    });

    describe('updateUser', () => {
        it('should update user points', async () => {
            req.params.id = '1';
            req.body = { points: 100 };
            mockPrisma.user.update.mockResolvedValue({
                id: 1, name: 'User1', points: 100
            });

            await updateUser(req, res);

            expect(mockPrisma.user.update).toHaveBeenCalledWith({
                where: { id: 1 },
                data: { points: 100 },
                select: expect.any(Object)
            });
            expect(res.json).toHaveBeenCalled();
        });

        it('should update user role', async () => {
            req.params.id = '1';
            req.body = { role: 'admin' };
            mockPrisma.user.update.mockResolvedValue({
                id: 1, name: 'User1', role: 'admin'
            });

            await updateUser(req, res);

            expect(mockPrisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({ role: 'admin' })
            }));
        });

        it('should ban user and send email', async () => {
            req.params.id = '1';
            req.body = { isBanned: true, banReason: 'Violation', banDuration: 24 };
            mockPrisma.user.update.mockResolvedValue({
                id: 1, name: 'User1', email: 'u@test.com', isBanned: true,
                banReason: 'Violation', banExpiresAt: new Date()
            });
            mockEmailService.sendAccountBannedEmail.mockResolvedValue();

            await updateUser(req, res);

            expect(mockPrisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({
                    isBanned: true,
                    banReason: 'Violation'
                })
            }));
            expect(mockEmailService.sendAccountBannedEmail).toHaveBeenCalled();
        });

        it('should unban user', async () => {
            req.params.id = '1';
            req.body = { isBanned: false };
            mockPrisma.user.update.mockResolvedValue({
                id: 1, name: 'User1', isBanned: false, banReason: null
            });

            await updateUser(req, res);

            expect(mockPrisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({
                    isBanned: false,
                    banReason: null,
                    banExpiresAt: null
                })
            }));
        });

        it('should handle errors', async () => {
            req.params.id = '1';
            req.body = { points: 100 };
            mockPrisma.user.update.mockRejectedValue(new Error('DB Error'));

            await updateUser(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    describe('deleteUser', () => {
        it('should archive and delete user', async () => {
            req.params.id = '1';
            req.body = { reason: 'Admin deletion' };

            const mockUser = { id: 1, name: 'User1', email: 'u@test.com', role: 'user' };
            mockPrisma.user.findUnique.mockResolvedValue(mockUser);
            mockPrisma.deletedUser.create.mockResolvedValue({});
            mockPrisma.instance.findMany.mockResolvedValue([]);
            mockPrisma.pointTransaction.deleteMany.mockResolvedValue({});
            mockPrisma.dailySpin.deleteMany.mockResolvedValue({});
            mockPrisma.socialClaim.deleteMany.mockResolvedValue({});
            mockPrisma.user.delete.mockResolvedValue({});
            mockEmailService.sendAccountDeletedEmail.mockResolvedValue();

            await deleteUser(req, res);

            expect(mockPrisma.deletedUser.create).toHaveBeenCalled();
            expect(mockEmailService.sendAccountDeletedEmail).toHaveBeenCalledWith('u@test.com', 'User1', 'Admin deletion');
            expect(mockPrisma.user.delete).toHaveBeenCalledWith({ where: { id: 1 } });
            expect(res.json).toHaveBeenCalledWith({ message: "User archived and permanently deleted" });
        });

        it('should return 404 if user not found', async () => {
            req.params.id = '999';
            mockPrisma.user.findUnique.mockResolvedValue(null);

            await deleteUser(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ error: "User not found" });
        });

        it('should cleanup user instances', async () => {
            req.params.id = '1';
            const mockUser = { id: 1, name: 'User1', email: 'u@test.com', role: 'user' };
            const mockInstances = [
                { id: 'inst1', vmid: 100, vpnConfig: 'vpn-config' }
            ];

            mockPrisma.user.findUnique.mockResolvedValue(mockUser);
            mockPrisma.deletedUser.create.mockResolvedValue({});
            mockPrisma.instance.findMany.mockResolvedValue(mockInstances);
            mockPrisma.domain.findMany.mockResolvedValue([{ subdomain: 'test' }]);
            mockProxmoxService.stopLXC.mockResolvedValue();
            mockProxmoxService.deleteLXC.mockResolvedValue();
            mockVpnService.deleteClient.mockResolvedValue();
            mockCloudflareService.removeMultipleTunnelIngress.mockResolvedValue();
            mockPrisma.instance.delete.mockResolvedValue({});
            mockPrisma.pointTransaction.deleteMany.mockResolvedValue({});
            mockPrisma.dailySpin.deleteMany.mockResolvedValue({});
            mockPrisma.socialClaim.deleteMany.mockResolvedValue({});
            mockPrisma.user.delete.mockResolvedValue({});
            mockEmailService.sendAccountDeletedEmail.mockResolvedValue();

            await deleteUser(req, res);

            expect(mockProxmoxService.stopLXC).toHaveBeenCalledWith(100);
            expect(mockProxmoxService.deleteLXC).toHaveBeenCalledWith(100);
            expect(mockVpnService.deleteClient).toHaveBeenCalledWith('vpn-config');
            expect(mockCloudflareService.removeMultipleTunnelIngress).toHaveBeenCalled();
        });

        it('should handle cleanup errors gracefully', async () => {
            req.params.id = '1';
            const mockUser = { id: 1, name: 'User1', email: 'u@test.com', role: 'user' };
            const mockInstances = [{ id: 'inst1', vmid: 100 }];

            mockPrisma.user.findUnique.mockResolvedValue(mockUser);
            mockPrisma.deletedUser.create.mockResolvedValue({});
            mockPrisma.instance.findMany.mockResolvedValue(mockInstances);
            mockPrisma.domain.findMany.mockResolvedValue([]);
            mockProxmoxService.stopLXC.mockRejectedValue(new Error('Stop failed'));
            mockProxmoxService.deleteLXC.mockRejectedValue(new Error('Delete failed'));
            mockPrisma.instance.delete.mockResolvedValue({});
            mockPrisma.pointTransaction.deleteMany.mockResolvedValue({});
            mockPrisma.dailySpin.deleteMany.mockResolvedValue({});
            mockPrisma.socialClaim.deleteMany.mockResolvedValue({});
            mockPrisma.user.delete.mockResolvedValue({});
            mockEmailService.sendAccountDeletedEmail.mockResolvedValue();

            await deleteUser(req, res);

            // Should still complete despite errors
            expect(res.json).toHaveBeenCalledWith({ message: "User archived and permanently deleted" });
        });

        it('should handle db errors', async () => {
            req.params.id = '1';
            mockPrisma.user.findUnique.mockRejectedValue(new Error('DB Error'));

            await deleteUser(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    describe('getAllInstances', () => {
        it('should return paginated instances with IPs', async () => {
            const mockInstances = [
                { id: 'inst1', vmid: 100, status: 'online', user: { name: 'U1' } }
            ];
            mockPaginate.mockResolvedValue({
                data: mockInstances,
                pagination: { page: 1, limit: 20, total: 1 }
            });
            mockProxmoxService.getLXCInterfaces.mockResolvedValue([
                { name: 'eth0', inet: '192.168.1.50/24' }
            ]);

            await getAllInstances(req, res);

            expect(mockPaginate).toHaveBeenCalled();
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.arrayContaining([expect.objectContaining({ ip: '192.168.1.50' })])
            }));
        });

        it('should handle proxmox errors gracefully', async () => {
            const mockInstances = [
                { id: 'inst1', vmid: 100, status: 'online' }
            ];
            mockPaginate.mockResolvedValue({
                data: mockInstances,
                pagination: { page: 1, limit: 20, total: 1 }
            });
            mockProxmoxService.getLXCInterfaces.mockRejectedValue(new Error('Proxmox error'));

            await getAllInstances(req, res);

            // Should still return with IP as "-"
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.arrayContaining([expect.objectContaining({ ip: '-' })])
            }));
        });

        it('should handle errors', async () => {
            mockPaginate.mockRejectedValue(new Error('DB Error'));

            await getAllInstances(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    describe('getNodeStats', () => {
        it('should return node stats', async () => {
            const mockStats = { cpu: 50, memory: 60, disk: 70 };
            mockProxmoxService.getNodeStatus.mockResolvedValue(mockStats);

            await getNodeStats(req, res);

            expect(res.json).toHaveBeenCalledWith(mockStats);
        });

        it('should handle errors', async () => {
            mockProxmoxService.getNodeStatus.mockRejectedValue(new Error('Proxmox error'));

            await getNodeStats(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    describe('getTemplates', () => {
        it('should return templates', async () => {
            const mockTemplates = [{ id: 't1', name: 'Ubuntu' }];
            mockPrisma.template.findMany.mockResolvedValue(mockTemplates);

            await getTemplates(req, res);

            expect(res.json).toHaveBeenCalledWith(mockTemplates);
        });

        it('should handle errors', async () => {
            mockPrisma.template.findMany.mockRejectedValue(new Error('DB Error'));

            await getTemplates(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    describe('updateTemplatePrice', () => {
        it('should update template price', async () => {
            req.params.id = 't1';
            req.body = { points: 10 };
            mockPrisma.template.findUnique.mockResolvedValue({ id: 't1', points: 5, oldPrice: null });
            mockPrisma.template.update.mockResolvedValue({ id: 't1', points: 10 });

            await updateTemplatePrice(req, res);

            expect(mockPrisma.template.update).toHaveBeenCalledWith({
                where: { id: 't1' },
                data: { points: 10, oldPrice: null } // Preserves existing oldPrice
            });
            expect(res.json).toHaveBeenCalled();
        });

        it('should handle oldPrice for promo', async () => {
            req.params.id = 't1';
            req.body = { points: 8, oldPrice: 12 };
            mockPrisma.template.findUnique.mockResolvedValue({ id: 't1', points: 10 });
            mockPrisma.template.update.mockResolvedValue({ id: 't1', points: 8, oldPrice: 12 });

            await updateTemplatePrice(req, res);

            expect(mockPrisma.template.update).toHaveBeenCalledWith({
                where: { id: 't1' },
                data: { points: 8, oldPrice: 12 }
            });
        });

        it('should return 400 for invalid points', async () => {
            req.params.id = 't1';
            req.body = { points: -5 };

            await updateTemplatePrice(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ error: "Invalid points value" });
        });

        it('should return 404 if template not found', async () => {
            req.params.id = 't999';
            req.body = { points: 10 };
            mockPrisma.template.findUnique.mockResolvedValue(null);

            await updateTemplatePrice(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
        });

        it('should handle errors', async () => {
            req.params.id = 't1';
            req.body = { points: 10 };
            mockPrisma.template.findUnique.mockRejectedValue(new Error('DB Error'));

            await updateTemplatePrice(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
        });
    });
});
