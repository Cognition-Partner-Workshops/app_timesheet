import { test as setup, expect } from '@playwright/test';

const TEST_EMAIL = 'e2e-test@timetracker.com';

setup('authenticate user', async ({ page }) => {
  await page.goto('/login');

  // Verify login page loads
  await expect(page.getByRole('heading', { name: 'Time Tracker' })).toBeVisible();
  await expect(page.getByText('Enter your email to log in')).toBeVisible();

  // Fill in email and submit
  await page.getByLabel('Email Address').fill(TEST_EMAIL);
  await page.getByRole('button', { name: 'Log In' }).click();

  // Should redirect to dashboard
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
  await expect(page.getByText('Dashboard')).toBeVisible();

  // Store auth state for reuse
  await page.context().storageState({ path: 'e2e/.auth/user.json' });
});
