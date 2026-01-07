import { test, expect } from '@playwright/test';
import { loginTestUser, createTestUser, logout } from './helpers/auth';

/**
 * E2E Tests for Authentication
 * 
 * These tests verify user registration, login, logout flows.
 * 
 * Prerequisites:
 * - Test users may need to be created (run pnpm seed or create manually)
 */

test.describe('Authentication', () => {
  test('should register new user', async ({ page }) => {
    // Generate unique email for this test
    const timestamp = Date.now();
    const testEmail = `test-${timestamp}@example.com`;
    const testPassword = 'Test123!';
    
    await page.goto('/register');
    
    // Wait for form to load
    await page.waitForSelector('[data-testid="email-input"]', { timeout: 5000 });
    
    // Fill registration form
    await page.fill('[data-testid="email-input"]', testEmail);
    await page.fill('[data-testid="password-input"]', testPassword);
    
    // Look for confirm password field
    const confirmPasswordField = page.locator('[data-testid="confirm-password-input"]');
    if (await confirmPasswordField.count() > 0) {
      await confirmPasswordField.fill(testPassword);
    }
    
    // Submit registration
    await page.click('[data-testid="register-button"]');
    
    // Wait for redirect (might go to email verification or dashboard)
    await page.waitForTimeout(3000);
    
    // Verify we're not on register page anymore
    const currentUrl = page.url();
    expect(currentUrl).not.toContain('/register');
    
    // Note: Email verification might be required
    // In that case, user would need to verify email before full access
  });

  test('should login with valid credentials', async ({ page }) => {
    // Use existing test user
    await loginTestUser(page, 'maria@test.com', 'Test123!');
    
    // Verify we're on dashboard
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
    
    // Verify user is logged in (check for user menu or dashboard content)
    const dashboardContent = page.locator('text=/Dashboard|Properties|Routes/i');
    await expect(dashboardContent.first()).toBeVisible({ timeout: 5000 });
  });

  test('should logout successfully', async ({ page }) => {
    // Login first
    await loginTestUser(page, 'maria@test.com', 'Test123!');
    await page.waitForURL(/\/dashboard/);
    
    // Logout
    await logout(page);
    
    // Verify redirect to login
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
    
    // Verify we can't access dashboard
    await page.goto('/dashboard');
    await page.waitForTimeout(2000);
    
    // Should redirect back to login
    const currentUrl = page.url();
    expect(currentUrl).toMatch(/\/login/);
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.waitForSelector('[data-testid="email-input"]', { timeout: 5000 });
    
    // Try to login with invalid credentials
    await page.fill('[data-testid="email-input"]', 'invalid@example.com');
    await page.fill('[data-testid="password-input"]', 'wrongpassword');
    await page.click('[data-testid="login-button"]');
    
    // Wait for error message
    await page.waitForTimeout(2000);
    
    // Verify error message appears (might be toast or inline)
    const errorMessage = page.locator('text=/Invalid|Error|incorrect|wrong/i');
    const errorCount = await errorMessage.count();
    
    // Error should be shown (either toast or inline)
    expect(errorCount).toBeGreaterThan(0);
    
    // Verify we're still on login page
    await expect(page).toHaveURL(/\/login/);
  });

  test('should redirect authenticated user away from login page', async ({ page }) => {
    // Login first
    await loginTestUser(page, 'maria@test.com', 'Test123!');
    
    // Try to access login page
    await page.goto('/login');
    await page.waitForTimeout(2000);
    
    // Should redirect to dashboard
    const currentUrl = page.url();
    expect(currentUrl).toMatch(/\/dashboard/);
  });
});

