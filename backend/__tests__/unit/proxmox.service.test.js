const ProxmoxService = require('../../src/services/proxmox.service');

describe('ProxmoxService', () => {
  let service;

  beforeEach(() => {
    jest.clearAllMocks();
    // Service is exported as a singleton instance, not a class.
    service = ProxmoxService;
  });

  // ... Existing tests ...

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
      service.client = { get: jest.fn().mockRejectedValueOnce(new Error('Failed')) };
      await expect(service.getNextVmid()).rejects.toThrow();
    });
  });

  describe('cloneLXC', () => {
    it('should clone LXC container successfully', async () => {
      const mockTaskId = 'UPID:clone';
      service.client = { post: jest.fn().mockResolvedValueOnce({ data: { data: mockTaskId } }) };
      const result = await service.cloneLXC(100, 102, 'vm-clone');
      expect(result).toBe(mockTaskId);
      expect(service.client.post).toHaveBeenCalledWith(
        `/api2/json/nodes/${service.node}/lxc/100/clone`,
        expect.objectContaining({ newid: 102 })
      );
    });

    it('should throw error when cloning fails', async () => {
      service.client = { post: jest.fn().mockRejectedValueOnce(new Error('Failed')) };
      await expect(service.cloneLXC(100, 102, 'vm-clone')).rejects.toThrow();
    });
  });

  describe('startLXC', () => {
    it('should start LXC container', async () => {
      service.client = { post: jest.fn().mockResolvedValueOnce({ data: { data: 'UPID:...' } }) };
      const result = await service.startLXC(102);
      expect(result).toBeDefined();
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

  // --- NEW TESTS START HERE ---

  describe('Snapshot Methods', () => {
    it('should create snapshot', async () => {
      service.client = { post: jest.fn().mockResolvedValue({ data: { data: 'UPID:snap' } }) };
      await service.createLXCSnapshot(100, 'snap1', 'desc');
      expect(service.client.post).toHaveBeenCalledWith(
        expect.stringContaining('/snapshot'),
        { snapname: 'snap1', description: 'desc' }
      );
    });

    it('should list snapshots', async () => {
      const mockSnaps = [{ name: 'snap1' }, { name: 'current' }];
      service.client = { get: jest.fn().mockResolvedValue({ data: { data: mockSnaps } }) };
      const result = await service.listLXCSnapshots(100);
      expect(result).toHaveLength(1); // 'current' filtered out
      expect(result[0].name).toBe('snap1');
    });

    it('should delete snapshot', async () => {
      service.client = { delete: jest.fn().mockResolvedValue({ data: { data: 'UPID:del' } }) };
      await service.deleteLXCSnapshot(100, 'snap1');
      expect(service.client.delete).toHaveBeenCalledWith(
        expect.stringContaining('/snapshot/snap1')
      );
    });

    it('should rollback snapshot', async () => {
      service.client = { post: jest.fn().mockResolvedValue({ data: { data: 'UPID:roll' } }) };
      await service.rollbackLXCSnapshot(100, 'snap1');
      expect(service.client.post).toHaveBeenCalledWith(
        expect.stringContaining('/snapshot/snap1/rollback'),
        {}
      );
    });
  });

  describe('Backup Methods', () => {
    it('should create backup', async () => {
      service.client = { post: jest.fn().mockResolvedValue({ data: { data: 'UPID:backup' } }) };
      await service.createLXCBackup(100);
      expect(service.client.post).toHaveBeenCalledWith(
        expect.stringContaining('/vzdump'),
        expect.objectContaining({ vmid: 100 })
      );
    });

    it('should list backups', async () => {
      const mockBackups = [{ vmid: 100, volid: 'backup1' }, { vmid: 101 }];
      service.client = { get: jest.fn().mockResolvedValue({ data: { data: mockBackups } }) };
      const result = await service.listBackups('local', 100);
      expect(result).toHaveLength(1);
      expect(result[0].volid).toBe('backup1');
    });

    it('should delete backup', async () => {
      service.client = { delete: jest.fn().mockResolvedValue({ data: { data: 'UPID:del' } }) };
      await service.deleteBackup('local', 'backup1');
      expect(service.client.delete).toHaveBeenCalled();
    });

    it('should get backup download ticket', async () => {
      service.client = { post: jest.fn().mockResolvedValue({ data: { data: { ticket: 'abc' } } }) };
      const result = await service.getBackupDownloadTicket('vol1');
      expect(result).toEqual({ ticket: 'abc' });
    });

    it('should fallback to volid if ticket fails', async () => {
      service.client = { post: jest.fn().mockRejectedValue(new Error('Fail')) };
      const result = await service.getBackupDownloadTicket('vol1');
      expect(result).toEqual({ volid: 'vol1' });
    });
  });

  describe('Firewall Methods', () => {
    it('should add firewall rule', async () => {
      service.client = { post: jest.fn().mockResolvedValue({ data: { data: 'ok' } }) };
      await service.addFirewallRule(100, { dport: 80 });
      expect(service.client.post).toHaveBeenCalledWith(
        expect.stringContaining('/firewall/rules'),
        expect.objectContaining({ dport: 80 })
      );
    });

    it('should set firewall options', async () => {
      service.client = { put: jest.fn().mockResolvedValue({ data: { data: 'ok' } }) };
      await service.setFirewallOptions(100, { enable: 1 });
      expect(service.client.put).toHaveBeenCalledWith(
        expect.stringContaining('/firewall/options'),
        { enable: 1 }
      );
    });
  });
});
