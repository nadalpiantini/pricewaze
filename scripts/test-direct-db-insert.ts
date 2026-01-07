#!/usr/bin/env tsx
/**
 * Test creating user directly in database (bypassing Auth API)
 * This helps isolate if the problem is Auth API or the trigger
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';
import { randomUUID } from 'crypto';

config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function testDirectInsert() {
  console.log('🧪 Testing direct database insert (bypassing Auth API)...\n');

  const testEmail = `test-direct-${Date.now()}@pricewaze.test`;
  const userId = randomUUID();

  console.log(`Test user: ${testEmail}`);
  console.log(`User ID: ${userId}\n`);

  // Try to insert profile directly (without auth.users entry)
  console.log('1️⃣ Testing direct profile insert (without auth.users)...');
  try {
    const { data, error } = await supabase
      .from('pricewaze_profiles')
      .insert({
        id: userId,
        email: testEmail,
        full_name: 'Test Direct User',
        role: 'buyer',
        verified: true,
      })
      .select()
      .single();

    if (error) {
      console.log(`   ❌ Error: ${error.message}`);
      console.log(`   Code: ${error.code}`);
    } else {
      console.log(`   ✅ Profile created directly: ${data.id}`);
      
      // Clean up
      await supabase.from('pricewaze_profiles').delete().eq('id', userId);
      console.log(`   🗑️  Profile deleted`);
    }
  } catch (err: any) {
    console.log(`   ❌ Exception: ${err.message}`);
  }

  // Check if we can at least read existing profiles
  console.log('\n2️⃣ Testing profile read...');
  try {
    const { data, error, count } = await supabase
      .from('pricewaze_profiles')
      .select('*', { count: 'exact' })
      .limit(5);

    if (error) {
      console.log(`   ❌ Error: ${error.message}`);
    } else {
      console.log(`   ✅ Can read profiles: ${count || data?.length || 0} found`);
      if (data && data.length > 0) {
        console.log(`   Sample: ${data[0].email}`);
      }
    }
  } catch (err: any) {
    console.log(`   ❌ Exception: ${err.message}`);
  }

  console.log('\n💡 Conclusion:');
  console.log('   If profile insert works but Auth API fails,');
  console.log('   the problem is in Supabase Auth configuration,');
  console.log('   not in the database or trigger.');
}

testDirectInsert().catch(console.error);

