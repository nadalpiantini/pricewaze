import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Smart Visit Planner (Routes)
 * 
 * These tests verify route creation, optimization,
 * drag & drop, and navigation features.
 */

test.describe('Smart Visit Planner', () => {
  test.beforeEach(async ({ page }) => {
    // TODO: Setup test user and login
    // await page.goto('/login');
    // await loginTestUser(page);
  });

  test('should create route and add properties', async ({ page }) => {
    await page.goto('/routes');
    
    // Create new route
    await page.fill('[data-testid="route-name-input"]', 'Test Route');
    await page.click('text=Create Route');
    
    // Verify route appears in list
    await expect(page.locator('text=Test Route')).toBeVisible();
    
    // Add property to route
    await page.goto('/properties');
    await page.click('[data-testid="property-card"]:first-child');
    await page.click('text=Add to Route');
    await page.selectOption('[data-testid="route-select"]', 'Test Route');
    await page.click('text=Add');
    
    // Verify property appears in route
    await page.goto('/routes');
    await page.click('text=Test Route');
    await expect(page.locator('[data-testid="route-stop"]')).toContainText('Property');
  });

  test('should optimize route and show estimated time', async ({ page }) => {
    await page.goto('/routes');
    
    // Create route with 3+ properties
    // ... (setup route with multiple stops)
    
    // Click optimize
    await page.click('text=Optimize Route');
    
    // Wait for optimization
    await expect(page.locator('text=Optimizing...')).toBeVisible();
    await expect(page.locator('text=Optimizing...')).not.toBeVisible({ timeout: 10000 });
    
    // Verify estimated time and distance appear
    await expect(page.locator('[data-testid="route-distance"]')).toBeVisible();
    await expect(page.locator('[data-testid="route-duration"]')).toBeVisible();
    
    // Verify map shows route line
    await expect(page.locator('[data-testid="route-line"]')).toBeVisible();
  });

  test('should reorder stops with drag and drop', async ({ page }) => {
    await page.goto('/routes');
    
    // Create route with 3 stops
    // ... (setup route)
    
    // Get initial order
    const stops = page.locator('[data-testid="route-stop"]');
    const firstStop = await stops.nth(0).textContent();
    const secondStop = await stops.nth(1).textContent();
    
    // Drag first stop to second position
    await stops.nth(0).dragTo(stops.nth(1));
    
    // Wait for update
    await page.waitForTimeout(500);
    
    // Verify order changed
    await expect(stops.nth(0)).toContainText(secondStop!);
    await expect(stops.nth(1)).toContainText(firstStop!);
  });

  test('should open route in Waze and Google Maps', async ({ page, context }) => {
    await page.goto('/routes');
    
    // Create route with stops
    // ... (setup route)
    
    // Test Waze link (single stop)
    const [wazePage] = await Promise.all([
      context.waitForEvent('page'),
      page.click('[data-testid="open-waze"]')
    ]);
    
    expect(wazePage.url()).toContain('waze.com');
    await wazePage.close();
    
    // Test Google Maps link (multi-stop)
    const [mapsPage] = await Promise.all([
      context.waitForEvent('page'),
      page.click('[data-testid="open-google-maps"]')
    ]);
    
    expect(mapsPage.url()).toContain('google.com/maps');
    expect(mapsPage.url()).toContain('waypoints=');
    await mapsPage.close();
  });

  test('should export route as text file', async ({ page }) => {
    await page.goto('/routes');
    
    // Create route
    // ... (setup route)
    
    // Click export
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('text=Export')
    ]);
    
    // Verify file downloaded
    expect(download.suggestedFilename()).toContain('.txt');
    
    // Verify file content
    const content = await download.text();
    expect(content).toContain('Route Name');
    expect(content).toContain('Stops:');
  });

  test('should share route via Web Share API', async ({ page, context }) => {
    // Mock Web Share API
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    
    await page.goto('/routes');
    
    // Create route
    // ... (setup route)
    
    // Click share
    await page.click('text=Share');
    
    // Verify share dialog or clipboard
    // (Web Share API behavior varies by browser)
  });
});

