#!/usr/bin/env tsx
/**
 * DÍA 3 Verification: PWA + Mobile + Performance
 * Verifica implementación según MVP_0.007_DEBUG_PLAN.md
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

interface CheckResult {
  name: string;
  status: '✅' | '❌' | '⚠️';
  message: string;
  file?: string;
}

const results: CheckResult[] = [];
let hasErrors = false;

function logCheck(name: string, status: '✅' | '❌' | '⚠️', message: string, file?: string) {
  results.push({ name, status, message, file });
  const emoji = status === '✅' ? '✅' : status === '❌' ? '❌' : '⚠️';
  const location = file ? ` (${file})` : '';
  console.log(`${emoji} ${name}: ${message}${location}`);
  if (status === '❌') {
    hasErrors = true;
  }
}

// Check 1: PWA Setup
function checkPWASetup() {
  console.log('\n📱 3.1 PWA\n');

  const manifestPath = resolve(process.cwd(), 'public/manifest.json');
  const swPath = resolve(process.cwd(), 'public/sw.js');
  const pwaProviderPath = resolve(process.cwd(), 'src/components/pwa/PWAProvider.tsx');
  const layoutPath = resolve(process.cwd(), 'src/app/layout.tsx');

  // Check manifest.json exists
  if (existsSync(manifestPath)) {
    try {
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
      if (manifest.name && manifest.start_url && manifest.icons) {
        logCheck('Manifest.json', '✅', 'manifest.json exists and is valid', 'manifest.json');
      } else {
        logCheck('Manifest.json', '❌', 'manifest.json missing required fields', 'manifest.json');
      }
    } catch (error) {
      logCheck('Manifest.json', '❌', `Error reading manifest.json: ${error}`, 'manifest.json');
    }
  } else {
    logCheck('Manifest.json', '❌', 'manifest.json not found', 'manifest.json');
  }

  // Check service worker exists
  if (existsSync(swPath)) {
    logCheck('Service Worker', '✅', 'sw.js exists', 'sw.js');
  } else {
    logCheck('Service Worker', '❌', 'sw.js not found', 'sw.js');
  }

  // Check PWAProvider exists and registers SW
  if (existsSync(pwaProviderPath)) {
    const pwaContent = readFileSync(pwaProviderPath, 'utf-8');
    if (pwaContent.includes('serviceWorker') && pwaContent.includes('register')) {
      logCheck('PWA Provider', '✅', 'PWAProvider registers service worker', 'PWAProvider.tsx');
    } else {
      logCheck('PWA Provider', '❌', 'PWAProvider missing service worker registration', 'PWAProvider.tsx');
    }
  } else {
    logCheck('PWA Provider', '❌', 'PWAProvider not found', 'PWAProvider.tsx');
  }

  // Check layout includes PWAProvider
  if (existsSync(layoutPath)) {
    const layoutContent = readFileSync(layoutPath, 'utf-8');
    if (layoutContent.includes('PWAProvider')) {
      logCheck('Layout Integration', '✅', 'Root layout includes PWAProvider', 'layout.tsx');
    } else {
      logCheck('Layout Integration', '❌', 'Root layout missing PWAProvider', 'layout.tsx');
    }
  }
}

// Check 2: Push Notifications
function checkPushNotifications() {
  console.log('\n🔔 3.1.2 Push Notifications\n');

  const pushLibPath = resolve(process.cwd(), 'src/lib/push-notifications.ts');
  const pushApiPath = resolve(process.cwd(), 'src/app/api/push/register/route.ts');

  if (existsSync(pushLibPath)) {
    const pushContent = readFileSync(pushLibPath, 'utf-8');
    if (pushContent.includes('registerPushSubscription') && pushContent.includes('requestPushPermission')) {
      logCheck('Push Library', '✅', 'Push notifications library exists', 'push-notifications.ts');
    } else {
      logCheck('Push Library', '❌', 'Push library missing key functions', 'push-notifications.ts');
    }
  } else {
    logCheck('Push Library', '❌', 'Push notifications library not found', 'push-notifications.ts');
  }

  if (existsSync(pushApiPath)) {
    logCheck('Push API', '✅', 'Push registration API exists', 'api/push/register/route.ts');
  } else {
    logCheck('Push API', '⚠️', 'Push registration API not found (may be optional)', 'api/push/register/route.ts');
  }

  // Note: Rate limiting check would require DB verification
  logCheck('Push Rate Limit', '⚠️', 'Rate limiting needs manual DB verification (check pricewaze_alert_events)', '');
}

// Check 3: Mobile/UX States
function checkMobileUX() {
  console.log('\n📱 3.2 MOBILE / UX\n');

  const emptyStatePath = resolve(process.cwd(), 'src/components/ui/empty-state.tsx');
  const pagePath = resolve(process.cwd(), 'src/app/page.tsx');
  const offersListPath = resolve(process.cwd(), 'src/components/offers/OffersList.tsx');

  // Check EmptyState component exists
  if (existsSync(emptyStatePath)) {
    logCheck('Empty State Component', '✅', 'EmptyState component exists', 'empty-state.tsx');
  } else {
    logCheck('Empty State Component', '⚠️', 'EmptyState component not found (may use inline)', 'empty-state.tsx');
  }

  // Check loading states
  if (existsSync(pagePath)) {
    const pageContent = readFileSync(pagePath, 'utf-8');
    if (pageContent.includes('isLoading') || pageContent.includes('loading')) {
      logCheck('Loading States', '✅', 'Loading states found in main page', 'page.tsx');
    } else {
      logCheck('Loading States', '⚠️', 'Loading states may be missing', 'page.tsx');
    }

    if (pageContent.includes('error') && pageContent.includes('Error State')) {
      logCheck('Error States', '✅', 'Error states found in main page', 'page.tsx');
    } else {
      logCheck('Error States', '⚠️', 'Error states may be missing', 'page.tsx');
    }
  }

  // Check OffersList has states
  if (existsSync(offersListPath)) {
    const offersContent = readFileSync(offersListPath, 'utf-8');
    if (offersContent.includes('loading') && offersContent.includes('error') && offersContent.includes('No offers')) {
      logCheck('Component States', '✅', 'OffersList has loading, error, and empty states', 'OffersList.tsx');
    } else {
      logCheck('Component States', '⚠️', 'OffersList may be missing some states', 'OffersList.tsx');
    }
  }

  // Note: Copy review requires manual inspection
  logCheck('Copy Review', '⚠️', 'Copy clarity needs manual review (check UI text)', '');
}

// Check 4: Performance
function checkPerformance() {
  console.log('\n⚡ 3.3 PERFORMANCE\n');

  const copilotPanelPath = resolve(process.cwd(), 'src/components/copilot/CopilotPanel.tsx');
  const mapSignalsPath = resolve(process.cwd(), 'src/components/map/PropertyMapWithSignals.tsx');

  // Check CopilotPanel cache (already verified in DÍA 2)
  if (existsSync(copilotPanelPath)) {
    const copilotContent = readFileSync(copilotPanelPath, 'utf-8');
    if (copilotContent.includes('cacheRef') && copilotContent.includes('CACHE_DURATION')) {
      logCheck('Copilot Cache', '✅', 'CopilotPanel has cache implementation', 'CopilotPanel.tsx');
    } else {
      logCheck('Copilot Cache', '❌', 'CopilotPanel missing cache', 'CopilotPanel.tsx');
    }
  }

  // Check React Query usage (indicates proper caching)
  const grep = require('child_process').execSync;
  try {
    const reactQueryFiles = grep('grep -r "useQuery" src --include="*.tsx" --include="*.ts" | wc -l', { encoding: 'utf-8' }).trim();
    const count = parseInt(reactQueryFiles) || 0;
    if (count > 0) {
      logCheck('React Query Usage', '✅', `React Query used in ${count} files (indicates caching)`, '');
    } else {
      logCheck('React Query Usage', '⚠️', 'React Query not found (may use other caching)', '');
    }
  } catch {
    logCheck('React Query Usage', '⚠️', 'Could not verify React Query usage', '');
  }

  // Check Realtime cleanup
  if (existsSync(mapSignalsPath)) {
    const mapContent = readFileSync(mapSignalsPath, 'utf-8');
    if (mapContent.includes('removeChannel')) {
      logCheck('Realtime Cleanup', '✅', 'Realtime channels are cleaned up', 'PropertyMapWithSignals.tsx');
    } else {
      logCheck('Realtime Cleanup', '❌', 'Realtime channels may not be cleaned up', 'PropertyMapWithSignals.tsx');
    }
  }

  // Note: Lighthouse requires manual testing
  logCheck('Lighthouse Score', '⚠️', 'Lighthouse testing requires manual run (npx lighthouse)', '');
}

async function main() {
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     DÍA 3: PWA + MOBILE + PERFORMANCE                       ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('\n');

  checkPWASetup();
  checkPushNotifications();
  checkMobileUX();
  checkPerformance();

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 SUMMARY');
  console.log('='.repeat(60) + '\n');

  const passed = results.filter(r => r.status === '✅').length;
  const failed = results.filter(r => r.status === '❌').length;
  const warnings = results.filter(r => r.status === '⚠️').length;

  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⚠️  Warnings: ${warnings}`);
  console.log(`📋 Total: ${results.length}\n`);

  if (hasErrors) {
    console.log('❌ DÍA 3 VERIFICATION FAILED');
    console.log('   Fix errors before proceeding.\n');
    process.exit(1);
  } else if (warnings > 0) {
    console.log('⚠️  DÍA 3 VERIFICATION PASSED WITH WARNINGS');
    console.log('   Review warnings manually (Lighthouse, copy review, rate limiting).\n');
    process.exit(0);
  } else {
    console.log('✅ DÍA 3 VERIFICATION PASSED\n');
    process.exit(0);
  }
}

main();

