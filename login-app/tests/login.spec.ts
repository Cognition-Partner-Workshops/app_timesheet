import { test, expect } from '@playwright/test';

test.describe('Login Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display the login form with all elements', async ({ page }) => {
    // Check heading
    await expect(page.getByRole('heading', { name: 'Welcome Back' })).toBeVisible();
    await expect(page.getByText('Sign in to your account')).toBeVisible();

    // Check form fields
    await expect(page.getByLabel('Username')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();

    // Check placeholders
    await expect(page.getByPlaceholder('Enter your username')).toBeVisible();
    await expect(page.getByPlaceholder('Enter your password')).toBeVisible();

    // Check login button
    await expect(page.getByRole('button', { name: 'Login' })).toBeVisible();

    // Check sign up link
    await expect(page.getByText("Don't have an account?")).toBeVisible();
    await expect(page.getByRole('link', { name: 'Sign up' })).toBeVisible();
  });

  test('should show error when submitting empty form', async ({ page }) => {
    await page.getByRole('button', { name: 'Login' }).click();

    await expect(page.getByText('Please enter both username and password.')).toBeVisible();
    // Should NOT show success
    await expect(page.getByText('Login successful!')).not.toBeVisible();
  });

  test('should show error when only username is provided', async ({ page }) => {
    await page.getByLabel('Username').fill('testuser');
    await page.getByRole('button', { name: 'Login' }).click();

    await expect(page.getByText('Please enter both username and password.')).toBeVisible();
    await expect(page.getByText('Login successful!')).not.toBeVisible();
  });

  test('should show error when only password is provided', async ({ page }) => {
    await page.getByLabel('Password').fill('password123');
    await page.getByRole('button', { name: 'Login' }).click();

    await expect(page.getByText('Please enter both username and password.')).toBeVisible();
    await expect(page.getByText('Login successful!')).not.toBeVisible();
  });

  test('should show success message with valid credentials', async ({ page }) => {
    await page.getByLabel('Username').fill('admin');
    await page.getByLabel('Password').fill('password123');
    await page.getByRole('button', { name: 'Login' }).click();

    await expect(page.getByText('Login successful!')).toBeVisible();
    // Error message should NOT be visible
    await expect(page.getByText('Please enter both username and password.')).not.toBeVisible();
  });

  test('should clear error message after successful login', async ({ page }) => {
    // First trigger an error
    await page.getByRole('button', { name: 'Login' }).click();
    await expect(page.getByText('Please enter both username and password.')).toBeVisible();

    // Then fill in credentials and submit
    await page.getByLabel('Username').fill('admin');
    await page.getByLabel('Password').fill('secret');
    await page.getByRole('button', { name: 'Login' }).click();

    // Error should be gone, success should appear
    await expect(page.getByText('Login successful!')).toBeVisible();
    await expect(page.getByText('Please enter both username and password.')).not.toBeVisible();
  });

  test('should have password field masked', async ({ page }) => {
    const passwordInput = page.getByLabel('Password');
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });

  test('should show error for whitespace-only username', async ({ page }) => {
    await page.getByLabel('Username').fill('   ');
    await page.getByLabel('Password').fill('password123');
    await page.getByRole('button', { name: 'Login' }).click();

    await expect(page.getByText('Please enter both username and password.')).toBeVisible();
  });
});
