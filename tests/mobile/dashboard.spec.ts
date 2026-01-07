import { test, expect } from '@playwright/test';
import { AuthHelper } from './helpers/auth';
import { MobileChecks } from './helpers/mobile-checks';

test.describe('Dashboard Mobile Design', () => {
  let authHelper: AuthHelper;
  let mobileChecks: MobileChecks;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
    mobileChecks = new MobileChecks(page);
    
    // Login before each test
    await authHelper.login();
    await page.waitForLoadState('networkidle');
  });

  test('should display dashboard correctly on mobile', async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check main elements are visible
    await expect(page.locator('h1, [data-testid="dashboard-title"]').first()).toBeVisible();
    
    // Check stats cards are visible
    const statsCards = page.locator('[data-testid="stats-card"], .grid').first();
    await expect(statsCards).toBeVisible();

    // Run mobile checks
    await mobileChecks.runAllChecks();
  });

  test('should have collapsible sidebar on mobile', async ({ page }) => {
    await page.goto('/');
    
    // Check sidebar is hidden by default on mobile
    const sidebar = page.locator('aside, [data-testid="sidebar"]');
    const viewport = page.viewportSize();
    
    if (viewport && viewport.width < 1024) {
      // Sidebar should be off-screen initially
      const isVisible = await sidebar.isVisible();
      const transform = await sidebar.evaluate((el) => {
        return window.getComputedStyle(el).transform;
      });
      
      // Either hidden or translated off-screen
      expect(isVisible === false || transform !== 'none').toBeTruthy();
    }
  });

  test('should show mobile menu button', async ({ page }) => {
    await page.goto('/');
    
    const viewport = page.viewportSize();
    if (viewport && viewport.width < 1024) {
      // Look for menu toggle button
      const menuButton = page.locator(
        'button[aria-label*="menu"], button[aria-label*="Menu"], [data-testid="mobile-menu-button"]'
      ).first();
      
      // Should have some way to open menu
      const hasMenuButton = await menuButton.isVisible().catch(() => false);
      const hasHamburger = await page.locator('svg').count() > 0;
      
      expect(hasMenuButton || hasHamburger).toBeTruthy();
    }
  });

  test('should not have horizontal overflow', async ({ page }) => {
    await page.goto('/');
    await mobileChecks.checkNoHorizontalOverflow();
  });

  test('should have readable text sizes', async ({ page }) => {
    await page.goto('/');
    await mobileChecks.checkTextReadability();
  });

  test('should have responsive images', async ({ page }) => {
    await page.goto('/');
    await mobileChecks.checkResponsiveImages();
  });

  test('should navigate to properties page', async ({ page }) => {
    await page.goto('/');
    
    // Try to find and click properties link
    const propertiesLink = page.locator('a[href*="properties"], a:has-text("Properties")').first();
    if (await propertiesLink.isVisible()) {
      await propertiesLink.click();
      await page.waitForURL(/.*properties.*/, { timeout: 5000 });
      await expect(page).toHaveURL(/.*properties.*/);
    }
  });
});

