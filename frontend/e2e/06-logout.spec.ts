import { test, expect } from '@playwright/test';

const TEST_EMAIL = 'e2e-logout-test@timetracker.com';

test.describe('Logout Flow', () => {
  test('should logout successfully and redirect to login page', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.evaluate(() => localStorage.clear());
    await page.goto('/login');
    await page.getByLabel('Email Address').fill(TEST_EMAIL);
    await page.getByRole('button', { name: 'Log In' }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
    await expect(page.getByText('Dashboard')).toBeVisible();

    // Click logout
    await page.getByRole('button', { name: 'Logout' }).click();

    // Should redirect to login page
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
    await expect(page.getByRole('heading', { name: 'Time Tracker' })).toBeVisible();
  });

  test('should not be able to access dashboard after logout', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.evaluate(() => localStorage.clear());
    await page.goto('/login');
    await page.getByLabel('Email Address').fill(TEST_EMAIL);
    await page.getByRole('button', { name: 'Log In' }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

    // Logout
    await page.getByRole('button', { name: 'Logout' }).click();
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });

    // Try to access dashboard directly
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });

  test('should be able to login again after logout', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.evaluate(() => localStorage.clear());
    await page.goto('/login');
    await page.getByLabel('Email Address').fill(TEST_EMAIL);
    await page.getByRole('button', { name: 'Log In' }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

    // Logout
    await page.getByRole('button', { name: 'Logout' }).click();
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });

    // Login again with same email
    await page.getByLabel('Email Address').fill(TEST_EMAIL);
    await page.getByRole('button', { name: 'Log In' }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
    await expect(page.getByText('Dashboard')).toBeVisible();
  });
});
