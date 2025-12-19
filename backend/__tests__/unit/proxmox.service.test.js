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
      service.client = {
        get: jest.fn().mockRejectedValueOnce({
          response: { data: { error: 'Failed' } },
          message: 'Network error',
        })
      };

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
      service.client = {
        get: jest.fn().mockRejectedValueOnce({
          response: { data: { error: 'Failed' } },
          message: 'Network error',
        })
      };

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
      service.client = {
        post: jest.fn().mockRejectedValueOnce({
          response: { data: { error: 'Clone failed' } },
          message: 'Network error',
        })
      };

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

  describe('configureLXC', () => {
    it('should configure LXC container', async () => {
      service.client = { put: jest.fn().mockResolvedValueOnce({ data: { data: 'UPID:...' } }) };
      const result = await service.configureLXC(102, { tags: 'test' });
      expect(result).toBeDefined();
      expect(service.client.put).toHaveBeenCalledWith(
        `/api2/json/nodes/${service.node}/lxc/102/config`,
        { tags: 'test' }
      );
    });
  });

  describe('getLXCStatus', () => {
    it('should get LXC status', async () => {
      const mockStatus = { status: 'running', cpu: 0.1 };
      service.client = { get: jest.fn().mockResolvedValueOnce({ data: { data: mockStatus } }) };
      const result = await service.getLXCStatus(102);
      expect(result).toEqual(mockStatus);
    });

    it('should throw error if get status fails', async () => {
      service.client = { get: jest.fn().mockRejectedValueOnce(new Error('Failed')) };
      await expect(service.getLXCStatus(102)).rejects.toThrow();
    });
  });

  describe('getLXCInterfaces', () => {
    it('should get LXC interfaces', async () => {
      const mockInterfaces = [{ name: 'eth0' }];
      service.client = { get: jest.fn().mockResolvedValueOnce({ data: { data: mockInterfaces } }) };
      const result = await service.getLXCInterfaces(102);
      expect(result).toEqual(mockInterfaces);
    });

    it('should return empty array on error', async () => {
      service.client = { get: jest.fn().mockRejectedValueOnce(new Error('Failed')) };
      const result = await service.getLXCInterfaces(102);
      expect(result).toEqual([]);
    });
  });

  describe('deleteLXC', () => {
    it('should delete LXC container', async () => {
      service.client = { delete: jest.fn().mockResolvedValueOnce({ data: { data: 'UPID:...' } }) };
      const result = await service.deleteLXC(102);
      expect(result).toBeDefined();
      expect(service.client.delete).toHaveBeenCalledWith(
        `/api2/json/nodes/${service.node}/lxc/102?purge=1`
      );
    });
  });

  describe('waitForTask', () => {
    it('should resolve when task is stopped and OK', async () => {
      service.client = {
        get: jest.fn().mockResolvedValue({
          data: { data: { status: 'stopped', exitstatus: 'OK' } }
        })
      };
      await expect(service.waitForTask('UPID:123')).resolves.not.toThrow();
    });

    it('should reject when task fails', async () => {
      service.client = {
        get: jest.fn().mockResolvedValue({
          data: { data: { status: 'stopped', exitstatus: 'ERROR' } }
        })
      };
      await expect(service.waitForTask('UPID:123')).rejects.toThrow();
    });
  });
});
