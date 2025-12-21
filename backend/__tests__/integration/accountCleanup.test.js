
const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

// Mocks MUST be defined before imports
// Mock DB
jest.mock('../../src/db', () => ({
    prisma: require('jest-mock-extended').mockDeep(),
}));

// Mock Services
jest.mock('../../src/services/proxmox.service', () => ({
    stopLXC: jest.fn(),
    deleteLXC: jest.fn(),
    waitForTask: jest.fn().mockResolvedValue()
}));
jest.mock('../../src/services/vpn.service', () => ({
    deleteClient: jest.fn()
}));
jest.mock('../../src/services/cloudflare.service', () => ({
    removeMultipleTunnelIngress: jest.fn()
}));
jest.mock('../../src/services/email.service', () => ({
    sendAccountDeletionCode: jest.fn()
}));

const { prisma } = require('../../src/db');
const authRoutes = require('../../src/routes/authRoutes');
const proxmoxService = require('../../src/services/proxmox.service');
const vpnService = require('../../src/services/vpn.service');
const cloudflareService = require('../../src/services/cloudflare.service');

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

describe('Account Cleanup Integration', () => {
    let token;
    const userId = 'user-123';
    const email = 'cleanup@test.com';

    beforeEach(() => {
        jest.clearAllMocks();
        // Generate a real token for auth middleware
        token = jwt.sign({ id: userId, email: email, role: 'user' }, process.env.JWT_SECRET || 'your_jwt_secret');
    });

    it('should clean up all resources (Proxmox, VPN, Cloudflare) when deleting account', async () => {
        // Setup User with Instances
        const mockInstances = [
            {
                id: 'inst-1',
                vmid: 100,
                name: 'test-vm-1',
                vpnConfig: 'vpn-conf-1',
                domains: [
                    { subdomain: 'custom-domain-1', isPaid: true }
                ]
            },
            {
                id: 'inst-2', // Instance with no VPN, no domains
                vmid: 101,
                name: 'test-vm-2',
                vpnConfig: null,
                domains: []
            }
        ];

        const mockUser = {
            id: userId,
            email: email,
            name: 'cleanupuser',
            verificationCode: '123456',
            instances: mockInstances
        };

        // Mock Prisma findUnique to return our user
        prisma.user.findUnique.mockResolvedValue(mockUser);

        // Execute Request
        const response = await request(app)
            .post('/api/auth/confirm-deletion')
            .set('Authorization', `Bearer ${token}`)
            .send({ code: '123456' });

        // Assertions

        // 1. Verify Cloudflare Cleanup
        // Expected domains: 'custom-domain-1.smp4.xyz', 'portainer-cleanupuser-test-vm-1.smp4.xyz', 'portainer-cleanupuser-test-vm-2.smp4.xyz'
        // Note: The logic constructs portainer domains based on naming.
        expect(cloudflareService.removeMultipleTunnelIngress).toHaveBeenCalledTimes(1);
        const cfCalls = cloudflareService.removeMultipleTunnelIngress.mock.calls[0][0];
        expect(cfCalls).toContain('custom-domain-1.smp4.xyz');
        expect(cfCalls).toContain('portainer-cleanupuser-test-vm-1.smp4.xyz');
        expect(cfCalls).toContain('portainer-cleanupuser-test-vm-2.smp4.xyz');

        // 2. Verify VPN Cleanup
        expect(vpnService.deleteClient).toHaveBeenCalledTimes(1); // Only 1 instance has VPN
        expect(vpnService.deleteClient).toHaveBeenCalledWith('vpn-conf-1');

        // 3. Verify Proxmox Cleanup
        expect(proxmoxService.stopLXC).toHaveBeenCalledTimes(2);
        expect(proxmoxService.waitForTask).toHaveBeenCalledTimes(2);
        expect(proxmoxService.deleteLXC).toHaveBeenCalledTimes(2);
        expect(proxmoxService.deleteLXC).toHaveBeenCalledWith(100);
        expect(proxmoxService.deleteLXC).toHaveBeenCalledWith(101);

        // 4. Verify DB Cleanup
        // Order matters in the controller, but here we just check if called
        expect(prisma.snapshot.deleteMany).toHaveBeenCalled();
        expect(prisma.domain.deleteMany).toHaveBeenCalled();
        expect(prisma.instance.deleteMany).toHaveBeenCalled();
        expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: userId } });

        // Response check
        expect(response.status).toBe(200);
        expect(response.body.message).toContain('supprimé avec succès');
    });

    it('should continue cleanup even if external services fail', async () => {
        const mockUser = {
            id: userId,
            verificationCode: '123456',
            instances: [{ id: 'inst-1', vmid: 100, vpnConfig: 'vpn-1' }]
        };
        prisma.user.findUnique.mockResolvedValue(mockUser);

        // Mock failures
        cloudflareService.removeMultipleTunnelIngress.mockRejectedValue(new Error('CF Error'));
        vpnService.deleteClient.mockRejectedValue(new Error('VPN Error'));
        proxmoxService.deleteLXC.mockRejectedValue(new Error('Proxmox Error'));

        const response = await request(app)
            .post('/api/auth/confirm-deletion')
            .set('Authorization', `Bearer ${token}`)
            .send({ code: '123456' });

        // Should still try to delete DB
        expect(prisma.user.delete).toHaveBeenCalled();
        expect(response.status).toBe(200);
    });
});
