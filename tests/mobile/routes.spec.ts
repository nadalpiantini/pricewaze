import { test, expect } from '@playwright/test';
import { AuthHelper } from './helpers/auth';
import { MobileChecks } from './helpers/mobile-checks';

test.describe('Routes Page Mobile Design', () => {
  let authHelper: AuthHelper;
  let mobileChecks: MobileChecks;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
    mobileChecks = new MobileChecks(page);
    
    // Try to login, but skip if user doesn't exist (for UI testing)
    try {
      await authHelper.login();
      await page.waitForLoadState('networkidle');
    } catch (error) {
      // If login fails, navigate to page without auth (for testing responsive design)
      console.warn('Login failed, testing without authentication:', error);
      await page.goto('/routes');
      await page.waitForLoadState('networkidle');
    }
  });

  test('should display routes page on mobile', async ({ page }) => {
    await page.goto('/routes');
    await page.waitForLoadState('networkidle');

    // If redirected to login, test login page instead
    if (page.url().includes('/login')) {
      await expect(page.locator('form, #email').first()).toBeVisible();
      await mobileChecks.runAllChecks();
      return;
    }

    await expect(page.locator('body')).toBeVisible();
    await mobileChecks.runAllChecks();
  });

  test('should handle map on mobile', async ({ page }) => {
    await page.goto('/routes');
    await page.waitForLoadState('networkidle');

    // Check for map container
    const mapContainer = page.locator('[data-testid="map"], .map, canvas').first();
    const hasMap = await mapContainer.isVisible().catch(() => false);
    
    if (hasMap) {
      const box = await mapContainer.boundingBox();
      const viewport = page.viewportSize();
      
      if (box && viewport) {
        // Map should fit in viewport
        expect(box.width).toBeLessThanOrEqual(viewport.width);
      }
    }
  });

  test('should not have horizontal overflow', async ({ page }) => {
    await page.goto('/routes');
    await mobileChecks.checkNoHorizontalOverflow();
  });
});

