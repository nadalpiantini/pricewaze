#!/usr/bin/env tsx
/**
 * Diagnose Supabase connection and configuration issues
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔍 Diagnosing Supabase Configuration...\n');

// Check environment variables
console.log('1️⃣ Environment Variables:');
console.log(`   NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl ? '✅ Set' : '❌ Missing'}`);
console.log(`   NEXT_PUBLIC_SUPABASE_ANON_KEY: ${supabaseAnonKey ? '✅ Set' : '❌ Missing'}`);
console.log(`   SUPABASE_SERVICE_ROLE_KEY: ${supabaseServiceKey ? '✅ Set' : '❌ Missing'}`);

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  console.error('\n❌ Missing required environment variables');
  process.exit(1);
}

console.log(`\n   Supabase URL: ${supabaseUrl.substring(0, 30)}...`);

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function diagnose() {
  console.log('\n2️⃣ Testing Database Connection:');
  
  // Test 1: Can we query a table?
  try {
    const { data, error } = await supabaseAdmin
      .from('pricewaze_profiles')
      .select('count')
      .limit(1);
    
    if (error) {
      console.log(`   ❌ Cannot query pricewaze_profiles: ${error.message}`);
    } else {
      console.log(`   ✅ Can query pricewaze_profiles`);
    }
  } catch (err: unknown) {
    const error = err as Error;
    console.log(`   ❌ Exception: ${error.message}`);
  }

  // Test 2: Can we query auth schema?
  try {
    const { data, error } = await supabaseAdmin.rpc('exec_sql', {
      sql: 'SELECT COUNT(*) FROM auth.users;'
    });
    
    if (error) {
      console.log(`   ⚠️  Cannot query auth.users via RPC: ${error.message}`);
    } else {
      console.log(`   ✅ Can query auth.users`);
    }
  } catch (err: unknown) {
    console.log(`   ⚠️  RPC not available (this is normal)`);
  }

  // Test 3: Try admin API
  console.log('\n3️⃣ Testing Admin Auth API:');
  try {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1,
    });
    
    if (error) {
      console.log(`   ❌ Admin API error: ${error.message}`);
      console.log(`   Code: ${error.status}`);
      console.log(`   Details: ${JSON.stringify(error, null, 2)}`);
    } else {
      console.log(`   ✅ Admin API works`);
      console.log(`   Found ${data.users.length} users (showing first page)`);
    }
  } catch (err: unknown) {
    const error = err as Error;
    console.log(`   ❌ Exception: ${error.message}`);
    console.log(`   Stack: ${error.stack?.substring(0, 200)}`);
  }

  // Test 4: Check if trigger exists
  console.log('\n4️⃣ Checking Trigger:');
  try {
    const { data, error } = await supabaseAdmin
      .from('pg_trigger')
      .select('tgname, tgenabled')
      .eq('tgname', 'pricewaze_on_auth_user_created')
      .limit(1);
    
    if (error) {
      console.log(`   ⚠️  Cannot query pg_trigger: ${error.message}`);
      console.log(`   (This is normal - pg_trigger is a system table)`);
    } else if (data && data.length > 0) {
      console.log(`   ✅ Trigger exists: ${data[0].tgname}`);
      console.log(`   Enabled: ${data[0].tgenabled}`);
    } else {
      console.log(`   ⚠️  Trigger not found in query (may need direct SQL)`);
    }
  } catch (err: unknown) {
    console.log(`   ⚠️  Cannot check trigger via API (normal)`);
  }

  // Test 5: Check RLS policies
  console.log('\n5️⃣ Checking RLS Policies:');
  try {
    const { data, error } = await supabaseAdmin
      .from('pricewaze_profiles')
      .select('*')
      .limit(0);
    
    if (error) {
      console.log(`   ⚠️  Error checking policies: ${error.message}`);
    } else {
      console.log(`   ✅ Can access pricewaze_profiles table`);
    }
  } catch (err: unknown) {
    const error = err as Error;
    console.log(`   ❌ Exception: ${error.message}`);
  }

  console.log('\n📋 Recommendations:');
  console.log('   1. Verify Supabase project is active and accessible');
  console.log('   2. Check Supabase Dashboard > Settings > API');
  console.log('   3. Verify service role key is correct');
  console.log('   4. Check if project has any restrictions or quotas');
  console.log('   5. Verify Auth settings in Supabase Dashboard');
}

diagnose().catch(console.error);

