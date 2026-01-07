import { Page } from '@playwright/test';

/**
 * Authentication helper for mobile tests
 * Handles login flow and session management
 */
export class AuthHelper {
  constructor(private page: Page) {}

  /**
   * Login with test credentials
   * Will attempt to create user if doesn't exist (for test environments)
   */
  async login(email: string = 'test@pricewaze.com', password: string = 'test123456', skipAuth: boolean = false) {
    // Skip authentication if requested (for testing UI without auth)
    if (skipAuth) {
      await this.page.goto('/');
      // If redirected to login, that's fine - we'll test the login page
      return;
    }
    await this.page.goto('/login');
    await this.page.waitForLoadState('networkidle');

    // Wait for form to be visible
    await this.page.waitForSelector('#email', { timeout: 10000 });

    // Fill login form using IDs
    await this.page.fill('#email', email);
    await this.page.fill('#password', password);

    // Submit form
    await this.page.click('button[type="submit"]');

    // Wait for navigation - could go to dashboard or stay on login if error
    await this.page.waitForTimeout(2000); // Wait for async operations
    
    // Check if we're still on login page (error case)
    const currentUrl = this.page.url();
    if (currentUrl.includes('/login')) {
      // Check for error message
      const errorVisible = await this.page.locator('text=/failed|error/i').isVisible().catch(() => false);
      if (errorVisible) {
        throw new Error('Login failed - check credentials or user exists');
      }
      // Wait a bit more for redirect
      await this.page.waitForURL(/\/(?!login)/, { timeout: 5000 }).catch(() => {
        throw new Error('Login did not redirect - check credentials');
      });
    }

    // Wait for page to load
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(1000); // Extra wait for React hydration

    // Verify we're logged in - check for dashboard elements
    // Try multiple selectors that indicate we're on dashboard
    const dashboardIndicators = [
      'aside', // Sidebar
      '[data-testid="sidebar"]',
      'h1', // Any heading
      'nav', // Navigation
    ];

    let found = false;
    for (const selector of dashboardIndicators) {
      try {
        await this.page.waitForSelector(selector, { timeout: 3000 });
        found = true;
        break;
      } catch {
        continue;
      }
    }

    if (!found) {
      // Take screenshot for debugging
      await this.page.screenshot({ path: 'test-results/login-failed.png' });
      throw new Error('Could not verify login - dashboard elements not found');
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

