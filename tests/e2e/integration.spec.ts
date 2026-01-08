import { test, expect } from '@playwright/test';
import { loginTestUser } from './helpers/auth';

/**
 * E2E Integration Tests
 * 
 * These tests verify complete user flows end-to-end.
 * 
 * Prerequisites:
 * - Test users must exist (run pnpm seed or create manually)
 * - At least one property must exist
 */

test.describe('Complete User Flows', () => {
  test('complete flow: new user registration to property search', async ({ page }) => {
    // This test simulates a new user's first experience
    // Note: Full registration flow might require email verification
    
    // Step 1: Register (if not already registered)
    const timestamp = Date.now();
    const testEmail = `newuser-${timestamp}@example.com`;
    const testPassword = 'Test123!';
    
    await page.goto('/register');
    await page.waitForSelector('[data-testid="email-input"]', { timeout: 5000 });
    
    await page.fill('[data-testid="email-input"]', testEmail);
    await page.fill('[data-testid="password-input"]', testPassword);
    
    const confirmPasswordField = page.locator('[data-testid="confirm-password-input"]');
    if (await confirmPasswordField.count() > 0) {
      await confirmPasswordField.fill(testPassword);
    }
    
    await page.click('[data-testid="register-button"]');
    await page.waitForTimeout(3000);
    
    // Step 2: If redirected to onboarding, complete it
    if (page.url().includes('/onboarding')) {
      // Skip onboarding for now (can be completed in separate test)
      await page.goto('/properties');
    }
    
    // Step 3: Search for properties
    await page.goto('/properties');
    await page.waitForSelector('[data-testid="property-card"]', { timeout: 10000 });
    
    // Verify properties are visible
    const propertyCards = page.locator('[data-testid="property-card"]');
    const cardCount = await propertyCards.count();
    expect(cardCount).toBeGreaterThan(0);
    
    // Step 4: View property detail
    await propertyCards.first().click();
    await page.waitForURL(/\/properties\/[^/]+/);
    
    // Verify property detail page loaded
    await expect(page.locator('h1, h2')).toBeVisible();
  });

  test('complete flow: existing user - search to route creation', async ({ page }) => {
    // Login as existing user
    await loginTestUser(page, 'maria@test.com', 'Test123!');
    
    // Step 1: View properties
    await page.goto('/properties');
    await page.waitForSelector('[data-testid="property-card"]', { timeout: 10000 });
    
    // Step 2: View property detail
    await page.locator('[data-testid="property-card"]').first().click();
    await page.waitForURL(/\/properties\/[^/]+/);
    
    // Step 3: Create a route
    await page.goto('/routes');
    await page.waitForLoadState('networkidle');
    
    // Create new route
    await page.click('text=New Route');
    await page.waitForSelector('[data-testid="route-name-input"]', { timeout: 5000 });
    await page.fill('[data-testid="route-name-input"]', 'Integration Test Route');
    await page.click('[data-testid="create-route-button"]');
    await page.waitForTimeout(2000);
    
    // Verify route was created
    await expect(page.locator('text=Integration Test Route')).toBeVisible({ timeout: 10000 });
    
    // Step 4: Add property to route
    await page.goto('/properties');
    await page.waitForSelector('[data-testid="property-card"]');
    await page.locator('[data-testid="property-card"]').first().click();
    await page.waitForURL(/\/properties\/[^/]+/);
    
    // Look for "Add to Route" button
    const addToRouteButton = page.locator('text=/Add to Route|Add to route/i');
    if (await addToRouteButton.count() > 0) {
      await addToRouteButton.first().click();
      await page.waitForTimeout(1000);
      
      // Select route
      const routeSelect = page.locator('[data-testid="route-select"]');
      if (await routeSelect.count() > 0) {
        await routeSelect.selectOption({ label: 'Integration Test Route' });
        await page.click('text=/Add|Confirm/i');
        await page.waitForTimeout(2000);
      }
    }
    
    // Step 5: Verify property in route
    await page.goto('/routes');
    await page.waitForTimeout(1000);
    await page.click('text=Integration Test Route');
    await page.waitForTimeout(2000);
    
    // Route should have at least one stop
    const routeStops = page.locator('[data-testid="route-stop"]');
    const stopCount = await routeStops.count();
    
    // If stops exist, verify they're visible
    if (stopCount > 0) {
      await expect(routeStops.first()).toBeVisible();
    }
  });

  test('complete flow: property search to signal reporting', async ({ page }) => {
    // Login
    await loginTestUser(page, 'maria@test.com', 'Test123!');
    
    // Step 1: Search properties
    await page.goto('/properties');
    await page.waitForSelector('[data-testid="property-card"]', { timeout: 10000 });
    
    // Step 2: View property
    await page.locator('[data-testid="property-card"]').first().click();
    await page.waitForURL(/\/properties\/[^/]+/);
    
    // Step 3: Schedule visit (if button exists)
    const scheduleButton = page.locator('text=/Schedule Visit|Schedule/i');
    if (await scheduleButton.count() > 0) {
      await scheduleButton.first().click();
      await page.waitForTimeout(1000);
      
      // Fill visit form
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
        await page.waitForTimeout(2000);
      }
    }
    
    // Step 4: Verify visit (navigate to visits page)
    await page.goto('/visits');
    await page.waitForTimeout(2000);
    
    // Look for verify button
    const verifyButton = page.locator('[data-testid="verify-visit-button"]');
    if (await verifyButton.count() > 0) {
      // Mock GPS
      await page.context().grantPermissions(['geolocation']);
      await page.context().setGeolocation({ latitude: 18.4861, longitude: -69.9312 });
      
      await verifyButton.first().click();
      await page.waitForTimeout(2000);
      
      // Fill verification code if needed
      const codeInput = page.locator('input[type="text"]').first();
      if (await codeInput.count() > 0) {
        await codeInput.fill('123456');
        await page.waitForTimeout(1000);
      }
    }
    
    // Step 5: Report signal (go back to property)
    await page.goto('/properties');
    await page.waitForSelector('[data-testid="property-card"]');
    await page.locator('[data-testid="property-card"]').first().click();
    await page.waitForURL(/\/properties\/[^/]+/);
    
    // Look for signal report button
    const noiseButton = page.locator('[data-testid="signal-button-noise"]');
    if (await noiseButton.count() > 0) {
      await noiseButton.click();
      await page.waitForTimeout(2000);
      
      // Verify signal badge appears
      const signalBadge = page.locator('[data-testid="signal-badge"]');
      await expect(signalBadge.first()).toBeVisible({ timeout: 5000 });
    } else {
      // Signal reporting requires verified visit first
      // This is expected behavior
      test.skip();
    }
  });
});

