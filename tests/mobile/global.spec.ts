import { test, expect } from '@playwright/test';
import { AuthHelper } from './helpers/auth';
import { MobileChecks } from './helpers/mobile-checks';

test.describe('Global Mobile Design Checks', () => {
  let authHelper: AuthHelper;
  let mobileChecks: MobileChecks;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
    mobileChecks = new MobileChecks(page);
    await authHelper.login();
    await page.waitForLoadState('networkidle');
  });

  test('should have proper viewport meta tag', async ({ page }) => {
    await page.goto('/');
    await mobileChecks.checkViewportMeta();
  });

  test('should have no horizontal scroll on all pages', async ({ page }) => {
    const pages = ['/', '/properties', '/offers', '/visits', '/routes', '/favorites'];
    
    for (const path of pages) {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      await mobileChecks.checkNoHorizontalOverflow();
    }
  });

  test('should have adequate touch targets', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check main navigation buttons
    await mobileChecks.checkTouchTargets('button');
  });

  test('should handle orientation change', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Get current viewport
    const currentViewport = page.viewportSize();
    if (currentViewport) {
      // Simulate orientation change (swap width/height)
      await page.setViewportSize({
        width: currentViewport.height,
        height: currentViewport.width,
      });
      
      await page.waitForTimeout(500);
      
      // Check no overflow after orientation change
      await mobileChecks.checkNoHorizontalOverflow();
      
      // Restore original viewport
      await page.setViewportSize(currentViewport);
    }
  });

  test('should have responsive layout at all breakpoints', async ({ page }) => {
    const breakpoints = [
      { width: 375, height: 667, name: 'mobile-small' },
      { width: 390, height: 844, name: 'mobile-medium' },
      { width: 430, height: 932, name: 'mobile-large' },
      { width: 768, height: 1024, name: 'tablet' },
    ];

    for (const bp of breakpoints) {
      await page.setViewportSize({ width: bp.width, height: bp.height });
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      await mobileChecks.checkNoHorizontalOverflow();
      
      // Take screenshot for visual reference
      await mobileChecks.takeScreenshot(`breakpoint-${bp.name}`);
    }
  });
});

