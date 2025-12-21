jest.mock('../../src/db', () => ({
    prisma: {
        domain: {
            findUnique: jest.fn(),
            create: jest.fn(),
            delete: jest.fn(),
        },
        instance: {
            findUnique: jest.fn(),
        },
    },
}));

jest.mock('../../src/services/proxmox.service', () => ({
    getLXCInterfaces: jest.fn(),
}));

jest.mock('../../src/services/cloudflare.service', () => ({
    addTunnelIngress: jest.fn(),
    removeTunnelIngress: jest.fn(),
}));

jest.mock('../../src/services/logger.service', () => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
}));

const { prisma } = require('../../src/db');
const proxmoxService = require('../../src/services/proxmox.service');
const cloudflareService = require('../../src/services/cloudflare.service');

const {
    generateSubdomain,
    validateSuffix,
    isSubdomainAvailable,
    getInstanceIp,
    createDomain,
    deleteDomain,
    getDomainWithOwner,
    getInstanceDomains,
} = require('../../src/services/domain.service');

describe('Domain Service Unit Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('generateSubdomain', () => {
        it('should generate a clean subdomain', () => {
            const result = generateSubdomain('myapp', 'John Doe', 'my-vm');
            expect(result).toBe('myapp-johndoe-my-vm');
        });

        it('should handle special characters', () => {
            // Note: instance name replaces special chars with '-', others just remove them
            const result = generateSubdomain('My App!', 'User@123', 'VM_Test');
            expect(result).toBe('myapp-user123-vm-test');
        });

        it('should handle empty parts', () => {
            const result = generateSubdomain('api', '', 'server');
            expect(result).toBe('api-server');
        });

        it('should remove consecutive hyphens', () => {
            const result = generateSubdomain('test--', 'user--name', 'vm');
            expect(result).toBe('test-username-vm');
        });
    });

    describe('validateSuffix', () => {
        it('should validate a good suffix', () => {
            const result = validateSuffix('myapp');
            expect(result.valid).toBe(true);
            expect(result.cleanSuffix).toBe('myapp');
        });

        it('should reject empty suffix', () => {
            const result = validateSuffix('');
            expect(result.valid).toBe(false);
            expect(result.error).toBe("Custom suffix is required");
        });

        it('should reject null suffix', () => {
            const result = validateSuffix(null);
            expect(result.valid).toBe(false);
        });

        it('should reject short suffix', () => {
            const result = validateSuffix('ab');
            expect(result.valid).toBe(false);
            expect(result.error).toContain("at least 3");
        });

        it('should clean special characters before validation', () => {
            const result = validateSuffix('a-b-c');
            expect(result.valid).toBe(true);
            expect(result.cleanSuffix).toBe('abc');
        });
    });

    describe('isSubdomainAvailable', () => {
        it('should return true if subdomain is available', async () => {
            prisma.domain.findUnique.mockResolvedValue(null);
            const result = await isSubdomainAvailable('test-sub');
            expect(result).toBe(true);
        });

        it('should return false if subdomain exists', async () => {
            prisma.domain.findUnique.mockResolvedValue({ id: '1', subdomain: 'test-sub' });
            const result = await isSubdomainAvailable('test-sub');
            expect(result).toBe(false);
        });
    });

    describe('getInstanceIp', () => {
        it('should return IP from eth0', async () => {
            proxmoxService.getLXCInterfaces.mockResolvedValue([
                { name: 'eth0', inet: '192.168.1.100/24' },
                { name: 'lo', inet: '127.0.0.1/8' }
            ]);

            const result = await getInstanceIp(100);
            expect(result).toBe('192.168.1.100');
        });

        it('should return null if eth0 not found', async () => {
            proxmoxService.getLXCInterfaces.mockResolvedValue([
                { name: 'lo', inet: '127.0.0.1/8' }
            ]);

            const result = await getInstanceIp(100);
            expect(result).toBe(null);
        });

        it('should return null if eth0 has no IP', async () => {
            proxmoxService.getLXCInterfaces.mockResolvedValue([
                { name: 'eth0' }
            ]);

            const result = await getInstanceIp(100);
            expect(result).toBe(null);
        });
    });

    describe('createDomain', () => {
        const mockInstance = {
            id: 'inst1',
            name: 'myvm',
            vmid: 100,
            userId: 'user1',
            domains: []
        };
        const mockUser = { id: 'user1', name: 'TestUser' };

        it('should create domain successfully', async () => {
            prisma.domain.findUnique.mockResolvedValue(null); // Available
            proxmoxService.getLXCInterfaces.mockResolvedValue([
                { name: 'eth0', inet: '192.168.1.50/24' }
            ]);
            cloudflareService.addTunnelIngress.mockResolvedValue();
            prisma.domain.create.mockResolvedValue({
                id: 'dom1',
                subdomain: 'myapp-testuser-myvm',
                port: 8080,
                isPaid: false
            });

            const result = await createDomain({
                instance: mockInstance,
                user: mockUser,
                port: 8080,
                customSuffix: 'myapp',
                isPaidRequest: false
            });

            expect(cloudflareService.addTunnelIngress).toHaveBeenCalledWith(
                'myapp-testuser-myvm.smp4.xyz',
                'http://192.168.1.50:8080'
            );
            expect(prisma.domain.create).toHaveBeenCalled();
            expect(result.subdomain).toBe('myapp-testuser-myvm');
        });

        it('should throw error for invalid suffix', async () => {
            await expect(createDomain({
                instance: mockInstance,
                user: mockUser,
                port: 8080,
                customSuffix: 'ab', // Too short
                isPaidRequest: false
            })).rejects.toThrow("at least 3");
        });

        it('should throw error when subdomain is taken', async () => {
            prisma.domain.findUnique.mockResolvedValue({ id: 'existing' });

            await expect(createDomain({
                instance: mockInstance,
                user: mockUser,
                port: 8080,
                customSuffix: 'myapp',
                isPaidRequest: false
            })).rejects.toThrow("already active");
        });

        it('should throw error for instance without IP', async () => {
            prisma.domain.findUnique.mockResolvedValue(null);
            proxmoxService.getLXCInterfaces.mockResolvedValue([]);

            await expect(createDomain({
                instance: mockInstance,
                user: mockUser,
                port: 8080,
                customSuffix: 'myapp',
                isPaidRequest: false
            })).rejects.toThrow("must have an IP");
        });

        it('should require payment after 3 free domains', async () => {
            const instanceWithDomains = {
                ...mockInstance,
                domains: [
                    { isPaid: false },
                    { isPaid: false },
                    { isPaid: false }
                ]
            };

            prisma.domain.findUnique.mockResolvedValue(null);

            await expect(createDomain({
                instance: instanceWithDomains,
                user: mockUser,
                port: 8080,
                customSuffix: 'myapp',
                isPaidRequest: false // Not paying
            })).rejects.toThrow("3 free domains");
        });

        it('should allow paid domain after limit', async () => {
            const instanceWithDomains = {
                ...mockInstance,
                domains: [
                    { isPaid: false },
                    { isPaid: false },
                    { isPaid: false }
                ]
            };

            prisma.domain.findUnique.mockResolvedValue(null);
            proxmoxService.getLXCInterfaces.mockResolvedValue([
                { name: 'eth0', inet: '192.168.1.50/24' }
            ]);
            cloudflareService.addTunnelIngress.mockResolvedValue();
            prisma.domain.create.mockResolvedValue({
                id: 'dom1',
                subdomain: 'extra-testuser-myvm',
                port: 8080,
                isPaid: true
            });

            const result = await createDomain({
                instance: instanceWithDomains,
                user: mockUser,
                port: 8080,
                customSuffix: 'extra',
                isPaidRequest: true
            });

            expect(result.isPaid).toBe(true);
        });
    });

    describe('deleteDomain', () => {
        it('should delete domain from cloudflare and DB', async () => {
            const mockDomain = { id: 'dom1', subdomain: 'test-sub' };
            cloudflareService.removeTunnelIngress.mockResolvedValue();
            prisma.domain.delete.mockResolvedValue({});

            await deleteDomain(mockDomain);

            expect(cloudflareService.removeTunnelIngress).toHaveBeenCalledWith('test-sub.smp4.xyz');
            expect(prisma.domain.delete).toHaveBeenCalledWith({ where: { id: 'dom1' } });
        });
    });

    describe('getDomainWithOwner', () => {
        it('should return domain if ownership matches', async () => {
            const mockDomain = {
                id: 'dom1',
                subdomain: 'test',
                instance: { id: 'inst1', userId: 'user1' }
            };
            prisma.domain.findUnique.mockResolvedValue(mockDomain);

            const result = await getDomainWithOwner('dom1', 'inst1', 'user1');
            expect(result).toEqual(mockDomain);
        });

        it('should return null if domain not found', async () => {
            prisma.domain.findUnique.mockResolvedValue(null);

            const result = await getDomainWithOwner('dom1', 'inst1', 'user1');
            expect(result).toBe(null);
        });

        it('should return null if instance does not match', async () => {
            const mockDomain = {
                id: 'dom1',
                instance: { id: 'inst2', userId: 'user1' }
            };
            prisma.domain.findUnique.mockResolvedValue(mockDomain);

            const result = await getDomainWithOwner('dom1', 'inst1', 'user1');
            expect(result).toBe(null);
        });

        it('should return null if user does not match', async () => {
            const mockDomain = {
                id: 'dom1',
                instance: { id: 'inst1', userId: 'user2' }
            };
            prisma.domain.findUnique.mockResolvedValue(mockDomain);

            const result = await getDomainWithOwner('dom1', 'inst1', 'user1');
            expect(result).toBe(null);
        });
    });

    describe('getInstanceDomains', () => {
        it('should return domains for valid instance', async () => {
            prisma.instance.findUnique.mockResolvedValue({
                id: 'inst1',
                userId: 'user1',
                domains: [{ id: 'd1', subdomain: 'test1' }]
            });

            const result = await getInstanceDomains('inst1', 'user1');
            expect(result).toEqual([{ id: 'd1', subdomain: 'test1' }]);
        });

        it('should return null if instance not found', async () => {
            prisma.instance.findUnique.mockResolvedValue(null);

            const result = await getInstanceDomains('inst1', 'user1');
            expect(result).toBe(null);
        });

        it('should return null if user does not own instance', async () => {
            prisma.instance.findUnique.mockResolvedValue({
                id: 'inst1',
                userId: 'user2',
                domains: []
            });

            const result = await getInstanceDomains('inst1', 'user1');
            expect(result).toBe(null);
        });
    });
});
