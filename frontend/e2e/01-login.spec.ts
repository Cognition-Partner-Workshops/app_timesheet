import { test, expect } from '@playwright/test';

const TEST_EMAIL = 'e2e-login-test@timetracker.com';

test.describe('Login Page', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any stored auth state
    await page.goto('/login');
    await page.evaluate(() => localStorage.clear());
    await page.goto('/login');
  });

  test('should display the login page with correct elements', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Time Tracker' })).toBeVisible();
    await expect(page.getByText('Enter your email to log in')).toBeVisible();
    await expect(page.getByText('This app intentionally does not have a password field')).toBeVisible();
    await expect(page.getByLabel('Email Address')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Log In' })).toBeVisible();
  });

  test('should disable login button when email is empty', async ({ page }) => {
    const loginButton = page.getByRole('button', { name: 'Log In' });
    await expect(loginButton).toBeDisabled();
  });

  test('should enable login button when email is entered', async ({ page }) => {
    await page.getByLabel('Email Address').fill(TEST_EMAIL);
    const loginButton = page.getByRole('button', { name: 'Log In' });
    await expect(loginButton).toBeEnabled();
  });

  test('should login successfully and redirect to dashboard', async ({ page }) => {
    await page.getByLabel('Email Address').fill(TEST_EMAIL);
    await page.getByRole('button', { name: 'Log In' }).click();

    // Wait for redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

    // User email should be displayed in the top bar
    await expect(page.getByText(TEST_EMAIL)).toBeVisible();
  });

  test('should redirect unauthenticated users to login page', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });
});
