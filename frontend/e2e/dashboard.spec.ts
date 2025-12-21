import { test, expect, Page } from '@playwright/test';

// Helper to login
async function login(page: Page) {
    await page.goto('/login');
    await page.getByPlaceholder(/email/i).fill('test@example.com');
    await page.getByPlaceholder(/mot de passe/i).fill('TestPassword123!');
    await page.getByRole('button', { name: /se connecter/i }).click();
    await page.waitForURL(/dashboard|feed/);
}

test.describe('Dashboard', () => {
    test.beforeEach(async ({ page }) => {
        await login(page);
    });

    test('should display dashboard after login', async ({ page }) => {
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    });

    test('should show navigation menu', async ({ page }) => {
        await expect(page.getByRole('link', { name: /accueil|home/i })).toBeVisible();
        await expect(page.getByRole('link', { name: /instances|vms/i })).toBeVisible();
    });

    test('should navigate to instances page', async ({ page }) => {
        await page.getByRole('link', { name: /instances|vms/i }).click();
        await expect(page).toHaveURL(/instances/);
    });

    test('should show user points', async ({ page }) => {
        await expect(page.getByText(/points/i)).toBeVisible();
    });
});
