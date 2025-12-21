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

      const lxcList = await service.getLXCList();
      expect(lxcList).toEqual(mockData);
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
      const nextVmid = await service.getNextVmid();
      expect(nextVmid).toBe(102);
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
      const cloneTaskId = await service.cloneLXC(100, 102, 'vm-clone');
      expect(cloneTaskId).toBe(mockTaskId);
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
      const taskId = await service.startLXC(102);
      expect(taskId).toBeDefined();
    });

    it('should throw error when start fails', async () => {
      service.client = { post: jest.fn().mockRejectedValue(new Error('Failed')) };
      await expect(service.startLXC(102)).rejects.toThrow();
    });
  });

  describe('stopLXC', () => {
    it('should stop LXC container', async () => {
      service.client = { post: jest.fn().mockResolvedValueOnce({ data: { data: 'UPID:...' } }) };
      const taskId = await service.stopLXC(102);
      expect(taskId).toBeDefined();
    });

    it('should throw error when stop fails', async () => {
      service.client = { post: jest.fn().mockRejectedValue(new Error('Failed')) };
      await expect(service.stopLXC(102)).rejects.toThrow();
    });
  });

  describe('configureLXC', () => {
    it('should configure LXC container', async () => {
      service.client = { put: jest.fn().mockResolvedValueOnce({ data: { data: 'UPID:...' } }) };
      const taskId = await service.configureLXC(102, { tags: 'test' });
      expect(taskId).toBeDefined();
    });

    it('should throw error when configure fails', async () => {
      service.client = { put: jest.fn().mockRejectedValue(new Error('Failed')) };
      await expect(service.configureLXC(102, {})).rejects.toThrow();
    });
  });

  describe('getLXCStatus', () => {
    it('should get LXC status', async () => {
      const mockStatus = { status: 'running', cpu: 0.1 };
      service.client = { get: jest.fn().mockResolvedValueOnce({ data: { data: mockStatus } }) };
      const status = await service.getLXCStatus(102);
      expect(status).toEqual(mockStatus);
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
      const interfaces = await service.getLXCInterfaces(102);
      expect(interfaces).toEqual(mockInterfaces);
    });

    it('should return empty array on error', async () => {
      service.client = { get: jest.fn().mockRejectedValueOnce(new Error('Failed')) };
      const interfaces = await service.getLXCInterfaces(102);
      expect(interfaces).toEqual([]);
    });
  });

  describe('deleteLXC', () => {
    it('should delete LXC container', async () => {
      service.client = { delete: jest.fn().mockResolvedValueOnce({ data: { data: 'UPID:...' } }) };
      const taskId = await service.deleteLXC(102);
      expect(taskId).toBeDefined();
    });

    it('should throw error when delete fails', async () => {
      service.client = { delete: jest.fn().mockRejectedValue(new Error('Failed')) };
      await expect(service.deleteLXC(102)).rejects.toThrow();
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

    it('should throw error when create snapshot fails', async () => {
      service.client = { post: jest.fn().mockRejectedValue(new Error('Failed')) };
      await expect(service.createLXCSnapshot(100, 'snap1')).rejects.toThrow();
    });

    it('should list snapshots', async () => {
      const mockSnaps = [{ name: 'snap1' }, { name: 'current' }];
      service.client = { get: jest.fn().mockResolvedValue({ data: { data: mockSnaps } }) };
      const snapshots = await service.listLXCSnapshots(100);
      expect(snapshots).toHaveLength(1); // 'current' filtered out
      expect(snapshots[0].name).toBe('snap1');
    });

    it('should throw error when list snapshots fails', async () => {
      service.client = { get: jest.fn().mockRejectedValue(new Error('Failed')) };
      await expect(service.listLXCSnapshots(100)).rejects.toThrow();
    });

    it('should delete snapshot', async () => {
      service.client = { delete: jest.fn().mockResolvedValue({ data: { data: 'UPID:del' } }) };
      await service.deleteLXCSnapshot(100, 'snap1');
      expect(service.client.delete).toHaveBeenCalledWith(
        expect.stringContaining('/snapshot/snap1')
      );
    });

    it('should throw error when delete snapshot fails', async () => {
      service.client = { delete: jest.fn().mockRejectedValue(new Error('Failed')) };
      await expect(service.deleteLXCSnapshot(100, 'snap1')).rejects.toThrow();
    });

    it('should rollback snapshot', async () => {
      service.client = { post: jest.fn().mockResolvedValue({ data: { data: 'UPID:roll' } }) };
      await service.rollbackLXCSnapshot(100, 'snap1');
      expect(service.client.post).toHaveBeenCalledWith(
        expect.stringContaining('/snapshot/snap1/rollback'),
        {}
      );
    });

    it('should throw error when rollback snapshot fails', async () => {
      service.client = { post: jest.fn().mockRejectedValue(new Error('Failed')) };
      await expect(service.rollbackLXCSnapshot(100, 'snap1')).rejects.toThrow();
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

    it('should throw error when create backup fails', async () => {
      service.client = { post: jest.fn().mockRejectedValue(new Error('Failed')) };
      await expect(service.createLXCBackup(100)).rejects.toThrow();
    });

    it('should list backups', async () => {
      const mockBackups = [{ vmid: 100, volid: 'backup1' }, { vmid: 101 }];
      service.client = { get: jest.fn().mockResolvedValue({ data: { data: mockBackups } }) };
      const backups = await service.listBackups('local', 100);
      expect(backups).toHaveLength(1);
      expect(backups[0].volid).toBe('backup1');
    });

    it('should throw error when list backups fails', async () => {
      service.client = { get: jest.fn().mockRejectedValue(new Error('Failed')) };
      await expect(service.listBackups('local')).rejects.toThrow();
    });

    it('should delete backup', async () => {
      service.client = { delete: jest.fn().mockResolvedValue({ data: { data: 'UPID:del' } }) };
      await service.deleteBackup('local', 'backup1');
      expect(service.client.delete).toHaveBeenCalled();
    });

    it('should throw error when delete backup fails', async () => {
      service.client = { delete: jest.fn().mockRejectedValue(new Error('Failed')) };
      await expect(service.deleteBackup('local', 'bkp1')).rejects.toThrow();
    });

    it('should get backup download ticket', async () => {
      service.client = { post: jest.fn().mockResolvedValue({ data: { data: { ticket: 'abc' } } }) };
      const ticket = await service.getBackupDownloadTicket('vol1');
      expect(ticket).toEqual({ ticket: 'abc' });
    });

    it('should fallback to volid if ticket fails', async () => {
      service.client = { post: jest.fn().mockRejectedValue(new Error('Fail')) };
      const ticket = await service.getBackupDownloadTicket('vol1');
      expect(ticket).toEqual({ volid: 'vol1' });
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

    it('should throw error when add rule fails', async () => {
      service.client = { post: jest.fn().mockRejectedValue(new Error('Failed')) };
      await expect(service.addFirewallRule(100, {})).rejects.toThrow();
    });

    it('should set firewall options', async () => {
      service.client = { put: jest.fn().mockResolvedValue({ data: { data: 'ok' } }) };
      await service.setFirewallOptions(100, { enable: 1 });
      expect(service.client.put).toHaveBeenCalledWith(
        expect.stringContaining('/firewall/options'),
        { enable: 1 }
      );
    });

    it('should throw error when set options fails', async () => {
      service.client = { put: jest.fn().mockRejectedValue(new Error('Failed')) };
      await expect(service.setFirewallOptions(100, {})).rejects.toThrow();
    });
  });

  describe('rebootLXC', () => {
    it('should reboot LXC container', async () => {
      const upid = 'UPID:node:123:456:task';
      service.client = { post: jest.fn().mockResolvedValue({ data: { data: upid } }) };
      const rebootTaskId = await service.rebootLXC('100');
      expect(rebootTaskId).toBe(upid);
    });

    it('should throw error when reboot fails', async () => {
      service.client = { post: jest.fn().mockRejectedValue(new Error('Failed')) };
      await expect(service.rebootLXC('100')).rejects.toThrow();
    });
  });

  describe('getLXCConfig', () => {
    it('should get LXC config', async () => {
      const config = { net0: 'bridge=vmbr0' };
      service.client = { get: jest.fn().mockResolvedValue({ data: { data: config } }) };
      const lxcConfig = await service.getLXCConfig('100');
      expect(lxcConfig).toEqual(config);
    });

    it('should throw error when get config fails', async () => {
      service.client = { get: jest.fn().mockRejectedValue(new Error('Failed')) };
      await expect(service.getLXCConfig('100')).rejects.toThrow();
    });
  });

  describe('deleteVolume', () => {
    it('should delete volume', async () => {
      service.client = { delete: jest.fn().mockResolvedValue({ data: { data: 'UPID:ok' } }) };
      await service.deleteVolume('local:backup/vzdump-100.tar');
      expect(service.client.delete).toHaveBeenCalledWith(expect.stringContaining('local'));
    });

    it('should throw on invalid format', async () => {
      await expect(service.deleteVolume('invalid')).rejects.toThrow('Invalid volid format');
    });

    it('should throw on api error', async () => {
      service.client = { delete: jest.fn().mockRejectedValue(new Error('Fail')) };
      await expect(service.deleteVolume('local:bkp/file')).rejects.toThrow();
    });
  });
});
