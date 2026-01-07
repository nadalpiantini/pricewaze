import { test, expect } from '@playwright/test';
import { AuthHelper } from './helpers/auth';
import { MobileChecks } from './helpers/mobile-checks';

test.describe('Visits Page Mobile Design', () => {
  let authHelper: AuthHelper;
  let mobileChecks: MobileChecks;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
    mobileChecks = new MobileChecks(page);
    await authHelper.login();
    await page.waitForLoadState('networkidle');
  });

  test('should display visits page on mobile', async ({ page }) => {
    await page.goto('/visits');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('body')).toBeVisible();
    await mobileChecks.runAllChecks();
  });

  test('should handle visit cards on mobile', async ({ page }) => {
    await page.goto('/visits');
    await page.waitForLoadState('networkidle');

    const visitCards = page.locator('[data-testid="visit-card"], .card');
    const count = await visitCards.count();
    
    if (count > 0) {
      const firstCard = visitCards.first();
      const box = await firstCard.boundingBox();
      const viewport = page.viewportSize();
      
      if (box && viewport) {
        expect(box.width).toBeLessThanOrEqual(viewport.width);
      }
    }
  });

  test('should not have horizontal overflow', async ({ page }) => {
    await page.goto('/visits');
    await mobileChecks.checkNoHorizontalOverflow();
  });
});

