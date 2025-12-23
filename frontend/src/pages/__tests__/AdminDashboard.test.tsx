import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '../../test/test-utils';
import AdminDashboard from '../admin/AdminDashboard';
import { ReactNode } from 'react';

// Mock router
vi.mock('react-router-dom', () => ({
    useNavigate: () => vi.fn(),
    Link: ({ to, children }: { to: string; children: ReactNode }) => <a href={to}>{children}</a>,
}));

vi.mock('sonner', () => ({
    toast: { error: vi.fn(), success: vi.fn() },
}));

describe('AdminDashboard Page', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.getItem = vi.fn(() => JSON.stringify({ token: 'test-token' }));

        global.fetch = vi.fn((input: RequestInfo | URL) => {
            const url = typeof input === 'string' ? input : input.toString();

            // Default empty responses for other endpoints
            if (url.includes('/admin/users')) return Promise.resolve({ ok: true, json: () => Promise.resolve([]) } as Response);
            if (url.includes('/admin/instances')) return Promise.resolve({ ok: true, json: () => Promise.resolve([]) } as Response);
            if (url.includes('/admin/node/stats')) return Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response);
            if (url.includes('/admin/templates')) return Promise.resolve({ ok: true, json: () => Promise.resolve([]) } as Response);

            // Upgrades endpoint
            if (url.includes('/admin/upgrades')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve([
                        { id: 1, name: 'Pack CPU', type: 'cpu', amount: 1, pointsCost: 10, isActive: true }
                    ])
                } as Response);
            }
            return Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response);
        });
    });

    it('should render and show upgrades tab', async () => {
        render(<AdminDashboard />);

        // Wait for initial load
        await waitFor(() => {
            expect(screen.getByText(/Administration/i)).toBeTruthy();
        });

        // Find Upgrades tab trigger
        const upgradesTab = await screen.findByText(/Upgrades/i);
        expect(upgradesTab).toBeTruthy();

        // Click it
        fireEvent.click(upgradesTab);

        // Check content
        await waitFor(() => {
            expect(screen.getByText(/Pack CPU/i)).toBeTruthy();
            expect(screen.getByText(/10 pts/i)).toBeTruthy();
        });
    });
});
