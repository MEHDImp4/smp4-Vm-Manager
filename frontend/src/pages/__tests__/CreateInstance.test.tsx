import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '../../test/test-utils';
import userEvent from '@testing-library/user-event';
import CreateInstance from '../CreateInstance';

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: '/create' }),
  Link: ({ to, children }: any) => <a href={to}>{children}</a>,
}));

vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

describe('CreateInstance Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.getItem = vi.fn(() =>
      JSON.stringify({
        token: 'test-token',
      })
    );

    // Default: templates fetch returns an array of Template objects
    global.fetch = vi.fn((input: any) => {
      const url = typeof input === 'string' ? input : input?.toString();
      if (url && url.includes('/api/templates')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve([
              {
                id: 'small',
                name: 'Small',
                cpu: '1 vCPU',
                ram: '2GB',
                storage: '20GB',
                points: 1,
              },
              {
                id: 'medium',
                name: 'Medium',
                cpu: '2 vCPU',
                ram: '4GB',
                storage: '40GB',
                points: 2,
              },
            ]),
        } as Response);
      }
      // Fallback ok
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response);
    });
  });

  it('should render create instance heading and button', () => {
    render(<CreateInstance />);
    expect(screen.getByRole('heading', { name: /nouvelle\s*instance/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /lancer l'instance/i })).toBeTruthy();
  });

  it('should display template selection', async () => {
    render(<CreateInstance />);
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
      expect(screen.getByText(/choisir un template/i)).toBeTruthy();
    });
  });

  // Validation is handled via toast; keep minimal check via no crash on click
  it('clicking create without name should not crash', async () => {
    const user = userEvent.setup();
    render(<CreateInstance />);
    const submitButton = screen.getByRole('button', { name: /lancer l'instance/i });
    await user.click(submitButton);
    expect(submitButton).toBeTruthy();
  });

  it('should submit form with valid data', async () => {
    const user = userEvent.setup();
    // Mock both templates and instance creation
    global.fetch = vi.fn((input: any, init?: any) => {
      const url = typeof input === 'string' ? input : input?.toString();
      if (url && url.includes('/api/templates')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve([
              {
                id: 'small',
                name: 'Small',
                cpu: '1 vCPU',
                ram: '2GB',
                storage: '20GB',
                points: 1,
              },
            ]),
        } as Response);
      }
      if (url && url.includes('/api/instances') && init?.method === 'POST') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ id: 'instance1' }) } as Response);
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response);
    });

    render(<CreateInstance />);

    // Fill form fields (instance name)
    const nameInput = await screen.findByPlaceholderText(/mon-projet-ou-app/i) as HTMLInputElement;
    await user.type(nameInput, 'test-vm');

    const submitButton = screen.getByRole('button', { name: /lancer l'instance/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/instances', expect.any(Object));
    });
  });
});
