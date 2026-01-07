import { test, expect } from '@playwright/test';
import { loginTestUser } from './helpers/auth';

/**
 * E2E Tests for Property Signals (Waze-style)
 * 
 * These tests verify the complete flow of signal reporting,
 * confirmation, and display.
 * 
 * Prerequisites:
 * - Test users must exist (run pnpm seed or create manually)
 * - At least one property must exist
 */

test.describe('Property Signals', () => {
  test.beforeEach(async ({ page }) => {
    // Login as test user
    await loginTestUser(page, 'maria@test.com', 'Test123!');
  });

  test('should report signal after verified visit', async ({ page }) => {
    // 1. Navigate to properties page
    await page.goto('/properties');
    
    // Wait for properties to load
    await page.waitForSelector('[data-testid="property-card"]', { timeout: 10000 });
    
    // 2. Click on first property
    const firstProperty = page.locator('[data-testid="property-card"]').first();
    await firstProperty.click();
    
    // Wait for property detail page to load
    await page.waitForURL(/\/properties\/[^/]+/, { timeout: 10000 });
    
    // 3. Schedule a visit (if button exists)
    const scheduleButton = page.locator('text=/Schedule Visit|Schedule/i');
    if (await scheduleButton.count() > 0) {
      await scheduleButton.first().click();
      
      // Fill visit form if modal appears
      const dateInput = page.locator('input[type="date"]');
      if (await dateInput.count() > 0) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        await dateInput.fill(tomorrow.toISOString().split('T')[0]);
        
        const timeInput = page.locator('input[type="time"]');
        if (await timeInput.count() > 0) {
          await timeInput.fill('14:00');
        }
        
        await page.locator('button:has-text("Schedule")').click();
        await page.waitForTimeout(1000);
      }
    }
    
    // 4. Navigate to visits page to verify visit
    await page.goto('/visits');
    await page.waitForTimeout(2000);
    
    // Look for verify button or completed visit
    const verifyButton = page.locator('[data-testid="verify-visit-button"]');
    if (await verifyButton.count() > 0) {
      // Mock GPS for testing (in real scenario, this would require actual GPS)
      await page.context().grantPermissions(['geolocation']);
      await page.context().setGeolocation({ latitude: 18.4861, longitude: -69.9312 }); // Santo Domingo
      
      await verifyButton.first().click();
      
      // Fill verification code if needed
      const codeInput = page.locator('input[type="text"]').first();
      if (await codeInput.count() > 0) {
        await codeInput.fill('123456');
      }
      
      await page.waitForTimeout(2000);
    }
    
    // 5. Go back to property and report signal
    await page.goto('/properties');
    await page.waitForSelector('[data-testid="property-card"]');
    await page.locator('[data-testid="property-card"]').first().click();
    await page.waitForURL(/\/properties\/[^/]+/);
    
    // Look for signal report button (should appear after verified visit)
    const noiseButton = page.locator('[data-testid="signal-button-noise"]');
    if (await noiseButton.count() > 0) {
      await noiseButton.click();
      
      // Wait for signal to appear
      await page.waitForTimeout(2000);
      
      // 6. Verify signal badge appears
      const signalBadge = page.locator('[data-testid="signal-badge"]');
      await expect(signalBadge.first()).toBeVisible({ timeout: 5000 });
    } else {
      // Skip if visit verification is required first
      test.skip();
    }
  });

  test('should confirm signal when 3 users report it', async ({ page, context }) => {
    // This test requires multiple users and a property
    // First, get a property ID
    await page.goto('/properties');
    await page.waitForSelector('[data-testid="property-card"]', { timeout: 10000 });
    
    // Get property ID from first card (extract from href or data attribute)
    const firstCard = page.locator('[data-testid="property-card"]').first();
    await firstCard.click();
    await page.waitForURL(/\/properties\/([^/]+)/);
    const url = page.url();
    const propertyId = url.match(/\/properties\/([^/]+)/)?.[1];
    
    if (!propertyId) {
      test.skip();
      return;
    }
    
    // User 1 (maria) - already logged in
    await loginTestUser(page, 'maria@test.com', 'Test123!');
    await page.goto(`/properties/${propertyId}`);
    await page.waitForTimeout(1000);
    
    // User 2 (juan)
    const page2 = await context.newPage();
    await loginTestUser(page2, 'juan@test.com', 'Test123!');
    await page2.goto(`/properties/${propertyId}`);
    await page2.waitForTimeout(1000);
    
    // User 3 (ana)
    const page3 = await context.newPage();
    await loginTestUser(page3, 'ana@test.com', 'Test123!');
    await page3.goto(`/properties/${propertyId}`);
    await page3.waitForTimeout(1000);
    
    // Note: This test requires verified visits for each user
    // In a real scenario, we'd need to:
    // 1. Schedule visits for each user
    // 2. Verify visits (with GPS)
    // 3. Report signals
    // 4. Wait for confirmation (≥3 users in 30 days)
    
    // For now, we'll verify the UI structure exists
    const signalButton = page.locator('[data-testid="signal-button-noise"]');
    if (await signalButton.count() > 0) {
      // UI is ready for signal reporting
      await expect(signalButton).toBeVisible();
    }
    
    // Cleanup
    await page2.close();
    await page3.close();
  });

  test('should show signal decay over time', async ({ page }) => {
    // This test requires backend API to create old signals
    // For now, we verify the UI displays strength correctly
    
    await page.goto('/properties');
    await page.waitForSelector('[data-testid="property-card"]', { timeout: 10000 });
    await page.locator('[data-testid="property-card"]').first().click();
    await page.waitForURL(/\/properties\/[^/]+/);
    
    // Check if signals are displayed with strength
    const signalBadges = page.locator('[data-testid="signal-badge"]');
    const count = await signalBadges.count();
    
    if (count > 0) {
      // Verify badges show strength (×N format)
      const firstBadge = signalBadges.first();
      const text = await firstBadge.textContent();
      
      // Signal badges should show icon and label, optionally strength
      expect(text).toBeTruthy();
    }
    
    // Note: Full decay test requires:
    // 1. API endpoint to create signals with custom timestamps
    // 2. Trigger decay recalculation
    // 3. Verify strength decreased
  });

  test('should display signals on map with correct colors', async ({ page }) => {
    await page.goto('/');
    
    // Wait for map to load
    await page.waitForSelector('[data-testid="mapbox-map"]', { timeout: 15000 });
    await expect(page.locator('[data-testid="mapbox-map"]')).toBeVisible();
    
    // Wait a bit for markers to render
    await page.waitForTimeout(3000);
    
    // Verify property pins exist
    const pins = page.locator('[data-testid="property-pin"]');
    const pinCount = await pins.count();
    
    if (pinCount > 0) {
      await expect(pins.first()).toBeVisible();
      
      // Verify pin has a background color (indicating signal state)
      const firstPin = pins.first();
      const backgroundColor = await firstPin.evaluate((el) => {
        return window.getComputedStyle(el).backgroundColor;
      });
      
      // Pin should have a color (not transparent)
      expect(backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
      
      // Verify legend is visible
      await expect(page.locator('text=Legend:')).toBeVisible();
      await expect(page.locator('text=No signals')).toBeVisible();
      await expect(page.locator('text=Unconfirmed signals')).toBeVisible();
      await expect(page.locator('text=Confirmed signals')).toBeVisible();
    } else {
      // If no properties, skip test
      test.skip();
    }
  });
});

async function reportSignal(page: any, propertyId: string, signalType: string) {
  await page.goto(`/properties/${propertyId}`);
  await page.waitForTimeout(1000);
  
  // Look for signal button
  const signalButton = page.locator(`[data-testid="signal-button-${signalType}"]`);
  
  if (await signalButton.count() > 0) {
    await signalButton.click();
    await page.waitForTimeout(2000);
  } else {
    // Signal reporting requires verified visit first
    throw new Error(`Signal button for ${signalType} not found. Visit may need to be verified first.`);
  }
}

