/**
 * Test helpers for authentication
 */

import { Page } from '@playwright/test';

export async function loginTestUser(page: Page, email?: string, password?: string, redirectTo?: string) {
  const testEmail = email || process.env.TEST_USER_EMAIL || 'test@example.com';
  const testPassword = password || process.env.TEST_USER_PASSWORD || 'testpassword123';
  
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

export async function createTestUser(page: Page, email: string, password: string) {
  await page.goto('/register');
  await page.waitForSelector('[data-testid="email-input"]', { timeout: 5000 });
  
  // Fill all required fields
  await page.fill('[data-testid="full-name-input"]', 'Test User');
  await page.fill('[data-testid="email-input"]', email);
  await page.fill('[data-testid="password-input"]', password);
  await page.fill('[data-testid="confirm-password-input"]', password);
  
  // Submit and wait for navigation
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle', timeout: 15000 }).catch(() => {}),
    page.click('[data-testid="register-button"]')
  ]);
  
  // Wait a bit more for any redirects
  await page.waitForTimeout(2000);
}

