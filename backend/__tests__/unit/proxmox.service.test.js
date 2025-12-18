const ProxmoxService = require('../../src/services/proxmox.service');

describe('ProxmoxService', () => {
  let service;

  beforeEach(() => {
    jest.clearAllMocks();
    // Service is exported as a singleton instance, not a class.
    service = ProxmoxService;
  });

  describe('getLXCList', () => {
    it('should return list of LXC containers', async () => {
      const mockData = [
        { vmid: 100, hostname: 'vm1', status: 'running' },
        { vmid: 101, hostname: 'vm2', status: 'stopped' },
      ];

      service.client = { get: jest.fn().mockResolvedValueOnce({ data: { data: mockData } }) };

      const result = await service.getLXCList();
      expect(result).toEqual(mockData);
    });

    it('should throw error when fetching LXC list fails', async () => {
      service.client = { get: jest.fn().mockRejectedValueOnce({
        response: { data: { error: 'Failed' } },
        message: 'Network error',
      }) };

      await expect(service.getLXCList()).rejects.toThrow('Failed to get LXC list');
    });
  });

  describe('getNextVmid', () => {
    it('should return next available VMID', async () => {
      service.client = { get: jest.fn().mockResolvedValueOnce({ data: { data: 102 } }) };

      const result = await service.getNextVmid();
      expect(result).toBe(102);
    });

    it('should throw error when fetching next VMID fails', async () => {
      service.client = { get: jest.fn().mockRejectedValueOnce({
        response: { data: { error: 'Failed' } },
        message: 'Network error',
      }) };

      await expect(service.getNextVmid()).rejects.toThrow('Failed to get next VMID');
    });
  });

  describe('cloneLXC', () => {
    it('should clone LXC container successfully', async () => {
      const mockTaskId = 'UPID:pve:00001234:1702123456:0:clone:100:root@pam:';

      service.client = { post: jest.fn().mockResolvedValueOnce({ data: { data: mockTaskId } }) };

      const result = await service.cloneLXC(100, 102, 'vm-clone');
      expect(result).toBe(mockTaskId);
      expect(service.client.post).toHaveBeenCalledWith(
        `/api2/json/nodes/${service.node}/lxc/100/clone`,
        {
          newid: 102,
          hostname: 'vm-clone',
          full: 1,
          storage: 'local-lvm',
        }
      );
    });

    it('should throw error when cloning fails', async () => {
      service.client = { post: jest.fn().mockRejectedValueOnce({
        response: { data: { error: 'Clone failed' } },
        message: 'Network error',
      }) };

      await expect(service.cloneLXC(100, 102, 'vm-clone')).rejects.toThrow(
        'Failed to clone LXC 100'
      );
    });
  });

  describe('startLXC', () => {
    it('should start LXC container', async () => {
      service.client = { post: jest.fn().mockResolvedValueOnce({ data: { data: 'UPID:...' } }) };

      const result = await service.startLXC(102);
      expect(result).toBeDefined();
      expect(service.client.post).toHaveBeenCalledWith(
        `/api2/json/nodes/${service.node}/lxc/102/status/start`,
        {}
      );
    });
  });

  describe('stopLXC', () => {
    it('should stop LXC container', async () => {
      service.client = { post: jest.fn().mockResolvedValueOnce({ data: { data: 'UPID:...' } }) };

      const result = await service.stopLXC(102);
      expect(result).toBeDefined();
    });
  });
});
