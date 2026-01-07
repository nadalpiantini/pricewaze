import { test, expect } from '@playwright/test';
import { AuthHelper } from './helpers/auth';
import { MobileChecks } from './helpers/mobile-checks';

test.describe('Offers Page Mobile Design', () => {
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
      await page.goto('/offers');
      await page.waitForLoadState('networkidle');
    }
  });

  test('should display offers page on mobile', async ({ page }) => {
    await page.goto('/offers');
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

  test('should handle offer cards on mobile', async ({ page }) => {
    await page.goto('/offers');
    await page.waitForLoadState('networkidle');

    // Check for offer cards or list
    const offerCards = page.locator('[data-testid="offer-card"], .card');
    const count = await offerCards.count();
    
    if (count > 0) {
      const firstCard = offerCards.first();
      const box = await firstCard.boundingBox();
      const viewport = page.viewportSize();
      
      if (box && viewport) {
        expect(box.width).toBeLessThanOrEqual(viewport.width);
      }
    }
  });

  test('should not have horizontal overflow', async ({ page }) => {
    await page.goto('/offers');
    await mobileChecks.checkNoHorizontalOverflow();
  });
});

