import { test, expect } from '@playwright/test';
import { loginViaApi } from './helpers';

const TEST_EMAIL = 'e2e-dashboard-test@timetracker.com';

test.describe('Dashboard Page', () => {
  test.beforeEach(async ({ page }) => {
    // Login via API to avoid rate limiting
    await page.goto('/login');
    await loginViaApi(page, TEST_EMAIL);
  });

  test('should display dashboard with stats cards', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

    // Stats cards
    await expect(page.getByText('Total Clients')).toBeVisible();
    await expect(page.getByText('Total Work Entries')).toBeVisible();
    await expect(page.getByText('Total Hours')).toBeVisible();
  });

  test('should display quick actions section', async ({ page }) => {
    await expect(page.getByText('Quick Actions')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add Client' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add Work Entry' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'View Reports' })).toBeVisible();
  });

  test('should display recent work entries section', async ({ page }) => {
    await expect(page.getByText('Recent Work Entries')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add Entry' })).toBeVisible();
  });

  test('should navigate to sidebar menu items', async ({ page }) => {
    // Navigate to Clients page via sidebar
    await page.getByRole('button', { name: 'Clients' }).click();
    await expect(page).toHaveURL(/\/clients/);

    // Navigate to Work Entries page via sidebar
    await page.getByRole('button', { name: 'Work Entries' }).click();
    await expect(page).toHaveURL(/\/work-entries/);

    // Navigate to Reports page via sidebar
    await page.getByRole('button', { name: 'Reports' }).click();
    await expect(page).toHaveURL(/\/reports/);

    // Navigate back to Dashboard via sidebar
    await page.getByRole('button', { name: 'Dashboard' }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('should navigate to clients page from Add Client quick action', async ({ page }) => {
    await page.getByRole('button', { name: 'Add Client' }).click();
    await expect(page).toHaveURL(/\/clients/);
  });

  test('should navigate to work entries page from Add Work Entry quick action', async ({ page }) => {
    await page.getByRole('button', { name: 'Add Work Entry' }).click();
    await expect(page).toHaveURL(/\/work-entries/);
  });

  test('should navigate to reports page from View Reports quick action', async ({ page }) => {
    await page.getByRole('button', { name: 'View Reports' }).click();
    await expect(page).toHaveURL(/\/reports/);
  });
});
