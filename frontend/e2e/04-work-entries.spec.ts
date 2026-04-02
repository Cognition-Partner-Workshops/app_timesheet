import { test, expect } from '@playwright/test';
import { loginViaApi, ensureUserExists, createClientViaApi, deleteAllClientsViaApi } from './helpers';

const TEST_EMAIL = 'e2e-workentries-test@timetracker.com';

test.describe('Work Entries Page - CRUD Operations', () => {
  // Clean up all stale data before the test suite runs
  test.beforeAll(async ({ request }) => {
    await ensureUserExists(request, TEST_EMAIL);
    await deleteAllClientsViaApi(request, TEST_EMAIL);
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await loginViaApi(page, TEST_EMAIL);
  });

  test('should show work entries page heading', async ({ page }) => {
    await page.getByRole('button', { name: 'Work Entries' }).click();
    await expect(page).toHaveURL(/\/work-entries/);

    const workEntriesHeading = page.locator('h4').filter({ hasText: /^Work Entries$/ });
    await expect(workEntriesHeading).toBeVisible();
  });

  test('should create a client then add a work entry', async ({ page, request }) => {
    // Create client via API to ensure it exists with unique name
    const email = await ensureUserExists(request, TEST_EMAIL);
    const clientName = `WE Test Client ${Date.now()}`;
    await createClientViaApi(request, email, clientName);

    // Navigate to work entries
    await page.getByRole('button', { name: 'Work Entries' }).click();
    await expect(page).toHaveURL(/\/work-entries/);

    // Click Add Work Entry
    await page.getByRole('button', { name: 'Add Work Entry' }).click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });

    // Select client from dropdown
    await page.getByRole('dialog').getByRole('combobox').click();
    await page.getByRole('option', { name: clientName }).click();

    // Fill in hours and description
    await page.getByLabel('Hours').fill('4.5');
    const desc = `Frontend dev ${Date.now()}`;
    await page.getByLabel('Description').fill(desc);

    // Submit the form
    await page.getByRole('button', { name: 'Create' }).click();

    // Dialog should close and entry should appear
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 });
    await expect(page.getByText(desc)).toBeVisible();
  });

  test('should create a second work entry', async ({ page, request }) => {
    // Create client via API
    const email = await ensureUserExists(request, TEST_EMAIL);
    const clientName = `WE Second Client ${Date.now()}`;
    await createClientViaApi(request, email, clientName);

    // Navigate to work entries
    await page.getByRole('button', { name: 'Work Entries' }).click();
    await expect(page).toHaveURL(/\/work-entries/);

    // Add another work entry
    await page.getByRole('button', { name: 'Add Work Entry' }).click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });

    await page.getByRole('dialog').getByRole('combobox').click();
    await page.getByRole('option', { name: clientName }).click();
    await page.getByLabel('Hours').fill('2');
    const desc = `Sprint planning ${Date.now()}`;
    await page.getByLabel('Description').fill(desc);
    await page.getByRole('button', { name: 'Create' }).click();

    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 });
    await expect(page.getByText(desc)).toBeVisible();
  });

  test('should edit a work entry', async ({ page, request }) => {
    // Create client via API
    const email = await ensureUserExists(request, TEST_EMAIL);
    const clientName = `WE Edit Client ${Date.now()}`;
    await createClientViaApi(request, email, clientName);

    // Create a work entry to edit
    await page.getByRole('button', { name: 'Work Entries' }).click();
    await page.getByRole('button', { name: 'Add Work Entry' }).click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
    await page.getByRole('dialog').getByRole('combobox').click();
    await page.getByRole('option', { name: clientName }).click();
    await page.getByLabel('Hours').fill('3');
    const originalDesc = `Original desc ${Date.now()}`;
    await page.getByLabel('Description').fill(originalDesc);
    await page.getByRole('button', { name: 'Create' }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 });

    // Find the row and click edit
    const row = page.getByRole('row').filter({ hasText: originalDesc });
    await row.getByRole('button').first().click();

    // Edit dialog should open
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Edit Work Entry')).toBeVisible();

    // Update hours and description
    const hoursField = page.getByLabel('Hours');
    await hoursField.clear();
    await hoursField.fill('5');

    const updatedDesc = `Updated desc ${Date.now()}`;
    const descField = page.getByLabel('Description');
    await descField.clear();
    await descField.fill(updatedDesc);

    await page.getByRole('button', { name: 'Update' }).click();

    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 });
    await expect(page.getByText(updatedDesc)).toBeVisible();
  });

  test('should delete a work entry', async ({ page, request }) => {
    // Create client via API
    const email = await ensureUserExists(request, TEST_EMAIL);
    const clientName = `WE Delete Client ${Date.now()}`;
    await createClientViaApi(request, email, clientName);

    // Create a work entry to delete
    await page.getByRole('button', { name: 'Work Entries' }).click();
    await page.getByRole('button', { name: 'Add Work Entry' }).click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
    await page.getByRole('dialog').getByRole('combobox').click();
    await page.getByRole('option', { name: clientName }).click();
    await page.getByLabel('Hours').fill('1');
    const deleteDesc = `Entry to delete ${Date.now()}`;
    await page.getByLabel('Description').fill(deleteDesc);
    await page.getByRole('button', { name: 'Create' }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 });
    await expect(page.getByText(deleteDesc)).toBeVisible();

    // Accept confirm dialog
    page.on('dialog', dialog => dialog.accept());

    // Find the row and click delete
    const row = page.getByRole('row').filter({ hasText: deleteDesc });
    await row.getByRole('button').nth(1).click();

    // Entry should be removed
    await expect(page.getByText(deleteDesc)).not.toBeVisible({ timeout: 5000 });
  });

  test('should cancel work entry creation', async ({ page, request }) => {
    // Ensure at least one client exists via API
    const email = await ensureUserExists(request, TEST_EMAIL);
    await createClientViaApi(request, email, `WE Cancel Client ${Date.now()}`);

    await page.getByRole('button', { name: 'Work Entries' }).click();
    await page.getByRole('button', { name: 'Add Work Entry' }).click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });

    // Fill some data then cancel
    await page.getByLabel('Hours').fill('10');
    await page.getByRole('button', { name: 'Cancel' }).click();

    // Dialog should close
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 });
  });
});
