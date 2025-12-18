// Jest setup file
process.env.JWT_SECRET = 'test-secret';
process.env.DATABASE_URL = 'file:./test.db';
process.env.PROXMOX_URL = 'https://proxmox.test:8006';
process.env.PROXMOX_API_TOKEN = 'test-token';
process.env.PROXMOX_NODE = 'pve';
process.env.LXC_SSH_PASSWORD = 'test-password';
process.env.BACKEND_IP = '127.0.0.1';
process.env.CF_ACCOUNT_ID = 'test-account';
process.env.CF_API_TOKEN = 'test-cf-token';
process.env.CF_TUNNEL_ID = 'test-tunnel';
process.env.CF_TUNNEL_TOKEN = 'test-tunnel-token';
process.env.VPN_ENDPOINT = 'test-vpn.com';

// Mock global objects
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};
