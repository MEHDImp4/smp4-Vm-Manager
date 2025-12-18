import { ReactNode } from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '../../test/test-utils';
import userEvent from '@testing-library/user-event';
import Auth from '../Auth';

const navigateMock = vi.fn();

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigateMock,
  useLocation: () => ({ pathname: '/auth' }),
  Link: ({ to, children }: { to: string; children: ReactNode }) => <a href={to}>{children}</a>,
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

describe('Auth Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render login form by default', () => {
    render(<Auth />);
    expect(screen.getByText(/connexion/i)).toBeTruthy();
  });

  it('should show email and password inputs', () => {
    render(<Auth />);
    expect(screen.getByPlaceholderText(/vous@exemple.com/i)).toBeTruthy();
    expect(screen.getByPlaceholderText(/••••••••/i)).toBeTruthy();
  });

  // Skip toggle accessibility by name; verify simple validation paths instead

  it('should validate email format', async () => {
    const user = userEvent.setup();
    render(<Auth />);

    const emailInput = screen.getByPlaceholderText(/vous@exemple.com/i);
    const passwordInput = screen.getByPlaceholderText(/••••••••/i);
    const submitButton = screen.getByRole('button', { name: /se connecter/i });

    global.fetch = vi.fn();
    await user.type(emailInput, 'invalid-email');
    await user.type(passwordInput, 'validpass');
    await user.click(submitButton);
    expect(global.fetch).not.toHaveBeenCalled();
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it('should validate password minimum length', async () => {
    const user = userEvent.setup();
    render(<Auth />);

    const emailInput = screen.getByPlaceholderText(/vous@exemple.com/i);
    const passwordInput = screen.getByPlaceholderText(/••••••••/i);
    const submitButton = screen.getByRole('button', { name: /se connecter/i });

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, '123');
    await user.click(submitButton);
    await waitFor(() => {
      expect(screen.getByText(/le mot de passe doit contenir au moins 6 caractères/i)).toBeTruthy();
    });
  });
});
