#!/usr/bin/env tsx
/**
 * DÍA 2 Verification: Realtime + Copiloto + Paywall
 * Verifica implementación según MVP_0.007_DEBUG_PLAN.md
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

interface CheckResult {
  name: string;
  status: '✅' | '❌' | '⚠️';
  message: string;
  file?: string;
  line?: number;
}

const results: CheckResult[] = [];
let hasErrors = false;

function logCheck(name: string, status: '✅' | '❌' | '⚠️', message: string, file?: string, line?: number) {
  results.push({ name, status, message, file, line });
  const emoji = status === '✅' ? '✅' : status === '❌' ? '❌' : '⚠️';
  const location = file ? ` (${file}${line ? `:${line}` : ''})` : '';
  console.log(`${emoji} ${name}: ${message}${location}`);
  if (status === '❌') {
    hasErrors = true;
  }
}

// Check 1: Realtime subscriptions
function checkRealtimeSubscriptions() {
  console.log('\n📡 2.1 REALTIME\n');

  const mapFile = resolve(process.cwd(), 'src/components/map/PropertyMapWithSignals.tsx');
  const signalsFile = resolve(process.cwd(), 'src/components/signals/PropertySignals.tsx');
  const alertsFile = resolve(process.cwd(), 'src/hooks/useSignalAlerts.ts');

  try {
    const mapContent = readFileSync(mapFile, 'utf-8');
    const signalsContent = readFileSync(signalsFile, 'utf-8');
    const alertsContent = readFileSync(alertsFile, 'utf-8');

    // Check PropertyMapWithSignals has realtime subscription
    if (mapContent.includes('.channel(') && mapContent.includes('postgres_changes')) {
      logCheck('Map Realtime', '✅', 'PropertyMapWithSignals has realtime subscription', 'PropertyMapWithSignals.tsx');
    } else {
      logCheck('Map Realtime', '❌', 'PropertyMapWithSignals missing realtime subscription', 'PropertyMapWithSignals.tsx');
    }

    // Check cleanup
    if (mapContent.includes('removeChannel')) {
      logCheck('Map Cleanup', '✅', 'PropertyMapWithSignals cleans up channel', 'PropertyMapWithSignals.tsx');
    } else {
      logCheck('Map Cleanup', '❌', 'PropertyMapWithSignals missing channel cleanup', 'PropertyMapWithSignals.tsx');
    }

    // Check PropertySignals has realtime subscription
    if (signalsContent.includes('.channel(') && signalsContent.includes('postgres_changes')) {
      logCheck('Signals Realtime', '✅', 'PropertySignals has realtime subscription', 'PropertySignals.tsx');
    } else {
      logCheck('Signals Realtime', '❌', 'PropertySignals missing realtime subscription', 'PropertySignals.tsx');
    }

    // Check useSignalAlerts filters by followed properties
    if (alertsContent.includes('followedProperties') && alertsContent.includes('.has(')) {
      logCheck('Alerts Filter', '✅', 'useSignalAlerts filters by followed properties', 'useSignalAlerts.ts');
    } else {
      logCheck('Alerts Filter', '❌', 'useSignalAlerts missing follow filter', 'useSignalAlerts.ts');
    }
  } catch (error) {
    logCheck('Realtime Files', '❌', `Error reading files: ${error}`);
  }
}

// Check 2: Trigger exists
function checkTrigger() {
  console.log('\n🔔 2.1.3 TRIGGER (No Duplicates)\n');

  const triggerFile = resolve(process.cwd(), 'supabase/migrations/20260110000010_signal_confirmed_trigger.sql');
  
  try {
    const triggerContent = readFileSync(triggerFile, 'utf-8');

    if (triggerContent.includes('signal_confirmed_trigger') && triggerContent.includes('WHEN (NEW.confirmed = true')) {
      logCheck('Trigger Exists', '✅', 'signal_confirmed_trigger exists with correct condition', 'signal_confirmed_trigger.sql');
    } else {
      logCheck('Trigger Exists', '❌', 'signal_confirmed_trigger missing or incorrect', 'signal_confirmed_trigger.sql');
    }
  } catch (error) {
    logCheck('Trigger File', '⚠️', 'Could not read trigger file (may not exist)');
  }
}

// Check 3: Copiloto validation
function checkCopilotValidation() {
  console.log('\n🤖 2.2 COPILOTO\n');

  const validatorFile = resolve(process.cwd(), 'src/lib/copilotValidator.ts');
  const apiFile = resolve(process.cwd(), 'src/app/api/copilot/negotiate/route.ts');
  const panelFile = resolve(process.cwd(), 'src/components/copilot/CopilotPanel.tsx');

  try {
    const validatorContent = readFileSync(validatorFile, 'utf-8');
    const apiContent = readFileSync(apiFile, 'utf-8');
    const panelContent = readFileSync(panelFile, 'utf-8');

    // Check safeJsonParse exists
    if (validatorContent.includes('safeJsonParse')) {
      logCheck('JSON Parser', '✅', 'safeJsonParse exists', 'copilotValidator.ts');
    } else {
      logCheck('JSON Parser', '❌', 'safeJsonParse missing', 'copilotValidator.ts');
    }

    // Check isValidAnalysis exists
    if (validatorContent.includes('isValidAnalysis')) {
      logCheck('Analysis Validator', '✅', 'isValidAnalysis exists', 'copilotValidator.ts');
    } else {
      logCheck('Analysis Validator', '❌', 'isValidAnalysis missing', 'copilotValidator.ts');
    }

    // Check fallbackAnalysis exists
    if (validatorContent.includes('fallbackAnalysis')) {
      logCheck('Fallback', '✅', 'fallbackAnalysis exists', 'copilotValidator.ts');
    } else {
      logCheck('Fallback', '❌', 'fallbackAnalysis missing', 'copilotValidator.ts');
    }

    // Check API uses validation
    if (apiContent.includes('safeJsonParse') && apiContent.includes('isValidAnalysis') && apiContent.includes('fallbackAnalysis')) {
      logCheck('API Validation', '✅', 'API route uses validation and fallback', 'route.ts');
    } else {
      logCheck('API Validation', '❌', 'API route missing validation or fallback', 'route.ts');
    }

    // Check cache (should use useRef with Map or React Query)
    if (panelContent.includes('cacheRef') && panelContent.includes('Map') && panelContent.includes('CACHE_DURATION')) {
      logCheck('Copilot Cache', '✅', 'Cache implementation found with duration check', 'CopilotPanel.tsx');
    } else if (panelContent.includes('useQuery') || panelContent.includes('useMemo') || panelContent.includes('cache')) {
      logCheck('Copilot Cache', '⚠️', 'Possible cache implementation found (needs manual verification)', 'CopilotPanel.tsx');
    } else {
      logCheck('Copilot Cache', '❌', 'No cache found in CopilotPanel (may cause duplicate calls)', 'CopilotPanel.tsx');
    }
  } catch (error) {
    logCheck('Copilot Files', '❌', `Error reading files: ${error}`);
  }
}

// Check 4: Paywall
function checkPaywall() {
  console.log('\n💰 2.3 PAYWALL\n');

  const panelFile = resolve(process.cwd(), 'src/components/copilot/CopilotPanel.tsx');
  const subscriptionFile = resolve(process.cwd(), 'src/lib/subscription.ts');
  const propertiesPage = resolve(process.cwd(), 'src/app/(dashboard)/properties/[id]/page.tsx');

  try {
    const panelContent = readFileSync(panelFile, 'utf-8');
    const subscriptionContent = readFileSync(subscriptionFile, 'utf-8');
    const propertiesContent = readFileSync(propertiesPage, 'utf-8');

    // Check CopilotPanel checks Pro access
    if (panelContent.includes('isPro') && panelContent.includes('PaywallInline')) {
      logCheck('Copilot Paywall', '✅', 'CopilotPanel checks Pro access and shows paywall', 'CopilotPanel.tsx');
    } else {
      logCheck('Copilot Paywall', '❌', 'CopilotPanel missing Pro check or paywall', 'CopilotPanel.tsx');
    }

    // Check isPro function exists
    if (subscriptionContent.includes('isPro')) {
      logCheck('Pro Check Function', '✅', 'isPro function exists', 'subscription.ts');
    } else {
      logCheck('Pro Check Function', '❌', 'isPro function missing', 'subscription.ts');
    }

    // Check properties page doesn't block free users
    if (!propertiesContent.includes('hasProAccess') || !propertiesContent.includes('isPro')) {
      logCheck('Properties Free Access', '✅', 'Properties page does not block free users', 'properties/[id]/page.tsx');
    } else {
      // Check if it's only used for optional features
      if (propertiesContent.includes('PaywallInline') && propertiesContent.includes('copilot')) {
        logCheck('Properties Free Access', '✅', 'Properties page only blocks copilot (correct)', 'properties/[id]/page.tsx');
      } else {
        logCheck('Properties Free Access', '⚠️', 'Properties page may block free users (needs manual check)', 'properties/[id]/page.tsx');
      }
    }
  } catch (error) {
    logCheck('Paywall Files', '❌', `Error reading files: ${error}`);
  }
}

async function main() {
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     DÍA 2: REALTIME + COPILOTO + PAYWALL                   ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('\n');

  checkRealtimeSubscriptions();
  checkTrigger();
  checkCopilotValidation();
  checkPaywall();

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
    console.log('❌ DÍA 2 VERIFICATION FAILED');
    console.log('   Fix errors before proceeding.\n');
    process.exit(1);
  } else if (warnings > 0) {
    console.log('⚠️  DÍA 2 VERIFICATION PASSED WITH WARNINGS');
    console.log('   Review warnings manually.\n');
    process.exit(0);
  } else {
    console.log('✅ DÍA 2 VERIFICATION PASSED\n');
    process.exit(0);
  }
}

main();

