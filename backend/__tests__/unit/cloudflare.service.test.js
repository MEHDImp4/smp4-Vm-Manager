jest.mock('axios');
const axios = require('axios');

describe('CloudflareService', () => {
  let CloudflareService;
  let mockClient;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();

    mockClient = {
      get: jest.fn(),
      put: jest.fn(),
    };

    // Re-acquire axios mock after resetModules
    const mockAxios = require('axios');
    mockAxios.create.mockReturnValue(mockClient);

    // Require service under test
    CloudflareService = require('../../src/services/cloudflare.service');
  });

  describe('addTunnelIngress', () => {
    it('should add tunnel ingress successfully', async () => {
      // Mock get config behavior
      mockClient.get.mockResolvedValueOnce({
        data: {
          result: {
            config: {
              ingress: [
                { service: 'http_status:404' }
              ]
            }
          }
        }
      });

      // Mock put config behavior
      mockClient.put.mockResolvedValueOnce({ data: { success: true } });

      const addIngressResponse = await CloudflareService.addTunnelIngress('test.smp4.xyz', 'http://192.168.1.100:3000');

      expect(mockClient.get).toHaveBeenCalledWith(expect.stringContaining('/configurations'));
      expect(mockClient.put).toHaveBeenCalledWith(
        expect.stringContaining('/configurations'),
        expect.objectContaining({
          config: expect.objectContaining({
            ingress: expect.arrayContaining([
              expect.objectContaining({ hostname: 'test.smp4.xyz', service: 'http://192.168.1.100:3000' })
            ])
          })
        })
      );
      expect(addIngressResponse).toBe(true);
    });

    it('should throw error when adding ingress fails', async () => {
      mockClient.get.mockRejectedValueOnce(new Error('API error'));

      await expect(
        CloudflareService.addTunnelIngress('test.smp4.xyz', 'http://192.168.1.100:3000')
      ).rejects.toThrow('Failed to configure Cloudflare Tunnel');
    });
  });

  describe('removeTunnelIngress', () => {
    it('should remove tunnel ingress successfully', async () => {
      // Mock get config with existing rule
      mockClient.get.mockResolvedValueOnce({
        data: {
          result: {
            config: {
              ingress: [
                { hostname: 'test.smp4.xyz', service: 'http://192.168.1.100:3000' },
                { service: 'http_status:404' }
              ]
            }
          }
        }
      });

      // Mock put success
      mockClient.put.mockResolvedValueOnce({ data: { success: true } });

      const removeIngressResponse = await CloudflareService.removeTunnelIngress('test.smp4.xyz');

      expect(mockClient.put).toHaveBeenCalledWith(
        expect.stringContaining('/configurations'),
        expect.objectContaining({
          config: expect.objectContaining({
            ingress: expect.not.arrayContaining([
              expect.objectContaining({ hostname: 'test.smp4.xyz' })
            ])
          })
        })
      );
      expect(removeIngressResponse).toBe(true);
    });

    it('should throw error when removing ingress fails', async () => {
      mockClient.get.mockRejectedValueOnce(new Error('API error'));

      await expect(CloudflareService.removeTunnelIngress('test.smp4.xyz')).rejects.toThrow('Failed to update Cloudflare Tunnel');
    });
  });
});
