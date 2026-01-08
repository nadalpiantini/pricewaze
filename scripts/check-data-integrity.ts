#!/usr/bin/env tsx
/**
 * Data Integrity Check - Paso 2 Debug
 * Verifica integridad de datos críticos
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

interface CheckResult {
  name: string;
  status: '✅' | '❌' | '⚠️';
  message: string;
  count?: number;
}

const results: CheckResult[] = [];
let hasErrors = false;

function logCheck(name: string, status: '✅' | '❌' | '⚠️', message: string, count?: number) {
  results.push({ name, status, message, count });
  const emoji = status === '✅' ? '✅' : status === '❌' ? '❌' : '⚠️';
  const countStr = count !== undefined ? ` (${count} found)` : '';
  console.log(`${emoji} ${name}: ${message}${countStr}`);
  if (status === '❌') {
    hasErrors = true;
  }
}

async function checkOrphanedProperties() {
  // Properties sin owner válido
  const { data: orphaned, error } = await supabase
    .from('pricewaze_properties')
    .select('id, title, owner_id')
    .is('owner_id', null)
    .limit(10);

  if (error) {
    logCheck('Orphaned Properties', '❌', `Error: ${error.message}`);
    return;
  }

  if (orphaned && orphaned.length > 0) {
    logCheck('Orphaned Properties', '❌', 'Properties without owner', orphaned.length);
  } else {
    logCheck('Orphaned Properties', '✅', 'All properties have owners');
  }
}

async function checkInvalidPrices() {
  // Properties con precios inválidos
  const { data: invalid, error } = await supabase
    .from('pricewaze_properties')
    .select('id, title, price')
    .lte('price', 0)
    .limit(10);

  if (error) {
    logCheck('Invalid Prices', '❌', `Error: ${error.message}`);
    return;
  }

  if (invalid && invalid.length > 0) {
    logCheck('Invalid Prices', '❌', 'Properties with invalid prices (<= 0)', invalid.length);
  } else {
    logCheck('Invalid Prices', '✅', 'All properties have valid prices');
  }
}

async function checkOrphanedOffers() {
  // Offers sin property válida
  const { data: orphaned, error } = await supabase
    .from('pricewaze_offers')
    .select('id, property_id')
    .limit(100);

  if (error) {
    logCheck('Orphaned Offers', '❌', `Error: ${error.message}`);
    return;
  }

  if (!orphaned || orphaned.length === 0) {
    logCheck('Orphaned Offers', '✅', 'No offers to check');
    return;
  }

  // Verificar que todas las properties existan
  const propertyIds = [...new Set(orphaned.map(o => o.property_id))];
  const { data: properties, error: propError } = await supabase
    .from('pricewaze_properties')
    .select('id')
    .in('id', propertyIds);

  if (propError) {
    logCheck('Orphaned Offers', '❌', `Error checking properties: ${propError.message}`);
    return;
  }

  const existingIds = new Set(properties?.map(p => p.id) || []);
  const missing = propertyIds.filter(id => !existingIds.has(id));

  if (missing.length > 0) {
    logCheck('Orphaned Offers', '❌', 'Offers referencing non-existent properties', missing.length);
  } else {
    logCheck('Orphaned Offers', '✅', 'All offers reference valid properties');
  }
}

async function checkOrphanedVisits() {
  // Visits sin property válida
  const { data: visits, error } = await supabase
    .from('pricewaze_visits')
    .select('id, property_id')
    .limit(100);

  if (error) {
    logCheck('Orphaned Visits', '❌', `Error: ${error.message}`);
    return;
  }

  if (!visits || visits.length === 0) {
    logCheck('Orphaned Visits', '✅', 'No visits to check');
    return;
  }

  const propertyIds = [...new Set(visits.map(v => v.property_id))];
  const { data: properties, error: propError } = await supabase
    .from('pricewaze_properties')
    .select('id')
    .in('id', propertyIds);

  if (propError) {
    logCheck('Orphaned Visits', '❌', `Error checking properties: ${propError.message}`);
    return;
  }

  const existingIds = new Set(properties?.map(p => p.id) || []);
  const missing = propertyIds.filter(id => !existingIds.has(id));

  if (missing.length > 0) {
    logCheck('Orphaned Visits', '❌', 'Visits referencing non-existent properties', missing.length);
  } else {
    logCheck('Orphaned Visits', '✅', 'All visits reference valid properties');
  }
}

async function checkInvalidDates() {
  // Offers con fechas inválidas (expires_at < created_at)
  const { data: invalid, error } = await supabase
    .from('pricewaze_offers')
    .select('id, created_at, expires_at')
    .not('expires_at', 'is', null)
    .limit(100);

  if (error) {
    logCheck('Invalid Dates', '❌', `Error: ${error.message}`);
    return;
  }

  if (!invalid || invalid.length === 0) {
    logCheck('Invalid Dates', '✅', 'No offers with expiration dates to check');
    return;
  }

  const invalidDates = invalid.filter(offer => {
    if (!offer.expires_at || !offer.created_at) return false;
    return new Date(offer.expires_at) < new Date(offer.created_at);
  });

  if (invalidDates.length > 0) {
    logCheck('Invalid Dates', '❌', 'Offers with expires_at < created_at', invalidDates.length);
  } else {
    logCheck('Invalid Dates', '✅', 'All offer dates are valid');
  }
}

async function checkOrphanedSignals() {
  // Signals sin property válida
  const { data: signals, error } = await supabase
    .from('pricewaze_property_signals_raw')
    .select('id, property_id')
    .limit(100);

  if (error) {
    // Tabla puede no existir en algunos entornos
    logCheck('Orphaned Signals', '⚠️', 'Could not check signals (table may not exist)');
    return;
  }

  if (!signals || signals.length === 0) {
    logCheck('Orphaned Signals', '✅', 'No signals to check');
    return;
  }

  const propertyIds = [...new Set(signals.map(s => s.property_id))];
  const { data: properties, error: propError } = await supabase
    .from('pricewaze_properties')
    .select('id')
    .in('id', propertyIds);

  if (propError) {
    logCheck('Orphaned Signals', '❌', `Error checking properties: ${propError.message}`);
    return;
  }

  const existingIds = new Set(properties?.map(p => p.id) || []);
  const missing = propertyIds.filter(id => !existingIds.has(id));

  if (missing.length > 0) {
    logCheck('Orphaned Signals', '❌', 'Signals referencing non-existent properties', missing.length);
  } else {
    logCheck('Orphaned Signals', '✅', 'All signals reference valid properties');
  }
}

async function main() {
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     PASO 2: DATA INTEGRITY CHECK                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('\n');

  try {
    await checkOrphanedProperties();
    await checkInvalidPrices();
    await checkOrphanedOffers();
    await checkOrphanedVisits();
    await checkInvalidDates();
    await checkOrphanedSignals();

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
      console.log('❌ DATA INTEGRITY CHECK FAILED');
      console.log('   Fix errors before proceeding.\n');
      process.exit(1);
    } else {
      console.log('✅ DATA INTEGRITY CHECK PASSED\n');
      process.exit(0);
    }
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

main();

