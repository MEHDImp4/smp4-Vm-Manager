import { ReactNode } from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '../../test/test-utils';
import userEvent from '@testing-library/user-event';
import InstanceDetails from '../InstanceDetails';

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useParams: () => ({ id: 'instance1' }),
  Link: ({ to, children }: { to: string; children: ReactNode }) => <a href={to}>{children}</a>,
}));

// InstanceDetails uses sonner's toast; see mock below

vi.mock('sonner', () => ({
  toast: vi.fn(),
}));

describe('InstanceDetails Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.getItem = vi.fn(() => JSON.stringify({ token: 'test-token' }));

    // URL-aware fetch mocks for the component requests
    global.fetch = vi.fn((input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url && url.endsWith('/api/instances')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              data: [
                {
                  id: 'instance1',
                  name: 'test-vm',
                  status: 'online',
                  vmid: 100,
                  cpu: '2 vCPU',
                  ram: '4GB',
                  storage: '40GB',
                },
              ]
            }),
        } as Response);
      }
      if (url && url.includes('/stats')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              cpu: 50,
              ram: 30,
              storage: 70,
              diskBytes: 10 * 1024 * 1024 * 1024,
              maxDiskBytes: 40 * 1024 * 1024 * 1024,
              ip: '192.168.1.100',
              status: 'online',
              rootPassword: 'smp4-root',
              uptime: 3600,
            }),
        } as Response);
      }
      if (url && url.includes('/snapshots')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ snapshots: [], maxSnapshots: 3 }) } as Response);
      }
      if (url && url.includes('/domains')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) } as Response);
      }
      if (url && url.endsWith('/api/upgrades')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([
            { id: 1, name: '+1 vCPU', type: 'cpu', amount: 1, pointsCost: 5, isActive: true },
            { id: 2, name: '+4 GB RAM', type: 'ram', amount: 4, pointsCost: 8, isActive: true },
          ])
        } as Response);
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response);
    });
  });

  it('should render instance details', async () => {
    render(<InstanceDetails />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  it('should display instance hostname', async () => {
    render(<InstanceDetails />);

    await waitFor(() => {
      expect(screen.getByText(/test-vm/i)).toBeTruthy();
    });
  });

  it('should show start button when stopped', async () => {
    // Override instances fetch to return stopped status
    global.fetch = vi.fn((input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url && url.endsWith('/api/instances')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              data: [
                {
                  id: 'instance1',
                  name: 'test-vm',
                  status: 'stopped',
                  vmid: 100,
                  cpu: '2 vCPU',
                  ram: '4GB',
                  storage: '40GB',
                },
              ]
            }),
        } as Response);
      }
      if (url && url.includes('/stats')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ cpu: 0, ram: 0, storage: 0, diskBytes: 0, maxDiskBytes: 0, ip: null, status: 'stopped', rootPassword: null, uptime: 0 }) } as Response);
      }
      if (url && url.includes('/snapshots')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ snapshots: [], maxSnapshots: 3 }) } as Response);
      }
      if (url && url.includes('/domains')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) } as Response);
      }
      if (url && url.endsWith('/api/upgrades')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) } as Response);
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response);
    });

    render(<InstanceDetails />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^démarrer$/i })).toBeTruthy();
    });
  });

  it('should show stop button when running', async () => {
    render(<InstanceDetails />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /arrêter|stop/i })).toBeTruthy();
    });
  });

  it('should display instance stats', async () => {
    render(<InstanceDetails />);

    await waitFor(() => {
      expect(screen.getByText(/cpu usage/i)).toBeTruthy();
    });
  });

  it('should show upgrade dialog when Améliorer is clicked', async () => {
    render(<InstanceDetails />);

    const upgradeBtn = await screen.findByRole('button', { name: /améliorer/i });
    expect(upgradeBtn).toBeTruthy();

    fireEvent.click(upgradeBtn);

    expect(global.fetch).toHaveBeenCalledWith(expect.stringMatching(/\/api\/upgrades/));

    await waitFor(() => {
      expect(screen.getByText(/Améliorer mon instance/i)).toBeTruthy();
      expect(screen.getByText(/\+1 vCPU/i)).toBeTruthy();
      expect(screen.getByText(/\+4 GB RAM/i)).toBeTruthy();
    });
  });
});
