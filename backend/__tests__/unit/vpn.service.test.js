jest.mock('axios');
const axios = require('axios');
const VpnService = require('../../src/services/vpn.service');

describe('VpnService', () => {
  let service;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new VpnService();
  });

  describe('createVpnClient', () => {
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

      const result = await service.createVpnClient('192.168.1.100');

      expect(result).toEqual(mockResponse.data);
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('/client'),
        { vmIp: '192.168.1.100' },
        expect.any(Object)
      );
    });

    it('should throw error when VPN client creation fails', async () => {
      axios.post.mockRejectedValueOnce(new Error('VPN service unavailable'));

      await expect(service.createVpnClient('192.168.1.100')).rejects.toThrow(
        'Failed to create VPN client'
      );
    });
  });

  describe('deleteVpnClient', () => {
    it('should delete VPN client successfully', async () => {
      axios.delete.mockResolvedValueOnce({ data: { success: true } });

      const result = await service.deleteVpnClient('public-key-123');

      expect(result).toEqual({ success: true });
      expect(axios.delete).toHaveBeenCalledWith(
        expect.stringContaining('/client'),
        expect.objectContaining({
          data: { publicKey: 'public-key-123' },
        })
      );
    });

    it('should throw error when VPN client deletion fails', async () => {
      axios.delete.mockRejectedValueOnce(new Error('Delete failed'));

      await expect(service.deleteVpnClient('public-key-123')).rejects.toThrow();
    });
  });
});
