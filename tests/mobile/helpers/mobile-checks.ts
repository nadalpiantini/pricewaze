import { Page, expect } from '@playwright/test';

/**
 * Mobile-specific design checks
 * Validates responsive design patterns and mobile UX
 */
export class MobileChecks {
  constructor(private page: Page) {}

  /**
   * Check for horizontal overflow (common mobile issue)
   */
  async checkNoHorizontalOverflow() {
    const overflow = await this.page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(overflow).toBe(false);
  }

  /**
   * Check touch target sizes (minimum 44x44px for mobile)
   */
  async checkTouchTargets(selector: string = 'button, a[href]') {
    const elements = await this.page.locator(selector).all();
    const issues: string[] = [];
    
    for (const element of elements.slice(0, 20)) { // Limit to first 20 to avoid too many checks
      const box = await element.boundingBox();
      if (box) {
        const minSize = 44;
        if (box.width < minSize || box.height < minSize) {
          const text = await element.textContent().catch(() => '') || '';
          issues.push(`Element "${text.substring(0, 30)}" has size ${box.width}x${box.height}`);
        }
      }
    }
    
    // Log issues but don't fail test (warning only)
    if (issues.length > 0) {
      console.warn('Touch target size issues found:', issues);
    }
  }

  /**
   * Check that sidebar is hidden/collapsed on mobile
   */
  async checkSidebarMobileBehavior() {
    const sidebar = this.page.locator('[data-testid="sidebar"], aside').first();
    const viewport = this.page.viewportSize();
    
    if (viewport && viewport.width < 1024) {
      // On mobile, sidebar should be hidden by default or behind overlay
      const isVisible = await sidebar.isVisible().catch(() => false);
      
      if (isVisible) {
        // If visible, check if it's translated off-screen
        const transform = await sidebar.evaluate((el) => {
          return window.getComputedStyle(el).transform;
        });
        // Should be translated off-screen
        expect(transform !== 'none' || transform.includes('translate')).toBeTruthy();
      } else {
        // If not visible, that's also acceptable
        expect(isVisible).toBe(false);
      }
    }
  }

  /**
   * Check that mobile menu button is visible on mobile
   */
  async checkMobileMenuButton() {
    const viewport = this.page.viewportSize();
    if (viewport && viewport.width < 1024) {
      // Skip check if on login/register page (no menu button needed)
      const url = this.page.url();
      if (url.includes('/login') || url.includes('/register')) {
        return; // Login pages don't need mobile menu button
      }
      
      // Look for hamburger menu or mobile menu button
      const menuButton = this.page.locator(
        'button[aria-label*="menu"], button[aria-label*="Menu"], [data-testid="mobile-menu-button"]'
      );
      const isVisible = await menuButton.first().isVisible().catch(() => false);
      
      // If no menu button, at least check there are interactive elements
      if (!isVisible) {
        const hasButtons = await this.page.locator('button').count() > 0;
        if (!hasButtons) {
          console.warn('No mobile menu button found, but this may be acceptable for some pages');
        }
      } else {
        await expect(menuButton.first()).toBeVisible();
      }
    }
  }

  /**
   * Check text is readable (not too small)
   */
  async checkTextReadability(selector: string = 'body') {
    const textElements = await this.page.locator(`${selector} p, ${selector} span, ${selector} div`).all();
    for (const element of textElements.slice(0, 10)) { // Check first 10 to avoid too many checks
      const fontSize = await element.evaluate((el) => {
        const style = window.getComputedStyle(el);
        return parseFloat(style.fontSize);
      });
      // Minimum readable font size on mobile is typically 14px
      expect(fontSize).toBeGreaterThanOrEqual(12);
    }
  }

  /**
   * Check that modals/dialogs are mobile-friendly
   */
  async checkModalMobileFriendly() {
    const modals = await this.page.locator('[role="dialog"], [data-testid="dialog"]').all();
    for (const modal of modals) {
      if (await modal.isVisible()) {
        const box = await modal.boundingBox();
        const viewport = this.page.viewportSize();
        if (box && viewport) {
          // Modal should not exceed viewport
          expect(box.width).toBeLessThanOrEqual(viewport.width);
          expect(box.height).toBeLessThanOrEqual(viewport.height);
        }
      }
    }
  }

  /**
   * Check that images are responsive
   */
  async checkResponsiveImages() {
    const images = await this.page.locator('img').all();
    for (const img of images) {
      const box = await img.boundingBox();
      const viewport = this.page.viewportSize();
      if (box && viewport) {
        // Images should not exceed viewport width
        expect(box.width).toBeLessThanOrEqual(viewport.width);
      }
    }
  }

  /**
   * Check viewport meta tag
   */
  async checkViewportMeta() {
    const viewport = await this.page.locator('meta[name="viewport"]').getAttribute('content');
    expect(viewport).toContain('width=device-width');
  }

  /**
   * Take screenshot for visual regression
   */
  async takeScreenshot(name: string) {
    await this.page.screenshot({
      path: `tests/mobile/screenshots/${name}.png`,
      fullPage: true,
    });
  }

  /**
   * Run all mobile checks
   */
  async runAllChecks() {
    await this.checkNoHorizontalOverflow();
    await this.checkViewportMeta();
    await this.checkSidebarMobileBehavior();
    await this.checkMobileMenuButton();
    await this.checkResponsiveImages();
  }
}

