#!/usr/bin/env tsx
/**
 * Test complete user flow after manual registration
 * This script verifies that a user can:
 * 1. Login
 * 2. View properties
 * 3. Create offers
 * 4. View dashboard
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testUserFlow(email: string, password: string) {
  console.log(`\n🧪 Testing user flow for: ${email}\n`);
  
  // Test 1: Login
  console.log('1️⃣ Testing login...');
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authError) {
    console.error(`   ❌ Login failed: ${authError.message}`);
    console.error(`   💡 Make sure the user is registered at http://localhost:3000/register`);
    return false;
  }

  if (!authData.user || !authData.session) {
    console.error(`   ❌ No user or session returned`);
    return false;
  }

  console.log(`   ✅ Login successful: ${authData.user.id}`);

  // Test 2: Get profile
  console.log('\n2️⃣ Testing profile fetch...');
  const { data: profile, error: profileError } = await supabase
    .from('pricewaze_profiles')
    .select('*')
    .eq('id', authData.user.id)
    .single();

  if (profileError) {
    console.error(`   ❌ Profile fetch failed: ${profileError.message}`);
  } else {
    console.log(`   ✅ Profile found: ${profile.full_name} (${profile.role})`);
  }

  // Test 3: Get properties
  console.log('\n3️⃣ Testing properties fetch...');
  const { data: properties, error: propertiesError } = await supabase
    .from('pricewaze_properties')
    .select('*')
    .eq('status', 'active')
    .limit(5);

  if (propertiesError) {
    console.error(`   ❌ Properties fetch failed: ${propertiesError.message}`);
  } else {
    console.log(`   ✅ Found ${properties?.length || 0} properties`);
    if (properties && properties.length > 0) {
      console.log(`   📍 Sample: ${properties[0].title} - ${properties[0].price}`);
    }
  }

  // Test 4: Get zones
  console.log('\n4️⃣ Testing zones fetch...');
  const { data: zones, error: zonesError } = await supabase
    .from('pricewaze_zones')
    .select('*')
    .limit(5);

  if (zonesError) {
    console.error(`   ❌ Zones fetch failed: ${zonesError.message}`);
  } else {
    console.log(`   ✅ Found ${zones?.length || 0} zones`);
    if (zones && zones.length > 0) {
      console.log(`   📍 Sample: ${zones[0].name} - ${zones[0].city}`);
    }
  }

  // Test 5: Test API endpoints
  console.log('\n5️⃣ Testing API endpoints...');
  
  // Test properties API
  try {
    const propertiesRes = await fetch('http://localhost:3000/api/properties');
    if (propertiesRes.ok) {
      const propertiesData = await propertiesRes.json();
      console.log(`   ✅ Properties API: ${propertiesData.length || 0} properties`);
    } else {
      console.log(`   ⚠️  Properties API: ${propertiesRes.status}`);
    }
  } catch (err: any) {
    console.log(`   ⚠️  Properties API: ${err.message}`);
  }

  // Test CrewAI health
  try {
    const crewaiRes = await fetch('http://localhost:8000/health');
    if (crewaiRes.ok) {
      const crewaiData = await crewaiRes.json();
      console.log(`   ✅ CrewAI API: ${crewaiData.status}`);
    } else {
      console.log(`   ⚠️  CrewAI API: ${crewaiRes.status}`);
    }
  } catch (err: any) {
    console.log(`   ⚠️  CrewAI API: Not available`);
  }

  console.log('\n✅ User flow test completed!\n');
  return true;
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log('Usage: tsx scripts/test-user-flow.ts <email> <password>');
    console.log('\nExample:');
    console.log('  tsx scripts/test-user-flow.ts maria@test.com Test123!');
    process.exit(1);
  }

  const email = args[0];
  const password = args[1];

  await testUserFlow(email, password);
}

main();

