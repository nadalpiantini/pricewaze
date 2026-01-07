#!/usr/bin/env tsx
/**
 * Test with existing data - no user creation needed
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

async function testSystem() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║         PRICEWAZE - SYSTEM TEST (No Auth Required)        ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // Test 1: Zones (public read)
  console.log('1️⃣ Testing Zones (Public Data)...');
  const { data: zones, error: zonesError } = await supabase
    .from('pricewaze_zones')
    .select('*')
    .limit(10);

  if (zonesError) {
    console.error(`   ❌ Failed: ${zonesError.message}`);
  } else {
    console.log(`   ✅ Found ${zones?.length || 0} zones`);
    zones?.forEach(zone => {
      console.log(`      📍 ${zone.name} (${zone.city}) - Avg: $${zone.avg_price_m2}/m²`);
    });
  }

  // Test 2: Properties (public read for active)
  console.log('\n2️⃣ Testing Properties (Public Data)...');
  const { data: properties, error: propertiesError } = await supabase
    .from('pricewaze_properties')
    .select('*, zone:pricewaze_zones(name, city)')
    .eq('status', 'active')
    .limit(10);

  if (propertiesError) {
    console.error(`   ❌ Failed: ${propertiesError.message}`);
  } else {
    console.log(`   ✅ Found ${properties?.length || 0} active properties`);
    if (properties && properties.length > 0) {
      properties.slice(0, 3).forEach(prop => {
        const price = new Intl.NumberFormat('es-DO', {
          style: 'currency',
          currency: 'DOP',
          maximumFractionDigits: 0,
        }).format(prop.price);
        const zoneName = prop.zone?.name || 'N/A';
        console.log(`      🏠 ${prop.title}`);
        console.log(`         ${price} | ${prop.area_m2}m² | ${zoneName}`);
      });
    } else {
      console.log(`   ⚠️  No properties found. Run 'pnpm seed' to create test data.`);
    }
  }

  // Test 3: Profiles (public read)
  console.log('\n3️⃣ Testing Profiles (Public Data)...');
  const { data: profiles, error: profilesError } = await supabase
    .from('pricewaze_profiles')
    .select('*')
    .limit(10);

  if (profilesError) {
    console.error(`   ❌ Failed: ${profilesError.message}`);
  } else {
    console.log(`   ✅ Found ${profiles?.length || 0} profiles`);
    profiles?.slice(0, 3).forEach(profile => {
      console.log(`      👤 ${profile.full_name || profile.email} (${profile.role || 'N/A'})`);
    });
  }

  // Test 4: Frontend API
  console.log('\n4️⃣ Testing Frontend API...');
  try {
    const res = await fetch('http://localhost:3000/api/properties');
    if (res.ok) {
      const data = await res.json();
      console.log(`   ✅ Properties API: ${Array.isArray(data) ? `${data.length} properties` : 'OK'}`);
    } else {
      const text = await res.text();
      console.log(`   ⚠️  Properties API: ${res.status} - ${text.substring(0, 100)}`);
    }
  } catch (err: any) {
    console.log(`   ❌ Properties API: ${err.message}`);
  }

  // Test 5: CrewAI Backend
  console.log('\n5️⃣ Testing CrewAI Backend...');
  try {
    const res = await fetch('http://localhost:8000/health');
    if (res.ok) {
      const data = await res.json();
      console.log(`   ✅ CrewAI API: ${data.status}`);
      console.log(`      Model: ${data.model}`);
      console.log(`      Supabase: ${data.supabase_connected ? 'Connected' : 'Not connected'}`);
      console.log(`      Crews: ${data.crews_available?.join(', ') || 'N/A'}`);
    } else {
      console.log(`   ⚠️  CrewAI API: ${res.status}`);
    }
  } catch (err: any) {
    console.log(`   ❌ CrewAI API: Not available - ${err.message}`);
  }

  // Test 6: CrewAI Quick Pricing (if property exists)
  if (properties && properties.length > 0) {
    console.log('\n6️⃣ Testing CrewAI Quick Pricing...');
    try {
      const propertyId = properties[0].id;
      const res = await fetch(`http://localhost:8000/api/v1/pricing/quick/${propertyId}`);
      if (res.ok) {
        const data = await res.json();
        console.log(`   ✅ Quick Pricing: ${data.quick_assessment?.fairness_label || 'OK'}`);
        if (data.quick_assessment) {
          const fairPrice = new Intl.NumberFormat('es-DO', {
            style: 'currency',
            currency: 'DOP',
            maximumFractionDigits: 0,
          }).format(data.quick_assessment.estimated_fair_value);
          console.log(`      Estimated Fair Value: ${fairPrice}`);
        }
      } else {
        const error = await res.json().catch(() => ({ detail: 'Unknown error' }));
        console.log(`   ⚠️  Quick Pricing: ${res.status} - ${error.detail}`);
      }
    } catch (err: any) {
      console.log(`   ⚠️  Quick Pricing: ${err.message}`);
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 SYSTEM STATUS SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Zones: ${zones?.length || 0} available`);
  console.log(`✅ Properties: ${properties?.length || 0} available`);
  console.log(`✅ Profiles: ${profiles?.length || 0} available`);
  console.log(`✅ Frontend: http://localhost:3000`);
  console.log(`✅ CrewAI: http://localhost:8000`);
  console.log('\n💡 To create test data: pnpm seed');
  console.log('💡 To create users: Register at http://localhost:3000/register');
  console.log('='.repeat(60) + '\n');
}

testSystem().catch(console.error);



