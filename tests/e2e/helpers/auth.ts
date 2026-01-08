/**
 * Test helpers for authentication
 */

import { Page } from '@playwright/test';

export async function loginTestUser(page: Page, email?: string, password?: string, redirectTo?: string) {
  // Prefer environment variables for test credentials (pre-seeded confirmed users)
  const testEmail = process.env.TEST_USER_EMAIL || email || 'test@example.com';
  const testPassword = process.env.TEST_USER_PASSWORD || password || 'testpassword123';
  
  const targetUrl = redirectTo || '/dashboard';
  
  // Navigate to login with redirect parameter if needed
  if (redirectTo) {
    await page.goto(`/login?redirect=${encodeURIComponent(redirectTo)}`);
  } else {
    await page.goto('/login');
  }
  
  await page.waitForSelector('[data-testid="email-input"]', { timeout: 5000 });
  await page.fill('[data-testid="email-input"]', testEmail);
  await page.fill('[data-testid="password-input"]', testPassword);
  
  // Click login button
  await page.click('[data-testid="login-button"]');
  
  // Wait for toast notification (success or error)
  await page.waitForTimeout(2000);
  
  // Wait for navigation (might go to /, /dashboard, or stay on /login if error)
  try {
    await page.waitForURL((url) => {
      return url.pathname !== '/login';
    }, { timeout: 10000 });
  } catch {
    // If still on login page, check for error
    const errorText = await page.locator('text=/Invalid|Error|incorrect|wrong/i').count();
    if (errorText > 0) {
      throw new Error('Login failed - invalid credentials');
    }
  }
  
  // Navigate to target URL if we're not already there
  const currentUrl = page.url();
  const currentPath = new URL(currentUrl).pathname;
  
  if (currentPath !== targetUrl && !currentPath.startsWith(targetUrl)) {
    await page.goto(targetUrl);
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(1000); // Give time for any redirects
  }
  
  // Verify we're logged in by checking for user menu or dashboard content
  const userMenu = page.locator('[data-testid="user-menu"]');
  const dashboardContent = page.locator('text=/Dashboard|Properties|Routes/i');
  
  // Wait for either user menu or dashboard content to appear
  try {
    await Promise.race([
      userMenu.waitFor({ timeout: 5000 }).catch(() => null),
      dashboardContent.first().waitFor({ timeout: 5000 }).catch(() => null)
    ]);
  } catch {
    // If neither appears, login might have failed
    throw new Error('Login failed - user menu or dashboard content not found');
  }
}

export async function logout(page: Page) {
  // Click user menu
  await page.click('[data-testid="user-menu"]');
  await page.waitForTimeout(500);
  
  // Click logout option (exact text match)
  await page.click('text=Log out');
  
  // Wait for redirect to login (logout does window.location.href = '/login')
  await page.waitForURL(/\/login/, { timeout: 10000 });
}

/**
 * Create or get a test user for E2E testing.
 *
 * If TEST_USER_EMAIL and TEST_USER_PASSWORD environment variables are set,
 * uses those credentials (assumes user already exists and is confirmed).
 * Otherwise, attempts to create a new test user via API.
 *
 * For Supabase projects with email confirmation enabled, you must either:
 * 1. Disable email confirmation in Supabase dashboard
 * 2. Create a test user manually and set TEST_USER_EMAIL/TEST_USER_PASSWORD
 * 3. Use an existing confirmed user's credentials
 */
export async function createTestUser(page: Page, email: string, password: string) {
  // If environment variables specify test credentials, use those (skip creation)
  const envEmail = process.env.TEST_USER_EMAIL;
  const envPassword = process.env.TEST_USER_PASSWORD;

  if (envEmail && envPassword) {
    console.log('[Test Auth] Using pre-configured test user from environment');
    // Return early - we'll use these credentials in loginTestUser
    return;
  }

  // Try to create user via API
  const baseUrl = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000';

  try {
    const response = await page.request.post(`${baseUrl}/api/test/users`, {
      data: {
        email,
        password,
        fullName: 'Test User',
      },
    });

    if (!response.ok()) {
      const body = await response.json().catch(() => ({}));
      const errorMsg = body.error || 'Unknown error';

      // If user already exists, that's okay - we can still try to login
      if (errorMsg.includes('already') || errorMsg.includes('exists')) {
        console.log('[Test Auth] User already exists, will try to login');
        return;
      }

      console.warn(`[Test Auth] Warning: Could not create test user: ${errorMsg}`);
      console.warn('[Test Auth] Will attempt to proceed with login anyway');
    }
  } catch (error) {
    console.warn('[Test Auth] Could not reach test API:', error);
    console.warn('[Test Auth] Will attempt to proceed with login anyway');
  }

  // Small delay to ensure user is propagated
  await page.waitForTimeout(500);
}

