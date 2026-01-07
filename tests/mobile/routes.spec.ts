import { test, expect } from '@playwright/test';
import { AuthHelper } from './helpers/auth';
import { MobileChecks } from './helpers/mobile-checks';

test.describe('Routes Page Mobile Design', () => {
  let authHelper: AuthHelper;
  let mobileChecks: MobileChecks;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
    mobileChecks = new MobileChecks(page);
    await authHelper.login();
    await page.waitForLoadState('networkidle');
  });

  test('should display routes page on mobile', async ({ page }) => {
    await page.goto('/routes');
    await page.waitForLoadState('networkidle');

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

