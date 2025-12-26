import { ReactNode } from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '../../test/test-utils';
import InstanceDetails from '../InstanceDetails';
import { toast } from 'sonner';

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useParams: () => ({ id: 'instance1' }),
  Link: ({ to, children }: { to: string; children: ReactNode }) => <a href={to}>{children}</a>,
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
  },
}));

// Mock XTerminal
vi.mock('xterm', () => ({
  Terminal: vi.fn().mockImplementation(() => ({
    open: vi.fn(),
    write: vi.fn(),
    dispose: vi.fn(),
    loadAddon: vi.fn(),
    onData: vi.fn(),
    onResize: vi.fn(),
  })),
}));

vi.mock('xterm-addon-fit', () => ({
  FitAddon: vi.fn().mockImplementation(() => ({
    fit: vi.fn(),
  })),
}));

describe('InstanceDetails Page', () => {

  const mockInstance = {
    id: 'instance1',
    name: 'test-vm',
    status: 'online',
    vmid: 100,
    cpu: 2,
    ram: 4,
    storage: 40,
  };

  const mockStats = {
    cpu: 50,
    ram: 30,
    storage: 70,
    diskBytes: 10 * 1024 * 1024 * 1024,
    maxDiskBytes: 40 * 1024 * 1024 * 1024,
    ip: '192.168.1.100',
    status: 'online',
    rootPassword: 'smp4-root',
    uptime: 3600,
  };

  const mockSnapshots = {
    snapshots: [
      { id: 'snap1', name: 'Backup 1', createdAt: '2023-01-01' }
    ],
    maxSnapshots: 3,
    backups: []
  };

  const mockUpgrades = [
    { id: 1, name: '+1 vCPU', type: 'cpu', amount: 1, pointsCost: 5, isActive: true },
    { id: 2, name: '+4 GB RAM', type: 'ram', amount: 4, pointsCost: 8, isActive: true },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.getItem = vi.fn(() => JSON.stringify({ token: 'test-token', id: 'user1' }));

    // URL-aware fetch mocks
    global.fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();
      const method = init?.method || 'GET';

      // Instances
      if (url.endsWith('/api/instances') && method === 'GET') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: [mockInstance] }),
        } as Response);
      }

      // Stats
      if (url.includes('/stats')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockStats),
        } as Response);
      }

      // Snapshots List
      if (url.includes('/snapshots') && method === 'GET') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockSnapshots) } as Response);
      }

      // Create Snapshot
      if (url.includes('/snapshots') && method === 'POST' && !url.includes('restore')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response);
      }

      // Restore Snapshot
      if (url.includes('/restore') && method === 'POST') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response);
      }

      // Delete Snapshot
      if (url.includes('/snapshots/snap1') && method === 'DELETE') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response);
      }

      // Upgrades List
      if (url.endsWith('/api/upgrades')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockUpgrades) } as Response);
      }

      // Purchase Upgrade
      if (url.includes('/upgrade') && method === 'POST') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response);
      }

      // Restart
      if (url.includes('/restart') && method === 'POST') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response);
      }

      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response);
    });
  });

  it('should render instance details', async () => {
    render(<InstanceDetails />);
    await waitFor(() => expect(screen.getByText(/test-vm/i)).toBeInTheDocument());
  });

  describe('Snapshots', () => {
    it('should open create snapshot dialog and submit', async () => {
      render(<InstanceDetails />);
      await waitFor(() => expect(screen.getByText(/Backup 1/i)).toBeInTheDocument());

      // Click Create Backup button (button name "Créer" with icon)
      const createBtn = screen.getByRole('button', { name: /Créer/i });
      fireEvent.click(createBtn);

      // Dialog should open
      const dialog = await screen.findByRole('dialog');
      expect(dialog).toBeInTheDocument();
      expect(screen.getByText(/Créer un backup/i)).toBeInTheDocument();

      const input = screen.getByPlaceholderText(/Ex: Avant mise à jour/i);
      fireEvent.change(input, { target: { value: 'New Backup' } });

      const confirmBtn = screen.getByRole('button', { name: /Créer/i }); // Dialog submit button also named Créer
      // The first one is likely the one outside if we don't scope. 
      // But verify: The dialog button is inside dialog.
      const dialogCreateBtn = within(dialog).getByRole('button', { name: /Créer/i });
      fireEvent.click(dialogCreateBtn);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith("Backup créé avec succès");
      });
    });

    it('should handle restore snapshot', async () => {
      render(<InstanceDetails />);
      await waitFor(() => expect(screen.getByText(/Backup 1/i)).toBeInTheDocument());

      // Find restore button
      const restoreBtn = screen.getAllByTitle(/Restaurer/i)[0];
      fireEvent.click(restoreBtn);

      // Confirm dialog
      expect(screen.getByRole('heading', { name: /Restaurer le backup/i })).toBeInTheDocument();
      const confirmBtn = screen.getByText(/Continuer/i);
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith("Backup restauré avec succès");
      });
    });

    it('should handle delete snapshot', async () => {
      render(<InstanceDetails />);
      await waitFor(() => expect(screen.getByText(/Backup 1/i)).toBeInTheDocument());

      // Find delete button
      const deleteBtn = screen.getAllByTitle(/Supprimer/i)[0];
      fireEvent.click(deleteBtn);

      // Confirm
      expect(screen.getByRole('heading', { name: /Supprimer le backup/i })).toBeInTheDocument();
      const confirmBtn = screen.getByText(/Continuer/i);
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith("Backup supprimé");
      });
    });
  });

  describe('Upgrades', () => {
    it('should purchase an upgrade', async () => {
      // Temporarily mock window.location.reload
      Object.defineProperty(window, 'location', {
        configurable: true,
        value: { reload: vi.fn() },
      });

      render(<InstanceDetails />);
      await waitFor(() => expect(screen.getByText(/Améliorer/i)).toBeInTheDocument());

      fireEvent.click(screen.getByText(/Améliorer/i));

      // Dialog opens
      const dialog = await screen.findByRole('dialog');
      expect(dialog).toBeInTheDocument();

      // Find the pack element. The pack is rendered, click it to purchase.
      // The pack card has an onClick handler.
      const packCard = screen.getByText(/\+1 vCPU/i).closest('div.group'); // It is a div with onClick
      // Or just click the text
      fireEvent.click(screen.getByText(/\+1 vCPU/i));

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith("Amélioration appliquée avec succès !");
        expect(window.location.reload).toHaveBeenCalled();
      });
    });
  });

  describe('Power Actions', () => {
    it('should handle restart action with confirmation', async () => {
      render(<InstanceDetails />);
      await waitFor(() => expect(screen.getByText(/test-vm/i)).toBeInTheDocument());

      // Click "Redémarrer" button
      const restartBtn = screen.getByRole('button', { name: /Redémarrer/i });
      fireEvent.click(restartBtn);

      // Confirm
      const confirmBtn = await screen.findByText("Continuer");
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith("Redémarrage en cours...");
      });
    });
  });

});
