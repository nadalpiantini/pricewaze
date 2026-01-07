#!/usr/bin/env tsx
/**
 * Simulate user registration using Playwright to interact with the frontend
 * This creates real users that can login
 */

import { chromium } from 'playwright';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

interface TestUser {
  email: string;
  password: string;
  fullName: string;
  phone: string;
  role: 'buyer' | 'seller' | 'agent' | 'admin';
}

const TEST_USER: TestUser = {
  email: 'maria@test.com',
  password: 'Test123!',
  fullName: 'Maria Garcia',
  phone: '+1-809-555-0101',
  role: 'buyer',
};

async function simulateUserRegistration() {
  console.log('🚀 Starting browser to simulate user registration...\n');
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Navigate to registration page
    console.log('📍 Navigating to registration page...');
    await page.goto('http://localhost:3000/register');
    await page.waitForLoadState('networkidle');

    // Fill registration form
    console.log('📝 Filling registration form...');
    await page.fill('input[id="fullName"]', TEST_USER.fullName);
    await page.fill('input[id="email"]', TEST_USER.email);
    await page.fill('input[id="password"]', TEST_USER.password);
    await page.fill('input[id="confirmPassword"]', TEST_USER.password);

    // Submit form
    console.log('✅ Submitting registration...');
    await page.click('button[type="submit"]');

    // Wait for redirect or success message
    await page.waitForTimeout(3000);

    const currentUrl = page.url();
    console.log(`📍 Current URL: ${currentUrl}`);

    if (currentUrl.includes('/onboarding') || currentUrl.includes('/dashboard')) {
      console.log('✅ Registration successful!');
    } else {
      // Check for error messages
      const errorText = await page.textContent('body').catch(() => '');
      console.log('⚠️  Registration may have issues. Page content:', errorText.substring(0, 200));
    }

    // Take screenshot
    await page.screenshot({ path: 'registration-result.png' });
    console.log('📸 Screenshot saved: registration-result.png');

  } catch (error: any) {
    console.error('❌ Error during registration:', error.message);
    await page.screenshot({ path: 'registration-error.png' });
  } finally {
    await browser.close();
  }
}

// Check if server is running
async function checkServer() {
  try {
    const response = await fetch('http://localhost:3000');
    return response.ok;
  } catch {
    return false;
  }
}

async function main() {
  const serverRunning = await checkServer();
  
  if (!serverRunning) {
    console.error('❌ Frontend server is not running on http://localhost:3000');
    console.error('   Please start it with: pnpm dev');
    process.exit(1);
  }

  await simulateUserRegistration();
}

main();

