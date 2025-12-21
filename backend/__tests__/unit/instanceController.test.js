const instanceController = require('../../src/controllers/instanceController');
const { prisma } = require('../../src/db');
const proxmoxService = require('../../src/services/proxmox.service');

const cloudflareService = require('../../src/services/cloudflare.service');
const vpnService = require('../../src/services/vpn.service');

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

jest.mock('../../src/services/proxmox.service');
jest.mock('../../src/services/ssh.service');
jest.mock('../../src/services/cloudflare.service');
jest.mock('../../src/services/vpn.service');
jest.mock('../../src/services/queue.service', () => ({
    vmCreationQueue: {
        add: jest.fn((fn) => fn()),
    },
    vmAllocationQueue: {
        add: jest.fn((fn) => fn()),
    },
}));


describe('Instance Controller Unit Tests', () => {
    let req, res;

    beforeEach(() => {
        jest.clearAllMocks();
        console.log = jest.fn(); // Silence logs
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
            prisma.instance.findUnique.mockResolvedValue({
                id: 'inst1',
                vmid: 100,
                userId: 'user1',
                status: 'online',
            });
            prisma.instance.update.mockResolvedValue({ status: 'stopped' });

            await instanceController.toggleInstanceStatus(req, res);

            expect(proxmoxService.stopLXC).toHaveBeenCalledWith(100);
            expect(prisma.instance.update).toHaveBeenCalledWith({
                where: { id: 'inst1' },
                data: { status: 'stopped' },
            });
            expect(res.json).toHaveBeenCalled();
        });

        it('should start a stopped instance', async () => {
            req.params.id = 'inst1';
            prisma.instance.findUnique.mockResolvedValue({
                id: 'inst1',
                vmid: 100,
                userId: 'user1',
                status: 'stopped',
            });
            prisma.instance.update.mockResolvedValue({ status: 'online' });

            await instanceController.toggleInstanceStatus(req, res);

            expect(proxmoxService.startLXC).toHaveBeenCalledWith(100);
            expect(prisma.instance.update).toHaveBeenCalledWith({
                where: { id: 'inst1' },
                data: { status: 'online' },
            });
        });

        it('should return 404 if instance not found', async () => {
            req.params.id = 'inst1';
            prisma.instance.findUnique.mockResolvedValue(null);

            await instanceController.toggleInstanceStatus(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: "Instance not found" }));
        });
    });

    describe('restartInstance', () => {
        it('should reboot instance', async () => {
            req.params.id = 'inst1';
            prisma.instance.findUnique.mockResolvedValue({
                id: 'inst1',
                vmid: 100,
                userId: 'user1',
            });

            await instanceController.restartInstance(req, res);

            expect(proxmoxService.rebootLXC).toHaveBeenCalledWith(100);
            expect(res.json).toHaveBeenCalledWith({ message: "Instance restarting" });
        });
    });

    describe('deleteInstance', () => {
        it('should delete instance and cleanup resources', async () => {
            req.params.id = 'inst1';
            prisma.instance.findUnique.mockResolvedValue({
                id: 'inst1',
                vmid: 100,
                userId: 'user1',
                vpnConfig: 'vpn-conf',
                domains: [{ subdomain: 'sub1', isPaid: false }],
            });

            proxmoxService.stopLXC.mockResolvedValue();
            proxmoxService.deleteLXC.mockResolvedValue();
            vpnService.deleteClient.mockResolvedValue();
            cloudflareService.removeMultipleTunnelIngress.mockResolvedValue();
            prisma.instance.delete.mockResolvedValue({});

            await instanceController.deleteInstance(req, res);

            expect(proxmoxService.stopLXC).toHaveBeenCalledWith(100);
            expect(proxmoxService.deleteLXC).toHaveBeenCalledWith(100);
            expect(vpnService.deleteClient).toHaveBeenCalledWith('vpn-conf');
            expect(cloudflareService.removeMultipleTunnelIngress).toHaveBeenCalledWith(['sub1.smp4.xyz']);
            expect(prisma.instance.delete).toHaveBeenCalledWith({ where: { id: 'inst1' } });
            expect(res.json).toHaveBeenCalledWith({ message: "Instance deleted" });
        });

        it('should handle errors during stop gracefully', async () => {
            req.params.id = 'inst1';
            prisma.instance.findUnique.mockResolvedValue({
                id: 'inst1',
                vmid: 100,
                userId: 'user1',
            });
            // Mock stop failure
            proxmoxService.stopLXC.mockRejectedValue(new Error('Already stopped'));

            await instanceController.deleteInstance(req, res);

            // Should continue to delete
            expect(proxmoxService.deleteLXC).toHaveBeenCalledWith(100);
            expect(prisma.instance.delete).toHaveBeenCalled();
        });

        it('should handle errors during proxmox delete gracefully', async () => {
            req.params.id = 'inst1';
            prisma.instance.findUnique.mockResolvedValue({
                id: 'inst1',
                vmid: 100,
                userId: 'user1',
            });
            proxmoxService.stopLXC.mockResolvedValue();
            proxmoxService.deleteLXC.mockRejectedValue(new Error('VM not found'));

            await instanceController.deleteInstance(req, res);

            // Should continue to delete from DB
            expect(prisma.instance.delete).toHaveBeenCalled();
        });
    });

    const TEST_STORAGE_GB = 10;
    const TEST_ROOT_PASSWORD = 'pass';
    const TEST_CPU_PERCENT = 50.0;
    const TEST_RAM_PERCENT = 50.0;
    const TEST_STORAGE_PERCENT = 50.0;
    const TEST_MEM = 512 * 1024 * 1024;
    const TEST_MAX_MEM = 1024 * 1024 * 1024;
    const TEST_DISK = 5 * 1024 * 1024 * 1024;
    const TEST_MAX_DISK = 10 * 1024 * 1024 * 1024;

    describe('getInstanceStats', () => {
        it('should return stats for running instance', async () => {
            req.params.id = 'inst1';
            prisma.instance.findUnique.mockResolvedValue({
                id: 'inst1',
                vmid: 100,
                userId: 'user1',
                storage: TEST_STORAGE_GB,
                rootPassword: TEST_ROOT_PASSWORD,
            });

            proxmoxService.getLXCStatus.mockResolvedValue({
                cpu: 0.5,
                mem: TEST_MEM,
                maxmem: TEST_MAX_MEM,
                disk: TEST_DISK,
                maxdisk: TEST_MAX_DISK,
                status: 'running',
                uptime: 1000,
            });

            proxmoxService.getLXCInterfaces.mockResolvedValue([
                { name: 'eth0', inet: '192.168.1.50/24' }
            ]);

            await instanceController.getInstanceStats(req, res);

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
            prisma.instance.findUnique.mockResolvedValue({
                id: 'inst1',
                vmid: 100,
                userId: 'user1',
                status: 'stopped',
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

            proxmoxService.getLXCStatus.mockRejectedValue(new Error('Connection failed'));

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
            prisma.domain.findUnique.mockResolvedValue(null); // Not taken

            proxmoxService.getLXCInterfaces.mockResolvedValue([
                { name: 'eth0', inet: '192.168.1.50/24' }
            ]);

            prisma.domain.create.mockResolvedValue({
                id: 'dom1',
                subdomain: 'user1-inst1-app',
            });

            await instanceController.createDomain(req, res);

            expect(cloudflareService.addTunnelIngress).toHaveBeenCalledWith(
                'app-user1-inst1.smp4.xyz',
                'http://192.168.1.50:8080'
            );
            expect(res.status).toHaveBeenCalledWith(201);
        });

        it('should validate inputs', async () => {
            req.params.id = 'inst1';
            req.body = { port: 8080 }; // Missing suffix
            await instanceController.createDomain(req, res);
            expect(res.status).toHaveBeenCalledWith(400);

            req.body = { port: 8080, customSuffix: 'a' }; // Too short
            await instanceController.createDomain(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });
    });

    // --- NEW DOMAIN TESTS ---
    describe('deleteDomain', () => {
        it('should delete domain successfully', async () => {
            req.params = { id: 'inst1', domainId: 'dom1' };
            prisma.domain.findUnique.mockResolvedValue({
                id: 'dom1',
                subdomain: 'sub1',
                instance: { id: 'inst1', userId: 'user1' }
            });

            cloudflareService.removeTunnelIngress.mockResolvedValue();
            prisma.domain.delete.mockResolvedValue();

            await instanceController.deleteDomain(req, res);

            expect(cloudflareService.removeTunnelIngress).toHaveBeenCalledWith('sub1.smp4.xyz');
            expect(prisma.domain.delete).toHaveBeenCalledWith({ where: { id: 'dom1' } });
            expect(res.json).toHaveBeenCalled();
        });

        it('should return 404 if domain not found', async () => {
            req.params = { id: 'inst1', domainId: 'dom1' };
            prisma.domain.findUnique.mockResolvedValue(null);

            await instanceController.deleteDomain(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
        });
    });

    describe('getDomains', () => {
        it('should return domains', async () => {
            req.params.id = 'inst1';
            prisma.instance.findUnique.mockResolvedValue({
                id: 'inst1',
                userId: 'user1',
                domains: [{ id: 'd1' }]
            });

            await instanceController.getDomains(req, res);

            expect(res.json).toHaveBeenCalledWith([{ id: 'd1' }]);
        });

        it('should return 404 if instance not found', async () => {
            req.params.id = 'inst1';
            prisma.instance.findUnique.mockResolvedValue(null);
            await instanceController.getDomains(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
        });
    });

    describe('getVpnConfig', () => {
        it('should return existing config', async () => {
            req.params.id = 'inst1';
            prisma.instance.findUnique.mockResolvedValue({
                id: 'inst1',
                userId: 'user1',
                vpnConfig: 'existing-conf'
            });

            await instanceController.getVpnConfig(req, res);

            expect(res.json).toHaveBeenCalledWith({ config: 'existing-conf' });
        });

        it('should generate config if missing and instance has IP', async () => {
            req.params.id = 'inst1';
            prisma.instance.findUnique.mockResolvedValue({
                id: 'inst1',
                userId: 'user1',
                vmid: 100,
                vpnConfig: null
            });

            proxmoxService.getLXCInterfaces.mockResolvedValue([
                { name: 'eth0', inet: '192.168.1.50/24' }
            ]);

            vpnService.createClient.mockResolvedValue({ config: 'new-conf' });

            await instanceController.getVpnConfig(req, res);

            expect(vpnService.createClient).toHaveBeenCalledWith('192.168.1.50');
            expect(res.json).toHaveBeenCalledWith({ config: 'new-conf' });
        });
    });

    describe('createInstance', () => {
        it('should create instance successfully', async () => {
            req.body = {
                name: 'new-vm',
                template: 'ubuntu',
                cpu: 2,
                ram: 2048,
                storage: 20,
                pointsPerDay: 5,
                os: 'default'
            };

            prisma.user.findUnique.mockResolvedValue({ id: 'user1', name: 'user1' });

            prisma.templateVersion.findUnique.mockResolvedValue({
                id: 'ver1',
                proxmoxId: 9000,
                templateId: 'ubuntu'
            });

            proxmoxService.getNextVmid.mockResolvedValue(105);

            prisma.instance.create.mockResolvedValue({
                id: 'inst-new',
                name: 'new-vm',
                vmid: 105,
                status: 'provisioning',
                userId: 'user1'
            });

            // We don't await the background process in the controller, so we just check the initial response
            await instanceController.createInstance(req, res);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                id: 'inst-new',
                status: 'provisioning'
            }));

            expect(proxmoxService.getNextVmid).toHaveBeenCalled();
            expect(prisma.instance.create).toHaveBeenCalled();
        });

        it('should return 400 for invalid template', async () => {
            req.body = {
                name: 'new-vm',
                template: 'invalid', // Invalid
                cpu: 1, ram: 1024, storage: 10, pointsPerDay: 1, os: 'default'
            };

            prisma.user.findUnique.mockResolvedValue({ id: 'user1', name: 'user1' });
            prisma.templateVersion.findUnique.mockResolvedValue(null); // Not found

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
