import { defineConfig, devices } from '@playwright/test';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '.env.local') });

/**
 * Mobile Design Recheck Configuration
 * Tests responsive design across multiple mobile viewports
 */
export default defineConfig({
  testDir: './tests/mobile',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: 'playwright-report-mobile' }],
    ['json', { outputFile: 'playwright-report-mobile/results.json' }],
    ['list'],
  ],
  use: {
    baseURL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    // Mobile devices - iPhone SE (smallest common)
    {
      name: 'mobile-iphone-se',
      use: {
        ...devices['iPhone SE'],
        viewport: { width: 375, height: 667 },
      },
    },
    // Mobile devices - iPhone 12/13/14 Pro
    {
      name: 'mobile-iphone-12',
      use: {
        ...devices['iPhone 12 Pro'],
        viewport: { width: 390, height: 844 },
      },
    },
    // Mobile devices - iPhone 14 Pro Max
    {
      name: 'mobile-iphone-14-pro-max',
      use: {
        ...devices['iPhone 14 Pro Max'],
        viewport: { width: 430, height: 932 },
      },
    },
    // Tablet - iPad Mini
    {
      name: 'tablet-ipad-mini',
      use: {
        ...devices['iPad Mini'],
        viewport: { width: 768, height: 1024 },
      },
    },
    // Tablet - iPad Pro
    {
      name: 'tablet-ipad-pro',
      use: {
        ...devices['iPad Pro'],
        viewport: { width: 1024, height: 1366 },
      },
    },
  ],

  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});

