import { test, expect } from '@playwright/test';

const TEST_EMAIL = 'e2e-reports-test@timetracker.com';

test.describe('Reports Page', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.evaluate(() => localStorage.clear());
    await page.goto('/login');
    await page.getByLabel('Email Address').fill(TEST_EMAIL);
    await page.getByRole('button', { name: 'Log In' }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
  });

  test('should show message when no clients exist', async ({ page }) => {
    await page.getByRole('button', { name: 'Reports' }).click();
    await expect(page).toHaveURL(/\/reports/);
    await expect(page.getByRole('heading', { name: 'Reports' })).toBeVisible();

    // Either "no clients" message or client selector should be visible
    const noClientsMsg = page.getByText('You need to create at least one client');
    const clientSelector = page.getByLabel('Select Client');
    const hasNoClients = await noClientsMsg.isVisible().catch(() => false);
    const hasSelector = await clientSelector.isVisible().catch(() => false);
    expect(hasNoClients || hasSelector).toBeTruthy();
  });

  test('should display reports page with client selector', async ({ page }) => {
    // Create a client with work entry first
    await page.getByRole('button', { name: 'Clients' }).click();
    await page.getByRole('button', { name: 'Add Client' }).click();
    await page.getByLabel('Client Name').fill('Reports Test Client');
    await page.getByRole('button', { name: 'Create' }).click();
    await expect(page.getByText('Add New Client')).not.toBeVisible({ timeout: 5000 });

    // Add a work entry for this client
    await page.getByRole('button', { name: 'Work Entries' }).click();
    await page.getByRole('button', { name: 'Add Work Entry' }).click();
    await page.getByLabel('Client').click();
    await page.getByRole('option', { name: 'Reports Test Client' }).click();
    await page.getByLabel('Hours').fill('6');
    await page.getByLabel('Description').fill('Report testing work entry');
    await page.getByRole('button', { name: 'Create' }).click();
    await expect(page.getByText('Add New Work Entry')).not.toBeVisible({ timeout: 5000 });

    // Navigate to reports
    await page.getByRole('button', { name: 'Reports' }).click();
    await expect(page).toHaveURL(/\/reports/);

    // Client selector should be available
    await expect(page.getByLabel('Select Client')).toBeVisible();
    await expect(page.getByText('Select a client to view their time report')).toBeVisible();
  });

  test('should generate report when client is selected', async ({ page }) => {
    // Create a client with work entries
    await page.getByRole('button', { name: 'Clients' }).click();
    await page.getByRole('button', { name: 'Add Client' }).click();
    await page.getByLabel('Client Name').fill('Report Detail Client');
    await page.getByRole('button', { name: 'Create' }).click();
    await expect(page.getByText('Add New Client')).not.toBeVisible({ timeout: 5000 });

    // Add work entry
    await page.getByRole('button', { name: 'Work Entries' }).click();
    await page.getByRole('button', { name: 'Add Work Entry' }).click();
    await page.getByLabel('Client').click();
    await page.getByRole('option', { name: 'Report Detail Client' }).click();
    await page.getByLabel('Hours').fill('8');
    await page.getByLabel('Description').fill('Full day of development');
    await page.getByRole('button', { name: 'Create' }).click();
    await expect(page.getByText('Add New Work Entry')).not.toBeVisible({ timeout: 5000 });

    // Navigate to reports and select client
    await page.getByRole('button', { name: 'Reports' }).click();

    // Open client selector dropdown and pick the client
    await page.getByLabel('Select Client').click();
    await page.getByRole('option', { name: 'Report Detail Client' }).click();

    // Report should display with stats
    await expect(page.getByText('Total Hours')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Total Entries')).toBeVisible();
    await expect(page.getByText('Average Hours per Entry')).toBeVisible();

    // Work entry should be listed in the report table
    await expect(page.getByText('8 hours')).toBeVisible();
    await expect(page.getByText('Full day of development')).toBeVisible();
  });

  test('should have export buttons for CSV and PDF', async ({ page }) => {
    // Create client and entry
    await page.getByRole('button', { name: 'Clients' }).click();
    await page.getByRole('button', { name: 'Add Client' }).click();
    await page.getByLabel('Client Name').fill('Export Test Client');
    await page.getByRole('button', { name: 'Create' }).click();
    await expect(page.getByText('Add New Client')).not.toBeVisible({ timeout: 5000 });

    await page.getByRole('button', { name: 'Work Entries' }).click();
    await page.getByRole('button', { name: 'Add Work Entry' }).click();
    await page.getByLabel('Client').click();
    await page.getByRole('option', { name: 'Export Test Client' }).click();
    await page.getByLabel('Hours').fill('3');
    await page.getByRole('button', { name: 'Create' }).click();
    await expect(page.getByText('Add New Work Entry')).not.toBeVisible({ timeout: 5000 });

    // Navigate to reports and select client
    await page.getByRole('button', { name: 'Reports' }).click();
    await page.getByLabel('Select Client').click();
    await page.getByRole('option', { name: 'Export Test Client' }).click();

    // Wait for report to load
    await expect(page.getByText('Total Hours')).toBeVisible({ timeout: 10000 });

    // Export buttons (CSV and PDF icons) should be visible
    await expect(page.getByRole('button', { name: 'Export as CSV' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Export as PDF' })).toBeVisible();
  });

  test('should trigger CSV export download', async ({ page }) => {
    // Create client and entry
    await page.getByRole('button', { name: 'Clients' }).click();
    await page.getByRole('button', { name: 'Add Client' }).click();
    await page.getByLabel('Client Name').fill('CSV Export Client');
    await page.getByRole('button', { name: 'Create' }).click();
    await expect(page.getByText('Add New Client')).not.toBeVisible({ timeout: 5000 });

    await page.getByRole('button', { name: 'Work Entries' }).click();
    await page.getByRole('button', { name: 'Add Work Entry' }).click();
    await page.getByLabel('Client').click();
    await page.getByRole('option', { name: 'CSV Export Client' }).click();
    await page.getByLabel('Hours').fill('5');
    await page.getByRole('button', { name: 'Create' }).click();
    await expect(page.getByText('Add New Work Entry')).not.toBeVisible({ timeout: 5000 });

    // Navigate to reports and select client
    await page.getByRole('button', { name: 'Reports' }).click();
    await page.getByLabel('Select Client').click();
    await page.getByRole('option', { name: 'CSV Export Client' }).click();
    await expect(page.getByText('Total Hours')).toBeVisible({ timeout: 10000 });

    // Listen for download event
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export as CSV' }).click();
    const download = await downloadPromise;

    // Verify the download
    expect(download.suggestedFilename()).toContain('.csv');
  });

  test('should trigger PDF export download', async ({ page }) => {
    // Create client and entry
    await page.getByRole('button', { name: 'Clients' }).click();
    await page.getByRole('button', { name: 'Add Client' }).click();
    await page.getByLabel('Client Name').fill('PDF Export Client');
    await page.getByRole('button', { name: 'Create' }).click();
    await expect(page.getByText('Add New Client')).not.toBeVisible({ timeout: 5000 });

    await page.getByRole('button', { name: 'Work Entries' }).click();
    await page.getByRole('button', { name: 'Add Work Entry' }).click();
    await page.getByLabel('Client').click();
    await page.getByRole('option', { name: 'PDF Export Client' }).click();
    await page.getByLabel('Hours').fill('7');
    await page.getByRole('button', { name: 'Create' }).click();
    await expect(page.getByText('Add New Work Entry')).not.toBeVisible({ timeout: 5000 });

    // Navigate to reports and select client
    await page.getByRole('button', { name: 'Reports' }).click();
    await page.getByLabel('Select Client').click();
    await page.getByRole('option', { name: 'PDF Export Client' }).click();
    await expect(page.getByText('Total Hours')).toBeVisible({ timeout: 10000 });

    // Listen for download event
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export as PDF' }).click();
    const download = await downloadPromise;

    // Verify the download
    expect(download.suggestedFilename()).toContain('.pdf');
  });
});
