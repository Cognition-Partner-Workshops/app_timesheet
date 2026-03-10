import { test, expect } from '@playwright/test';
import { loginViaApi, ensureUserExists, deleteAllClientsViaApi } from './helpers';

const TEST_EMAIL = 'e2e-clients-test@timetracker.com';

test.describe('Clients Page - CRUD Operations', () => {
  // Clean up all stale data before the test suite runs
  test.beforeAll(async ({ request }) => {
    await ensureUserExists(request, TEST_EMAIL);
    await deleteAllClientsViaApi(request, TEST_EMAIL);
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await loginViaApi(page, TEST_EMAIL);

    // Navigate to clients page
    await page.getByRole('button', { name: 'Clients' }).click();
    await expect(page).toHaveURL(/\/clients/);
    await expect(page.getByRole('heading', { name: 'Clients' })).toBeVisible();
  });

  test('should display the clients page with correct elements', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Clients' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add Client' })).toBeVisible();

    // Table headers should be visible
    await expect(page.getByRole('columnheader', { name: 'Name' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Department' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Email' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Description' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Created' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Actions' })).toBeVisible();
  });

  test('should create a new client', async ({ page }) => {
    const clientName = `Acme Corp ${Date.now()}`;

    await page.getByRole('button', { name: 'Add Client' }).click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });

    await page.getByLabel('Client Name').fill(clientName);
    await page.getByLabel('Department').fill('Engineering');
    await page.getByLabel('Email').fill('contact@acme.com');
    await page.getByLabel('Description').fill('Major enterprise client for Q1 projects');

    await page.getByRole('button', { name: 'Create' }).click();

    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 });
    await expect(page.getByText(clientName)).toBeVisible();
  });

  test('should create a second client', async ({ page }) => {
    const clientName = `Global Tech ${Date.now()}`;

    await page.getByRole('button', { name: 'Add Client' }).click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });

    await page.getByLabel('Client Name').fill(clientName);
    await page.getByLabel('Department').fill('Marketing');
    await page.getByLabel('Email').fill('info@globaltech.com');
    await page.getByLabel('Description').fill('Digital marketing consulting client');

    await page.getByRole('button', { name: 'Create' }).click();

    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 });
    await expect(page.getByText(clientName)).toBeVisible();
  });

  test('should edit an existing client', async ({ page }) => {
    const clientName = `Edit Test Client ${Date.now()}`;
    const updatedName = `Updated Client ${Date.now()}`;

    // First create a client to edit
    await page.getByRole('button', { name: 'Add Client' }).click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
    await page.getByLabel('Client Name').fill(clientName);
    await page.getByLabel('Department').fill('Sales');
    await page.getByRole('button', { name: 'Create' }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 });
    await expect(page.getByText(clientName)).toBeVisible();

    // Find the edit button in the row containing the client
    const row = page.getByRole('row').filter({ hasText: clientName });
    await row.getByRole('button').first().click();

    // Edit dialog should open
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Edit Client')).toBeVisible();

    // Verify pre-filled values
    const nameField = page.getByLabel('Client Name');
    await expect(nameField).toHaveValue(clientName);

    // Update client name
    await nameField.clear();
    await nameField.fill(updatedName);
    await page.getByRole('button', { name: 'Update' }).click();

    // Dialog should close and updated name should appear
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 });
    await expect(page.getByText(updatedName)).toBeVisible();
  });

  test('should delete a client', async ({ page }) => {
    const clientName = `Delete Me Client ${Date.now()}`;

    await page.getByRole('button', { name: 'Add Client' }).click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
    await page.getByLabel('Client Name').fill(clientName);
    await page.getByRole('button', { name: 'Create' }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 });
    await expect(page.getByText(clientName)).toBeVisible();

    // Accept the confirm dialog before clicking delete
    page.on('dialog', dialog => dialog.accept());

    const row = page.getByRole('row').filter({ hasText: clientName });
    await row.getByRole('button').nth(1).click();

    await expect(page.getByText(clientName)).not.toBeVisible({ timeout: 5000 });
  });

  test('should cancel client creation dialog', async ({ page }) => {
    const clientName = `Should Not Be Created ${Date.now()}`;

    await page.getByRole('button', { name: 'Add Client' }).click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });

    await page.getByLabel('Client Name').fill(clientName);
    await page.getByRole('button', { name: 'Cancel' }).click();

    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 });
    await expect(page.getByText(clientName)).not.toBeVisible();
  });

  test('should validate required client name field', async ({ page }) => {
    await page.getByRole('button', { name: 'Add Client' }).click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });

    // Try to submit with empty name
    await page.getByRole('button', { name: 'Create' }).click();

    // The dialog should still be open (form validation)
    await expect(page.getByRole('dialog')).toBeVisible();
  });
});
