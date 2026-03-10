import { test, expect } from '@playwright/test';

const TEST_EMAIL = 'e2e-clients-test@timetracker.com';

test.describe('Clients Page - CRUD Operations', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.evaluate(() => localStorage.clear());
    await page.goto('/login');
    await page.getByLabel('Email Address').fill(TEST_EMAIL);
    await page.getByRole('button', { name: 'Log In' }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

    // Navigate to clients page
    await page.getByRole('button', { name: 'Clients' }).click();
    await expect(page).toHaveURL(/\/clients/);
    await expect(page.getByText('Clients').first()).toBeVisible();
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
    // Click Add Client button
    await page.getByRole('button', { name: 'Add Client' }).click();

    // Dialog should open
    await expect(page.getByText('Add New Client')).toBeVisible();

    // Fill in client details
    await page.getByLabel('Client Name').fill('Acme Corporation');
    await page.getByLabel('Department').fill('Engineering');
    await page.getByLabel('Email').fill('contact@acme.com');
    await page.getByLabel('Description').fill('Major enterprise client for Q1 projects');

    // Submit the form
    await page.getByRole('button', { name: 'Create' }).click();

    // Dialog should close and client should appear in table
    await expect(page.getByText('Add New Client')).not.toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Acme Corporation')).toBeVisible();
    await expect(page.getByText('Engineering')).toBeVisible();
    await expect(page.getByText('contact@acme.com')).toBeVisible();
  });

  test('should create a second client', async ({ page }) => {
    await page.getByRole('button', { name: 'Add Client' }).click();
    await expect(page.getByText('Add New Client')).toBeVisible();

    await page.getByLabel('Client Name').fill('Global Tech Solutions');
    await page.getByLabel('Department').fill('Marketing');
    await page.getByLabel('Email').fill('info@globaltech.com');
    await page.getByLabel('Description').fill('Digital marketing consulting client');

    await page.getByRole('button', { name: 'Create' }).click();

    await expect(page.getByText('Add New Client')).not.toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Global Tech Solutions')).toBeVisible();
  });

  test('should edit an existing client', async ({ page }) => {
    // First create a client to edit
    await page.getByRole('button', { name: 'Add Client' }).click();
    await page.getByLabel('Client Name').fill('Edit Test Client');
    await page.getByLabel('Department').fill('Sales');
    await page.getByRole('button', { name: 'Create' }).click();
    await expect(page.getByText('Add New Client')).not.toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Edit Test Client')).toBeVisible();

    // Find the edit button in the row containing 'Edit Test Client'
    const row = page.getByRole('row').filter({ hasText: 'Edit Test Client' });
    await row.getByRole('button').first().click();

    // Edit dialog should open with pre-filled data
    await expect(page.getByText('Edit Client')).toBeVisible();

    // Verify pre-filled values
    const nameField = page.getByLabel('Client Name');
    await expect(nameField).toHaveValue('Edit Test Client');

    // Update client name
    await nameField.clear();
    await nameField.fill('Updated Client Name');
    await page.getByRole('button', { name: 'Update' }).click();

    // Dialog should close and updated name should appear
    await expect(page.getByText('Edit Client')).not.toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Updated Client Name')).toBeVisible();
  });

  test('should delete a client', async ({ page }) => {
    // First create a client to delete
    await page.getByRole('button', { name: 'Add Client' }).click();
    await page.getByLabel('Client Name').fill('Delete Me Client');
    await page.getByRole('button', { name: 'Create' }).click();
    await expect(page.getByText('Add New Client')).not.toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Delete Me Client')).toBeVisible();

    // Accept the confirm dialog before clicking delete
    page.on('dialog', dialog => dialog.accept());

    // Find the delete button in the row
    const row = page.getByRole('row').filter({ hasText: 'Delete Me Client' });
    await row.getByRole('button').nth(1).click();

    // Client should be removed from the table
    await expect(page.getByText('Delete Me Client')).not.toBeVisible({ timeout: 5000 });
  });

  test('should cancel client creation dialog', async ({ page }) => {
    await page.getByRole('button', { name: 'Add Client' }).click();
    await expect(page.getByText('Add New Client')).toBeVisible();

    await page.getByLabel('Client Name').fill('Should Not Be Created');
    await page.getByRole('button', { name: 'Cancel' }).click();

    // Dialog should close without creating client
    await expect(page.getByText('Add New Client')).not.toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Should Not Be Created')).not.toBeVisible();
  });

  test('should validate required client name field', async ({ page }) => {
    await page.getByRole('button', { name: 'Add Client' }).click();
    await expect(page.getByText('Add New Client')).toBeVisible();

    // Try to submit with empty name - click Create without filling name
    await page.getByRole('button', { name: 'Create' }).click();

    // The dialog should still be open (form validation)
    await expect(page.getByText('Add New Client')).toBeVisible();
  });
});
