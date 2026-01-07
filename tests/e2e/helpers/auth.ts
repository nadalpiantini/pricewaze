/**
 * Test helpers for authentication
 */

import { Page } from '@playwright/test';

export async function loginTestUser(page: Page, email?: string, password?: string) {
  const testEmail = email || process.env.TEST_USER_EMAIL || 'test@example.com';
  const testPassword = password || process.env.TEST_USER_PASSWORD || 'testpassword123';
  
  await page.goto('/login');
  await page.fill('[data-testid="email-input"]', testEmail);
  await page.fill('[data-testid="password-input"]', testPassword);
  await page.click('[data-testid="login-button"]');
  
  // Wait for redirect to dashboard
  await page.waitForURL('/dashboard', { timeout: 10000 });
}

export async function logout(page: Page) {
  await page.click('[data-testid="user-menu"]');
  await page.click('text=Logout');
  await page.waitForURL('/login');
}

export async function createTestUser(page: Page, email: string, password: string) {
  await page.goto('/register');
  await page.fill('[data-testid="email-input"]', email);
  await page.fill('[data-testid="password-input"]', password);
  await page.fill('[data-testid="confirm-password-input"]', password);
  await page.click('[data-testid="register-button"]');
  
  // Wait for email verification or redirect
  await page.waitForTimeout(2000);
}

