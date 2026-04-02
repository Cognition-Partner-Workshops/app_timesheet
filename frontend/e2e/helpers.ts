import { type Page, type APIRequestContext, expect } from '@playwright/test';

/**
 * Login helper that sets localStorage directly to bypass rate limiting.
 * The app uses email-only auth stored in localStorage - no JWT or server session.
 */
export async function loginViaApi(page: Page, email: string) {
  // Set the email in localStorage so the frontend auth context picks it up
  await page.evaluate((userEmail: string) => {
    localStorage.setItem('userEmail', userEmail);
  }, email);

  // Navigate to dashboard and wait for it to load
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
}

/**
 * Ensure user exists in backend database and return email for API calls.
 * The backend uses x-user-email header for authentication.
 */
export async function ensureUserExists(request: APIRequestContext, email: string): Promise<string> {
  await request.post('http://localhost:3001/api/auth/login', {
    data: { email },
  });
  return email;
}

/**
 * Create a client via the backend API.
 */
export async function createClientViaApi(
  request: APIRequestContext,
  email: string,
  name: string
): Promise<number> {
  const response = await request.post('http://localhost:3001/api/clients', {
    headers: { 'x-user-email': email },
    data: { name },
  });
  const body = await response.json();
  return body.client.id;
}

/**
 * Delete all clients (and cascade work entries) for a user via API.
 * Useful for cleaning up stale test data before test suites.
 */
export async function deleteAllClientsViaApi(
  request: APIRequestContext,
  email: string
): Promise<void> {
  await request.delete('http://localhost:3001/api/clients', {
    headers: { 'x-user-email': email },
  });
}

/**
 * Create a work entry via the backend API.
 */
export async function createWorkEntryViaApi(
  request: APIRequestContext,
  email: string,
  clientId: number,
  hours: number,
  description: string
): Promise<void> {
  await request.post('http://localhost:3001/api/work-entries', {
    headers: { 'x-user-email': email },
    data: {
      clientId,
      hours,
      description,
      date: new Date().toISOString().split('T')[0],
    },
  });
}
