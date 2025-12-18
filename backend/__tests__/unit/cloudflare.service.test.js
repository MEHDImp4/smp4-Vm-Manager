jest.mock('axios');
const axios = require('axios');
const CloudflareService = require('../../src/services/cloudflare.service');

describe('CloudflareService', () => {
  let service;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CloudflareService();
  });

  describe('addIngress', () => {
    it('should add tunnel ingress successfully', async () => {
      const mockResponse = {
        data: {
          result: {
            config: {
              ingress: [
                { hostname: 'test.smp4.xyz', service: 'http://192.168.1.100:3000' },
              ],
            },
          },
        },
      };

      axios.patch.mockResolvedValueOnce(mockResponse);

      const result = await service.addIngress('test.smp4.xyz', '192.168.1.100', 3000);

      expect(axios.patch).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should throw error when adding ingress fails', async () => {
      axios.patch.mockRejectedValueOnce(new Error('API error'));

      await expect(
        service.addIngress('test.smp4.xyz', '192.168.1.100', 3000)
      ).rejects.toThrow('Failed to add tunnel ingress');
    });
  });

  describe('removeIngress', () => {
    it('should remove tunnel ingress successfully', async () => {
      axios.patch.mockResolvedValueOnce({ data: { result: { config: {} } } });

      const result = await service.removeIngress('test.smp4.xyz');

      expect(axios.patch).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should throw error when removing ingress fails', async () => {
      axios.patch.mockRejectedValueOnce(new Error('API error'));

      await expect(service.removeIngress('test.smp4.xyz')).rejects.toThrow();
    });
  });
});
