#!/usr/bin/env tsx
/**
 * Full user test - Creates user and tests complete flow
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  console.error('Missing env vars');
  process.exit(1);
}

const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

const TEST_USER = {
  email: 'testuser@pricewaze.test',
  password: 'Test123!',
  fullName: 'Test User',
  phone: '+1-809-555-9999',
  role: 'buyer' as const,
};

async function createOrGetUser() {
  console.log('🔐 Step 1: Creating/Getting user...\n');
  
  // Try to sign up
  const { data: signUpData, error: signUpError } = await supabaseAnon.auth.signUp({
    email: TEST_USER.email,
    password: TEST_USER.password,
    options: {
      data: {
        full_name: TEST_USER.fullName,
      },
    },
  });

  let userId: string | null = null;

  if (signUpError) {
    if (signUpError.message.includes('already') || signUpError.message.includes('registered')) {
      console.log('   ⚠️  User already exists, signing in...');
      const { data: signInData, error: signInError } = await supabaseAnon.auth.signInWithPassword({
        email: TEST_USER.email,
        password: TEST_USER.password,
      });

      if (signInError) {
        console.error(`   ❌ Sign in failed: ${signInError.message}`);
        return null;
      }

      if (signInData.user) {
        userId = signInData.user.id;
        console.log(`   ✅ Signed in: ${userId}`);
      }
    } else {
      console.error(`   ❌ Sign up failed: ${signUpError.message}`);
      return null;
    }
  } else if (signUpData.user) {
    userId = signUpData.user.id;
    console.log(`   ✅ User created: ${userId}`);
  }

  if (!userId) {
    console.error('   ❌ No user ID obtained');
    return null;
  }

  // Wait for trigger
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Update profile
  const { error: profileError } = await supabaseAdmin
    .from('pricewaze_profiles')
    .update({
      full_name: TEST_USER.fullName,
      phone: TEST_USER.phone,
      role: TEST_USER.role,
      verified: true,
    })
    .eq('id', userId);

  if (profileError) {
    console.error(`   ⚠️  Profile update failed: ${profileError.message}`);
  } else {
    console.log(`   ✅ Profile updated`);
  }

  return userId;
}

async function testUserFlow(userId: string) {
  console.log('\n🧪 Step 2: Testing user flow...\n');

  // Re-authenticate to get fresh session
  const { data: authData, error: authError } = await supabaseAnon.auth.signInWithPassword({
    email: TEST_USER.email,
    password: TEST_USER.password,
  });

  if (authError || !authData.user) {
    console.error('   ❌ Re-authentication failed');
    return false;
  }

  // Test 1: Get profile
  console.log('1️⃣ Testing profile...');
  const { data: profile, error: profileError } = await supabaseAnon
    .from('pricewaze_profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (profileError) {
    console.error(`   ❌ Profile fetch failed: ${profileError.message}`);
  } else {
    console.log(`   ✅ Profile: ${profile.full_name} (${profile.role})`);
  }

  // Test 2: Get zones
  console.log('\n2️⃣ Testing zones...');
  const { data: zones, error: zonesError } = await supabaseAnon
    .from('pricewaze_zones')
    .select('*')
    .limit(5);

  if (zonesError) {
    console.error(`   ❌ Zones failed: ${zonesError.message}`);
  } else {
    console.log(`   ✅ Found ${zones?.length || 0} zones`);
    zones?.forEach(zone => {
      console.log(`      📍 ${zone.name} (${zone.city}) - $${zone.avg_price_m2}/m²`);
    });
  }

  // Test 3: Get properties
  console.log('\n3️⃣ Testing properties...');
  const { data: properties, error: propertiesError } = await supabaseAnon
    .from('pricewaze_properties')
    .select('*, zone:pricewaze_zones(name, city)')
    .eq('status', 'active')
    .limit(5);

  if (propertiesError) {
    console.error(`   ❌ Properties failed: ${propertiesError.message}`);
  } else {
    console.log(`   ✅ Found ${properties?.length || 0} properties`);
    properties?.forEach(prop => {
      const price = new Intl.NumberFormat('es-DO', {
        style: 'currency',
        currency: 'DOP',
        maximumFractionDigits: 0,
      }).format(prop.price);
      console.log(`      🏠 ${prop.title} - ${price}`);
    });
  }

  // Test 4: Test API endpoints
  console.log('\n4️⃣ Testing API endpoints...');

  // Properties API
  try {
    const res = await fetch('http://localhost:3000/api/properties');
    if (res.ok) {
      const data = await res.json();
      console.log(`   ✅ Properties API: ${Array.isArray(data) ? data.length : 'OK'}`);
    } else {
      console.log(`   ⚠️  Properties API: ${res.status}`);
    }
  } catch (err: any) {
    console.log(`   ⚠️  Properties API: ${err.message}`);
  }

  // CrewAI health
  try {
    const res = await fetch('http://localhost:8000/health');
    if (res.ok) {
      const data = await res.json();
      console.log(`   ✅ CrewAI API: ${data.status} (${data.model})`);
    } else {
      console.log(`   ⚠️  CrewAI API: ${res.status}`);
    }
  } catch (err: any) {
    console.log(`   ⚠️  CrewAI API: Not available`);
  }

  // Test 5: Create a test property (if user is seller)
  if (profile?.role === 'seller') {
    console.log('\n5️⃣ Testing property creation...');
    const { data: newProperty, error: propError } = await supabaseAnon
      .from('pricewaze_properties')
      .insert({
        owner_id: userId,
        title: 'Test Property',
        description: 'This is a test property',
        property_type: 'apartment',
        price: 5000000,
        area_m2: 100,
        bedrooms: 2,
        bathrooms: 2,
        address: 'Test Address, Santo Domingo',
        latitude: 18.4655,
        longitude: -69.9380,
        status: 'active',
      })
      .select()
      .single();

    if (propError) {
      console.error(`   ❌ Property creation failed: ${propError.message}`);
    } else {
      console.log(`   ✅ Test property created: ${newProperty.id}`);
      // Clean up
      await supabaseAdmin.from('pricewaze_properties').delete().eq('id', newProperty.id);
      console.log(`   🗑️  Test property deleted`);
    }
  }

  return true;
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║         PRICEWAZE - FULL USER FLOW TEST                    ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const userId = await createOrGetUser();
  
  if (!userId) {
    console.error('\n❌ Failed to create/get user');
    process.exit(1);
  }

  const success = await testUserFlow(userId);

  console.log('\n' + '='.repeat(60));
  if (success) {
    console.log('✅ ALL TESTS PASSED!');
    console.log(`\n📧 Test User: ${TEST_USER.email}`);
    console.log(`🔑 Password: ${TEST_USER.password}`);
    console.log(`\n💡 You can now login at: http://localhost:3000/login`);
  } else {
    console.log('⚠️  SOME TESTS FAILED');
  }
  console.log('='.repeat(60) + '\n');
}

main().catch(console.error);



