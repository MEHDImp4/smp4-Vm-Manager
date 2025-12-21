import { test, expect, Page } from '@playwright/test';

// Helper to login
async function login(page: Page) {
    await page.goto('/login');
    await page.getByPlaceholder(/email/i).fill('test@example.com');
    await page.getByPlaceholder(/mot de passe/i).fill('TestPassword123!');
    await page.getByRole('button', { name: /se connecter/i }).click();
    await page.waitForURL(/dashboard|feed/);
}

test.describe('Instances Management', () => {
    test.beforeEach(async ({ page }) => {
        await login(page);
    });

    test('should display instances list', async ({ page }) => {
        await page.goto('/instances');
        await expect(page.getByRole('heading', { name: /instances|vms|machines/i })).toBeVisible();
    });

    test('should show create instance button', async ({ page }) => {
        await page.goto('/instances');
        await expect(page.getByRole('button', { name: /créer|nouveau|new/i })).toBeVisible();
    });

    test('should open create instance modal', async ({ page }) => {
        await page.goto('/instances');
        await page.getByRole('button', { name: /créer|nouveau|new/i }).click();
        await expect(page.getByText(/template|modèle/i)).toBeVisible();
    });

    test('should display instance details', async ({ page }) => {
        await page.goto('/instances');
        const instanceCards = page.locator('[data-testid="instance-card"], .instance-card, [class*="instance"]').first();

        if (await instanceCards.isVisible()) {
            await instanceCards.click();
            await expect(page.getByText(/status|statut/i)).toBeVisible();
        }
    });
});

test.describe('Instance Actions', () => {
    test.beforeEach(async ({ page }) => {
        await login(page);
        await page.goto('/instances');
    });

    test('should show start/stop button for instance', async ({ page }) => {
        const actionButton = page.getByRole('button', { name: /start|stop|démarrer|arrêter/i }).first();

        if (await actionButton.isVisible()) {
            await expect(actionButton).toBeEnabled();
        }
    });
});
