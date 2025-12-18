import { ReactNode } from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '../../test/test-utils';
import Dashboard from '../Dashboard';

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: '/dashboard' }),
  Link: ({ to, children }: { to: string; children: ReactNode }) => <a href={to}>{children}</a>,
}));

// Dashboard uses sonner's toast; keep sonner mock below

vi.mock('sonner', () => ({
  toast: vi.fn(),
}));

describe('Dashboard Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.getItem = vi.fn(() =>
      JSON.stringify({
        token: 'test-token',
        points: 1000,
      })
    );

    global.fetch = vi.fn((input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url && url.includes('/api/instances')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve([
              {
                id: '1',
                name: 'test-vm',
                template: 'Small',
                status: 'online',
                pointsPerDay: 10,
                type: 'ct',
              },
            ]),
        } as Response);
      }
      if (url && url.includes('/api/auth/me')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ points: 1000 }) } as Response);
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response);
    });
  });

  it('should render dashboard title', () => {
    render(<Dashboard />);
    expect(screen.getByText(/mes instances/i)).toBeTruthy();
  });

  it('should display create instance link', () => {
    render(<Dashboard />);
    // The action uses Link asChild, so the accessible element is a link
    expect(screen.getByRole('link', { name: /nouvelle vm/i })).toBeTruthy();
  });

  it('should load and display instances', async () => {
    render(<Dashboard />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  it('should show loading message initially', () => {
    render(<Dashboard />);
    expect(screen.getByText(/chargement/i)).toBeTruthy();
  });
});
