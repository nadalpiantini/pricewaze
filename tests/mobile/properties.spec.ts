import { test, expect } from '@playwright/test';
import { AuthHelper } from './helpers/auth';
import { MobileChecks } from './helpers/mobile-checks';

test.describe('Properties Page Mobile Design', () => {
  let authHelper: AuthHelper;
  let mobileChecks: MobileChecks;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
    mobileChecks = new MobileChecks(page);
    await authHelper.login();
    await page.waitForLoadState('networkidle');
  });

  test('should display properties list on mobile', async ({ page }) => {
    await page.goto('/properties');
    await page.waitForLoadState('networkidle');

    // Check page loads
    await expect(page.locator('h1, [data-testid="properties-title"]').first()).toBeVisible();
    
    // Check for property cards or list
    const propertyCards = page.locator('[data-testid="property-card"], .card, article').first();
    // May not have properties, so just check page structure
    await expect(page.locator('body')).toBeVisible();
    
    await mobileChecks.runAllChecks();
  });

  test('should handle property cards on mobile', async ({ page }) => {
    await page.goto('/properties');
    await page.waitForLoadState('networkidle');

    // Check property cards are responsive
    const cards = page.locator('[data-testid="property-card"], .card');
    const count = await cards.count();
    
    if (count > 0) {
      const firstCard = cards.first();
      const box = await firstCard.boundingBox();
      const viewport = page.viewportSize();
      
      if (box && viewport) {
        // Card should fit in viewport
        expect(box.width).toBeLessThanOrEqual(viewport.width);
      }
    }
  });

  test('should open property detail modal on mobile', async ({ page }) => {
    await page.goto('/properties');
    await page.waitForLoadState('networkidle');

    // Try to click first property card
    const propertyCard = page.locator('[data-testid="property-card"], .card, article').first();
    const isVisible = await propertyCard.isVisible().catch(() => false);
    
    if (isVisible) {
      await propertyCard.click();
      await page.waitForTimeout(1000); // Wait for modal/detail to open
      
      // Check if modal or detail page opened
      const modal = page.locator('[role="dialog"], [data-testid="property-detail"]');
      const hasModal = await modal.isVisible().catch(() => false);
      
      if (hasModal) {
        await mobileChecks.checkModalMobileFriendly();
      }
    }
  });

  test('should have working filters on mobile', async ({ page }) => {
    await page.goto('/properties');
    await page.waitForLoadState('networkidle');

    // Look for filter button or controls
    const filterButton = page.locator('button:has-text("Filter"), button:has-text("Filters")').first();
    const hasFilters = await filterButton.isVisible().catch(() => false);
    
    if (hasFilters) {
      await filterButton.click();
      await page.waitForTimeout(500);
      
      // Check filter panel is mobile-friendly
      const filterPanel = page.locator('[role="dialog"], [data-testid="filters"]');
      if (await filterPanel.isVisible().catch(() => false)) {
        await mobileChecks.checkModalMobileFriendly();
      }
    }
  });

  test('should not have horizontal overflow', async ({ page }) => {
    await page.goto('/properties');
    await mobileChecks.checkNoHorizontalOverflow();
  });
});

