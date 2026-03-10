import { test, expect } from '@playwright/test';

const TEST_EMAIL = 'e2e-workentries-test@timetracker.com';

test.describe('Work Entries Page - CRUD Operations', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.evaluate(() => localStorage.clear());
    await page.goto('/login');
    await page.getByLabel('Email Address').fill(TEST_EMAIL);
    await page.getByRole('button', { name: 'Log In' }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
  });

  test('should show message to create client first when no clients exist', async ({ page }) => {
    // Navigate to work entries page
    await page.getByRole('button', { name: 'Work Entries' }).click();
    await expect(page).toHaveURL(/\/work-entries/);

    // Should show message about needing a client first, or show the table
    const needsClient = page.getByText('You need to create at least one client');
    const workEntriesHeading = page.getByRole('heading', { name: 'Work Entries' });
    await expect(workEntriesHeading).toBeVisible();

    // If no clients exist, the message should show
    const noClientsVisible = await needsClient.isVisible().catch(() => false);
    if (noClientsVisible) {
      await expect(page.getByRole('link', { name: 'Create Client' })).toBeVisible();
    }
  });

  test('should create a client then add a work entry', async ({ page }) => {
    // First create a client
    await page.getByRole('button', { name: 'Clients' }).click();
    await expect(page).toHaveURL(/\/clients/);

    await page.getByRole('button', { name: 'Add Client' }).click();
    await page.getByLabel('Client Name').fill('Work Entry Test Client');
    await page.getByRole('button', { name: 'Create' }).click();
    await expect(page.getByText('Add New Client')).not.toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Work Entry Test Client')).toBeVisible();

    // Navigate to work entries
    await page.getByRole('button', { name: 'Work Entries' }).click();
    await expect(page).toHaveURL(/\/work-entries/);

    // Click Add Work Entry
    await page.getByRole('button', { name: 'Add Work Entry' }).click();
    await expect(page.getByText('Add New Work Entry')).toBeVisible();

    // Select client from dropdown
    await page.getByLabel('Client').click();
    await page.getByRole('option', { name: 'Work Entry Test Client' }).click();

    // Fill in hours
    await page.getByLabel('Hours').fill('4.5');

    // Fill in description
    await page.getByLabel('Description').fill('Frontend development and code review');

    // Submit the form
    await page.getByRole('button', { name: 'Create' }).click();

    // Dialog should close and entry should appear in table
    await expect(page.getByText('Add New Work Entry')).not.toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Work Entry Test Client')).toBeVisible();
    await expect(page.getByText('4.5 hours')).toBeVisible();
    await expect(page.getByText('Frontend development and code review')).toBeVisible();
  });

  test('should create a second work entry', async ({ page }) => {
    // Ensure client exists first
    await page.getByRole('button', { name: 'Clients' }).click();
    await expect(page).toHaveURL(/\/clients/);

    // Check if client exists, if not create one
    const clientExists = await page.getByText('Work Entry Test Client 2').isVisible().catch(() => false);
    if (!clientExists) {
      await page.getByRole('button', { name: 'Add Client' }).click();
      await page.getByLabel('Client Name').fill('Work Entry Test Client 2');
      await page.getByRole('button', { name: 'Create' }).click();
      await expect(page.getByText('Add New Client')).not.toBeVisible({ timeout: 5000 });
    }

    // Navigate to work entries
    await page.getByRole('button', { name: 'Work Entries' }).click();
    await expect(page).toHaveURL(/\/work-entries/);

    // Add another work entry
    await page.getByRole('button', { name: 'Add Work Entry' }).click();
    await expect(page.getByText('Add New Work Entry')).toBeVisible();

    await page.getByLabel('Client').click();
    await page.getByRole('option', { name: 'Work Entry Test Client 2' }).click();
    await page.getByLabel('Hours').fill('2');
    await page.getByLabel('Description').fill('Team meeting and sprint planning');
    await page.getByRole('button', { name: 'Create' }).click();

    await expect(page.getByText('Add New Work Entry')).not.toBeVisible({ timeout: 5000 });
    await expect(page.getByText('2 hours')).toBeVisible();
  });

  test('should edit a work entry', async ({ page }) => {
    // Ensure client exists
    await page.getByRole('button', { name: 'Clients' }).click();
    const editClientExists = await page.getByText('Edit Entry Test Client').isVisible().catch(() => false);
    if (!editClientExists) {
      await page.getByRole('button', { name: 'Add Client' }).click();
      await page.getByLabel('Client Name').fill('Edit Entry Test Client');
      await page.getByRole('button', { name: 'Create' }).click();
      await expect(page.getByText('Add New Client')).not.toBeVisible({ timeout: 5000 });
    }

    // Create a work entry to edit
    await page.getByRole('button', { name: 'Work Entries' }).click();
    await page.getByRole('button', { name: 'Add Work Entry' }).click();
    await page.getByLabel('Client').click();
    await page.getByRole('option', { name: 'Edit Entry Test Client' }).click();
    await page.getByLabel('Hours').fill('3');
    await page.getByLabel('Description').fill('Original description');
    await page.getByRole('button', { name: 'Create' }).click();
    await expect(page.getByText('Add New Work Entry')).not.toBeVisible({ timeout: 5000 });

    // Find the row and click edit
    const row = page.getByRole('row').filter({ hasText: 'Original description' });
    await row.getByRole('button').first().click();

    // Edit dialog should open
    await expect(page.getByText('Edit Work Entry')).toBeVisible();

    // Update hours
    const hoursField = page.getByLabel('Hours');
    await hoursField.clear();
    await hoursField.fill('5');

    // Update description
    const descField = page.getByLabel('Description');
    await descField.clear();
    await descField.fill('Updated description with more hours');

    await page.getByRole('button', { name: 'Update' }).click();

    await expect(page.getByText('Edit Work Entry')).not.toBeVisible({ timeout: 5000 });
    await expect(page.getByText('5 hours')).toBeVisible();
    await expect(page.getByText('Updated description with more hours')).toBeVisible();
  });

  test('should delete a work entry', async ({ page }) => {
    // Ensure client exists
    await page.getByRole('button', { name: 'Clients' }).click();
    const delClientExists = await page.getByText('Delete Entry Test Client').isVisible().catch(() => false);
    if (!delClientExists) {
      await page.getByRole('button', { name: 'Add Client' }).click();
      await page.getByLabel('Client Name').fill('Delete Entry Test Client');
      await page.getByRole('button', { name: 'Create' }).click();
      await expect(page.getByText('Add New Client')).not.toBeVisible({ timeout: 5000 });
    }

    // Create a work entry to delete
    await page.getByRole('button', { name: 'Work Entries' }).click();
    await page.getByRole('button', { name: 'Add Work Entry' }).click();
    await page.getByLabel('Client').click();
    await page.getByRole('option', { name: 'Delete Entry Test Client' }).click();
    await page.getByLabel('Hours').fill('1');
    await page.getByLabel('Description').fill('Entry to be deleted');
    await page.getByRole('button', { name: 'Create' }).click();
    await expect(page.getByText('Add New Work Entry')).not.toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Entry to be deleted')).toBeVisible();

    // Accept confirm dialog
    page.on('dialog', dialog => dialog.accept());

    // Find the row and click delete
    const row = page.getByRole('row').filter({ hasText: 'Entry to be deleted' });
    await row.getByRole('button').nth(1).click();

    // Entry should be removed
    await expect(page.getByText('Entry to be deleted')).not.toBeVisible({ timeout: 5000 });
  });

  test('should cancel work entry creation', async ({ page }) => {
    // Ensure at least one client exists
    await page.getByRole('button', { name: 'Clients' }).click();
    const anyClientExists = await page.locator('table tbody tr td').first().isVisible().catch(() => false);
    if (!anyClientExists) {
      await page.getByRole('button', { name: 'Add Client' }).click();
      await page.getByLabel('Client Name').fill('Cancel Test Client');
      await page.getByRole('button', { name: 'Create' }).click();
      await expect(page.getByText('Add New Client')).not.toBeVisible({ timeout: 5000 });
    }

    await page.getByRole('button', { name: 'Work Entries' }).click();
    await page.getByRole('button', { name: 'Add Work Entry' }).click();
    await expect(page.getByText('Add New Work Entry')).toBeVisible();

    // Fill some data then cancel
    await page.getByLabel('Hours').fill('10');
    await page.getByRole('button', { name: 'Cancel' }).click();

    // Dialog should close
    await expect(page.getByText('Add New Work Entry')).not.toBeVisible({ timeout: 5000 });
  });
});
