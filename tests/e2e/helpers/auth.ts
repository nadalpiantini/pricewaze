/**
 * Test helpers for authentication
 */

import { Page } from '@playwright/test';

export async function loginTestUser(page: Page, email?: string, password?: string, redirectTo?: string) {
  // Prefer environment variables for test credentials (pre-seeded confirmed users)
  const testEmail = process.env.TEST_USER_EMAIL || email || 'test@example.com';
  const testPassword = process.env.TEST_USER_PASSWORD || password || 'testpassword123';

  const targetUrl = redirectTo || '/dashboard';

  // Navigate to login with redirect parameter
  await page.goto(`/login?redirect=${encodeURIComponent(targetUrl)}`);

  // Wait for form to be ready
  await page.waitForSelector('[data-testid="email-input"]', { timeout: 10000 });

  // Fill credentials - clear and type character by character for special chars like #
  await page.fill('[data-testid="email-input"]', testEmail);

  // Clear password field and type character by character
  const passwordInput = page.locator('[data-testid="password-input"]');
  await passwordInput.click();
  await passwordInput.fill(''); // Clear any existing content
  await page.keyboard.type(testPassword, { delay: 30 });

  // Click login button and wait for response
  await Promise.all([
    page.waitForResponse(resp => resp.url().includes('supabase') && resp.status() !== 0, { timeout: 10000 }).catch(() => null),
    page.click('[data-testid="login-button"]')
  ]);

  // Wait a moment for toast notifications to appear
  await page.waitForTimeout(3000);

  // Check for error toast
  const errorToast = page.locator('[data-sonner-toast][data-type="error"]');
  const errorVisible = await errorToast.first().isVisible().catch(() => false);
  if (errorVisible) {
    const errorText = await errorToast.first().textContent();
    throw new Error(`Login failed: ${errorText}`);
  }

  // Also check for generic error text
  const errorText = page.locator('text=/Login failed|Invalid login|Email not confirmed/i');
  const hasErrorText = await errorText.first().isVisible().catch(() => false);
  if (hasErrorText) {
    const text = await errorText.first().textContent();
    throw new Error(`Login failed: ${text}`);
  }

  // Wait for navigation away from login page (if still on login, something went wrong)
  try {
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 10000 });
  } catch {
    // Take screenshot of current state for debugging
    const screenshotPath = `/tmp/login-debug-${Date.now()}.png`;
    await page.screenshot({ path: screenshotPath });
    console.log(`[Auth Debug] Login did not navigate. Screenshot: ${screenshotPath}`);
    throw new Error('Login did not navigate away from /login page - check screenshot');
  }

  // Give time for session cookies to be fully set and Next.js to hydrate
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(1000);

  // Navigate to target URL if not already there
  const currentUrl = page.url();
  if (!currentUrl.includes(targetUrl)) {
    await page.goto(targetUrl);
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
  }

  // Verify auth state - check for authenticated user indicators
  // The homepage has avatar button, dashboard has user-menu with data-testid
  const userMenu = page.locator('[data-testid="user-menu"]');
  const avatarButton = page.locator('button:has-text(/^[A-Z]{1,2}$/)'); // Avatar with initials
  const signInLink = page.locator('a:has-text("Sign In")');
  const listPropertyLink = page.locator('a:has-text("List Property")'); // Only visible when logged in

  // Wait a bit for UI to stabilize
  await page.waitForTimeout(2000);

  // Check for authentication indicators
  const hasUserMenu = await userMenu.isVisible().catch(() => false);
  const hasAvatar = await avatarButton.first().isVisible().catch(() => false);
  const hasListProperty = await listPropertyLink.first().isVisible().catch(() => false);
  const hasSignInLink = await signInLink.first().isVisible().catch(() => false);

  const isAuthenticated = hasUserMenu || hasAvatar || hasListProperty;

  if (hasSignInLink && !isAuthenticated) {
    throw new Error('Login appeared successful but user is not authenticated (Sign In link still visible, no user indicators)');
  }

  if (!isAuthenticated) {
    throw new Error('Login completed but no authentication indicators found');
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

