import { Page } from '@playwright/test';

/**
 * Authentication helper for mobile tests
 * Handles login flow and session management
 */
export class AuthHelper {
  constructor(private page: Page) {}

  /**
   * Login with test credentials
   * Assumes test user exists in database
   */
  async login(email: string = 'test@pricewaze.com', password: string = 'test123456') {
    await this.page.goto('/login');
    await this.page.waitForLoadState('networkidle');

    // Fill login form
    await this.page.fill('input[type="email"]', email);
    await this.page.fill('input[type="password"]', password);

    // Submit form
    await this.page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await this.page.waitForURL('/**', { timeout: 10000 });
    await this.page.waitForLoadState('networkidle');

    // Verify we're logged in (check for sidebar or user menu)
    try {
      await this.page.waitForSelector('[data-testid="sidebar"]', { timeout: 5000 });
    } catch {
      // Fallback: check for dashboard content
      await this.page.waitForSelector('h1, [data-testid="dashboard"]', { timeout: 5000 });
    }
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    try {
      // Check for auth indicators
      const sidebar = await this.page.locator('[data-testid="sidebar"]').count();
      const userMenu = await this.page.locator('[data-testid="user-menu"]').count();
      return sidebar > 0 || userMenu > 0;
    } catch {
      return false;
    }
  }

  /**
   * Logout
   */
  async logout() {
    // Try to find logout button in mobile menu
    const mobileMenuButton = this.page.locator('[data-testid="mobile-menu-button"]');
    if (await mobileMenuButton.isVisible()) {
      await mobileMenuButton.click();
    }

    // Look for logout button
    const logoutButton = this.page.locator('button:has-text("Logout"), button:has-text("Sign out")');
    if (await logoutButton.isVisible()) {
      await logoutButton.click();
    }

    // Wait for redirect to login
    await this.page.waitForURL('/login', { timeout: 5000 });
  }
}

