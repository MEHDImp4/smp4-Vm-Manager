jest.mock('axios');
const axios = require('axios');
const VpnService = require('../../src/services/vpn.service');

describe('VpnService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createClient', () => {
    it('should create VPN client and return config', async () => {
      const mockResponse = {
        data: {
          privateKey: 'private-key-123',
          publicKey: 'public-key-123',
          address: '10.0.0.2/32',
          config: '[Interface]\nPrivateKey = private-key-123',
        },
      };

      axios.post.mockResolvedValueOnce(mockResponse);

      const result = await VpnService.createClient('192.168.1.100');

      expect(result).toEqual(mockResponse.data);
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('/client'),
        { targetIp: '192.168.1.100' } // Fixed param name from vmIp to targetIp
      );
    });

    it('should throw error when VPN client creation fails', async () => {
      axios.post.mockRejectedValueOnce(new Error('VPN service unavailable'));

      await expect(VpnService.createClient('192.168.1.100')).rejects.toThrow();
    });
  });

  describe('deleteClient', () => {
    it('should delete VPN client successfully', async () => {
      // Mock axios.delete
      axios.delete.mockResolvedValueOnce({});

      const vpnConfig = '[Interface]\nPrivateKey = private-key-123';

      await VpnService.deleteClient(vpnConfig);

      expect(axios.delete).toHaveBeenCalledWith(
        expect.stringContaining('/client'),
        expect.objectContaining({
          data: { privateKey: 'private-key-123' },
        })
      );
    });
  });
});
