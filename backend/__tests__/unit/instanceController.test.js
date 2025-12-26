const instanceController = require('../../src/controllers/instanceController');
const { prisma } = require('../../src/db');
const instanceService = require('../../src/services/instance.service');
const domainService = require('../../src/services/domain.service');

// Mock dependencies
jest.mock('../../src/db', () => ({
    prisma: {
        instance: {
            findUnique: jest.fn(),
            findFirst: jest.fn(),
            findMany: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
        },
        user: {
            findUnique: jest.fn(),
        },
        templateVersion: {
            findUnique: jest.fn(),
        },
        domain: {
            create: jest.fn(),
            findUnique: jest.fn(),
            delete: jest.fn(),
        }
    },
}));

jest.mock('../../src/services/instance.service');
jest.mock('../../src/services/domain.service');
jest.mock('../../src/services/logger.service', () => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
}));


describe('Instance Controller Unit Tests', () => {
    let req, res;

    beforeEach(() => {
        jest.clearAllMocks();
        req = {
            params: {},
            body: {},
            user: { id: 'user1', name: 'testuser' },
        };
        res = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis(),
        };
    });

    describe('toggleInstanceStatus', () => {
        it('should stop a running instance', async () => {
            req.params.id = 'inst1';
            const mockInstance = {
                id: 'inst1',
                vmid: 100,
                userId: 'user1',
                status: 'online',
            };

            instanceService.getInstanceWithOwner.mockResolvedValue(mockInstance);
            instanceService.toggleStatus.mockResolvedValue({ ...mockInstance, status: 'stopped' });

            await instanceController.toggleInstanceStatus(req, res);

            expect(instanceService.getInstanceWithOwner).toHaveBeenCalledWith('inst1', 'user1');
            expect(instanceService.toggleStatus).toHaveBeenCalledWith(mockInstance);
            expect(res.json).toHaveBeenCalled();
        });

        it('should start a stopped instance', async () => {
            req.params.id = 'inst1';
            const mockInstance = {
                id: 'inst1',
                vmid: 100,
                userId: 'user1',
                status: 'stopped',
            };

            instanceService.getInstanceWithOwner.mockResolvedValue(mockInstance);
            instanceService.toggleStatus.mockResolvedValue({ ...mockInstance, status: 'online' });

            await instanceController.toggleInstanceStatus(req, res);

            expect(instanceService.toggleStatus).toHaveBeenCalledWith(mockInstance);
        });

        it('should return 404 if instance not found', async () => {
            req.params.id = 'inst1';
            instanceService.getInstanceWithOwner.mockResolvedValue(null);

            await instanceController.toggleInstanceStatus(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: "Instance not found" }));
        });
    });

    describe('restartInstance', () => {
        it('should reboot instance', async () => {
            req.params.id = 'inst1';
            const mockInstance = {
                id: 'inst1',
                vmid: 100,
                userId: 'user1',
            };

            instanceService.getInstanceWithOwner.mockResolvedValue(mockInstance);
            instanceService.restartInstance.mockResolvedValue();

            await instanceController.restartInstance(req, res);

            expect(instanceService.restartInstance).toHaveBeenCalledWith(mockInstance);
            expect(res.json).toHaveBeenCalledWith({ message: "Instance restarting" });
        });
    });

    describe('deleteInstance', () => {
        it('should delete instance and cleanup resources', async () => {
            req.params.id = 'inst1';
            const mockInstance = {
                id: 'inst1',
                vmid: 100,
                userId: 'user1',
                vpnConfig: 'vpn-conf',
                domains: [{ subdomain: 'sub1', isPaid: false }],
            };

            prisma.instance.findUnique.mockResolvedValue(mockInstance);
            instanceService.deleteInstance.mockResolvedValue();

            await instanceController.deleteInstance(req, res);

            expect(instanceService.deleteInstance).toHaveBeenCalledWith(mockInstance);
            expect(res.json).toHaveBeenCalledWith({ message: "Instance deleted" });
        });

        it('should return 404 if instance not found', async () => {
            req.params.id = 'inst1';
            prisma.instance.findUnique.mockResolvedValue(null);

            await instanceController.deleteInstance(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
        });
    });

    const TEST_STORAGE_GB = 10;
    const TEST_ROOT_PASSWORD = 'pass';
    const TEST_CPU_PERCENT = 50.0;
    const TEST_RAM_PERCENT = 50.0;
    const TEST_STORAGE_PERCENT = 50.0;

    describe('getInstanceStats', () => {
        it('should return stats for running instance', async () => {
            req.params.id = 'inst1';
            const mockInstance = {
                id: 'inst1',
                vmid: 100,
                userId: 'user1',
                storage: TEST_STORAGE_GB,
                rootPassword: TEST_ROOT_PASSWORD,
            };

            prisma.instance.findUnique.mockResolvedValue(mockInstance);
            instanceService.getInstanceStats.mockResolvedValue({
                cpu: TEST_CPU_PERCENT,
                ram: TEST_RAM_PERCENT,
                storage: TEST_STORAGE_PERCENT,
                ip: '192.168.1.50',
                status: 'running',
                uptime: 1000,
                rootPassword: TEST_ROOT_PASSWORD,
            });

            await instanceController.getInstanceStats(req, res);

            expect(instanceService.getInstanceStats).toHaveBeenCalledWith(mockInstance);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                cpu: TEST_CPU_PERCENT,
                ram: TEST_RAM_PERCENT,
                storage: TEST_STORAGE_PERCENT,
                ip: '192.168.1.50',
                rootPassword: TEST_ROOT_PASSWORD,
            }));
        });

        it('should return zero stats for stopped instance', async () => {
            req.params.id = 'inst1';
            const mockInstance = {
                id: 'inst1',
                vmid: 100,
                userId: 'user1',
                status: 'stopped',
            };

            prisma.instance.findUnique.mockResolvedValue(mockInstance);
            instanceService.getInstanceStats.mockResolvedValue({
                cpu: 0, ram: 0, storage: 0, ip: null, status: 'stopped'
            });

            await instanceController.getInstanceStats(req, res);

            expect(res.json).toHaveBeenCalledWith({
                cpu: 0, ram: 0, storage: 0, ip: null, status: 'stopped'
            });
        });

        it('should handle proxmox errors by returning zeros/unknown', async () => {
            req.params.id = 'inst1';
            prisma.instance.findUnique.mockResolvedValue({
                id: 'inst1',
                vmid: 100,
                userId: 'user1',
                status: 'online'
            });

            instanceService.getInstanceStats.mockRejectedValue(new Error('Connection failed'));

            await instanceController.getInstanceStats(req, res);

            expect(res.json).toHaveBeenCalledWith({
                cpu: 0, ram: 0, storage: 0, ip: null, status: 'unknown'
            });
        });
    });

    describe('createDomain', () => {
        it('should create a domain successfully', async () => {
            req.params.id = 'inst1';
            req.body = { port: 8080, customSuffix: 'app' };

            prisma.instance.findUnique.mockResolvedValue({
                id: 'inst1',
                userId: 'user1',
                name: 'inst1',
                vmid: 100,
                domains: [],
            });
            prisma.user.findUnique.mockResolvedValue({ id: 'user1', name: 'user1' });

            domainService.createDomain.mockResolvedValue({
                id: 'dom1',
                subdomain: 'app-user1-inst1',
            });

            await instanceController.createDomain(req, res);

            expect(domainService.createDomain).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(201);
        });

        it('should validate port is required', async () => {
            req.params.id = 'inst1';
            req.body = { customSuffix: 'app' }; // Missing port

            await instanceController.createDomain(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });
    });

    describe('deleteDomain', () => {
        it('should delete domain successfully', async () => {
            req.params = { id: 'inst1', domainId: 'dom1' };
            const mockDomain = {
                id: 'dom1',
                subdomain: 'sub1',
                instance: { id: 'inst1', userId: 'user1' }
            };

            domainService.getDomainWithOwner.mockResolvedValue(mockDomain);
            domainService.deleteDomain.mockResolvedValue();

            await instanceController.deleteDomain(req, res);

            expect(domainService.deleteDomain).toHaveBeenCalledWith(mockDomain);
            expect(res.json).toHaveBeenCalled();
        });

        it('should return 404 if domain not found', async () => {
            req.params = { id: 'inst1', domainId: 'dom1' };
            domainService.getDomainWithOwner.mockResolvedValue(null);

            await instanceController.deleteDomain(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
        });
    });

    describe('getDomains', () => {
        it('should return domains', async () => {
            req.params.id = 'inst1';
            domainService.getInstanceDomains.mockResolvedValue([{ id: 'd1' }]);

            await instanceController.getDomains(req, res);

            expect(res.json).toHaveBeenCalledWith([{ id: 'd1' }]);
        });

        it('should return 404 if instance not found', async () => {
            req.params.id = 'inst1';
            domainService.getInstanceDomains.mockResolvedValue(null);

            await instanceController.getDomains(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
        });
    });



    describe('createInstance', () => {
        it('should create instance successfully', async () => {
            req.body = {
                name: 'new-vm',
                templateId: 'ubuntu'
            };

            prisma.user.findUnique.mockResolvedValue({ id: 'user1', name: 'user1' });

            prisma.templateVersion.findUnique.mockResolvedValue({
                id: 'ver1',
                proxmoxId: 9000,
                templateId: 'ubuntu',
                template: {
                    cpu: 2,
                    ram: 2048,
                    storage: 20,
                    points: 5
                }
            });

            const mockAllocation = {
                instance: {
                    id: 'inst-new',
                    name: 'new-vm',
                    vmid: 105,
                    status: 'provisioning',
                    userId: 'user1'
                },
                vmid: 105,
                rootPassword: 'randompass'
            };

            instanceService.allocateInstance.mockResolvedValue(mockAllocation);
            instanceService.provisionInBackground.mockImplementation(() => { });

            await instanceController.createInstance(req, res);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                id: 'inst-new',
                status: 'provisioning'
            }));

            expect(instanceService.allocateInstance).toHaveBeenCalled();
            expect(instanceService.provisionInBackground).toHaveBeenCalled();
        });

        it('should return 400 for invalid template', async () => {
            req.body = {
                name: 'new-vm',
                templateId: 'invalid',
                cpu: 1, ram: 1024, storage: 10, pointsPerDay: 1, os: 'default'
            };

            prisma.user.findUnique.mockResolvedValue({ id: 'user1', name: 'user1' });
            prisma.templateVersion.findUnique.mockResolvedValue(null);

            await instanceController.createInstance(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringContaining("Invalid template") }));
        });

        it('should return 500 on db error', async () => {
            req.body = { name: 'vm', template: 'ubuntu', os: 'default' };
            prisma.user.findUnique.mockRejectedValue(new Error('DB Error'));

            await instanceController.createInstance(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
        });
    });
});
