import { test, expect, Page } from '@playwright/test';

// Test user credentials (use test account)
const TEST_USER = {
    email: 'test@example.com',
    password: 'TestPassword123!',
    name: 'Test User',
};

test.describe('Authentication', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });

    test('should display login page', async ({ page }) => {
        await page.goto('/login');
        await expect(page.getByRole('heading', { name: /connexion/i })).toBeVisible();
        await expect(page.getByPlaceholder(/email/i)).toBeVisible();
        await expect(page.getByPlaceholder(/mot de passe/i)).toBeVisible();
    });

    test('should show error on invalid credentials', async ({ page }) => {
        await page.goto('/login');

        await page.getByPlaceholder(/email/i).fill('invalid@test.com');
        await page.getByPlaceholder(/mot de passe/i).fill('wrongpassword');
        await page.getByRole('button', { name: /se connecter/i }).click();

        // Should show error message
        await expect(page.getByText(/erreur|invalide|incorrect/i)).toBeVisible({ timeout: 5000 });
    });

    test('should display register page', async ({ page }) => {
        await page.goto('/register');
        await expect(page.getByRole('heading', { name: /inscription|créer/i })).toBeVisible();
    });

    test('should navigate between login and register', async ({ page }) => {
        await page.goto('/login');

        // Find and click register link
        await page.getByRole('link', { name: /inscription|créer un compte/i }).click();
        await expect(page).toHaveURL(/register/);

        // Go back to login
        await page.getByRole('link', { name: /connexion|se connecter/i }).click();
        await expect(page).toHaveURL(/login/);
    });
});

test.describe('Protected Routes', () => {
    test('should redirect to login when not authenticated', async ({ page }) => {
        await page.goto('/dashboard');

        // Should redirect to login
        await expect(page).toHaveURL(/login/);
    });
});
