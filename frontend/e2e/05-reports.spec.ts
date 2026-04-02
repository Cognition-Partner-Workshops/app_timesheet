import { test, expect } from '@playwright/test';
import { loginViaApi, ensureUserExists, createClientViaApi, createWorkEntryViaApi } from './helpers';

const TEST_EMAIL = 'e2e-reports-test@timetracker.com';

test.describe('Reports Page', () => {
  test.beforeEach(async ({ page }) => {
    // Login via localStorage to avoid rate limiting
    await page.goto('/login');
    await loginViaApi(page, TEST_EMAIL);
  });

  test('should display reports page with heading and prompt', async ({ page }) => {
    await page.getByRole('button', { name: 'Reports', exact: true }).click();
    await expect(page).toHaveURL(/\/reports/);
    await expect(page.getByRole('heading', { name: 'Reports' })).toBeVisible();

    // Wait for page to fully load, then check for either state
    await page.waitForTimeout(2000);
    const pageContent = await page.textContent('body');
    const hasNoClients = pageContent?.includes('You need to create at least one client') ?? false;
    const hasSelectPrompt = pageContent?.includes('Select a client to view their time report') ?? false;
    expect(hasNoClients || hasSelectPrompt).toBeTruthy();
  });

  test('should display reports page with client selector', async ({ page, request }) => {
    // Create test data via API to avoid UI flakiness
    const email = await ensureUserExists(request, TEST_EMAIL);
    const clientId = await createClientViaApi(request, email, `Reports Selector Client ${Date.now()}`);
    await createWorkEntryViaApi(request, email, clientId, 6, 'Report testing work entry');

    // Navigate to reports
    await page.getByRole('button', { name: 'Reports', exact: true }).click();
    await expect(page).toHaveURL(/\/reports/);

    // Client selector should be available
    await expect(page.getByRole('combobox')).toBeVisible();
    await expect(page.getByText('Select a client to view their time report.')).toBeVisible();
  });

  test('should generate report when client is selected', async ({ page, request }) => {
    // Create test data via API
    const email = await ensureUserExists(request, TEST_EMAIL);
    const clientName = `Report Detail Client ${Date.now()}`;
    const clientId = await createClientViaApi(request, email, clientName);
    await createWorkEntryViaApi(request, email, clientId, 8, 'Full day of development');

    // Navigate to reports and select client
    await page.getByRole('button', { name: 'Reports', exact: true }).click();

    // Open client selector dropdown and pick the client
    await page.getByRole('combobox').click();
    await page.getByRole('option', { name: clientName }).click();

    // Report should display with stats
    await expect(page.getByText('Total Hours')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Total Entries')).toBeVisible();
    await expect(page.getByText('Average Hours per Entry')).toBeVisible();

    // Work entry should be listed in the report table
    await expect(page.getByText('8 hours')).toBeVisible();
    await expect(page.getByText('Full day of development')).toBeVisible();
  });

  test('should have export buttons for CSV and PDF', async ({ page, request }) => {
    // Create test data via API
    const email = await ensureUserExists(request, TEST_EMAIL);
    const clientName = `Export Test Client ${Date.now()}`;
    const clientId = await createClientViaApi(request, email, clientName);
    await createWorkEntryViaApi(request, email, clientId, 3, 'Export test entry');

    // Navigate to reports and select client
    await page.getByRole('button', { name: 'Reports', exact: true }).click();
    await page.getByRole('combobox').click();
    await page.getByRole('option', { name: clientName }).click();

    // Wait for report to load
    await expect(page.getByText('Total Hours')).toBeVisible({ timeout: 10000 });

    // Export buttons (CSV and PDF icons) should be visible
    await expect(page.getByRole('button', { name: 'Export as CSV' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Export as PDF' })).toBeVisible();
  });

  test('should trigger CSV export download', async ({ page, request }) => {
    // Create test data via API
    const email = await ensureUserExists(request, TEST_EMAIL);
    const clientName = `CSV Export Client ${Date.now()}`;
    const clientId = await createClientViaApi(request, email, clientName);
    await createWorkEntryViaApi(request, email, clientId, 5, 'CSV export test entry');

    // Navigate to reports and select client
    await page.getByRole('button', { name: 'Reports', exact: true }).click();
    await page.getByRole('combobox').click();
    await page.getByRole('option', { name: clientName }).click();
    await expect(page.getByText('Total Hours')).toBeVisible({ timeout: 10000 });

    // Listen for download event
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export as CSV' }).click();
    const download = await downloadPromise;

    // Verify the download
    expect(download.suggestedFilename()).toContain('.csv');
  });

  test('should trigger PDF export download', async ({ page, request }) => {
    // Create test data via API
    const email = await ensureUserExists(request, TEST_EMAIL);
    const clientName = `PDF Export Client ${Date.now()}`;
    const clientId = await createClientViaApi(request, email, clientName);
    await createWorkEntryViaApi(request, email, clientId, 7, 'PDF export test entry');

    // Navigate to reports and select client
    await page.getByRole('button', { name: 'Reports', exact: true }).click();
    await page.getByRole('combobox').click();
    await page.getByRole('option', { name: clientName }).click();
    await expect(page.getByText('Total Hours')).toBeVisible({ timeout: 10000 });

    // Listen for download event
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export as PDF' }).click();
    const download = await downloadPromise;

    // Verify the download
    expect(download.suggestedFilename()).toContain('.pdf');
  });
});
