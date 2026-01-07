#!/usr/bin/env tsx
/**
 * Test user creation directly to debug the issue
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function testUserCreation() {
  console.log('🧪 Testing user creation...\n');

  const testEmail = 'test-debug@pricewaze.test';
  const testPassword = 'Test123!';

  // Test 1: Try signUp (normal flow)
  console.log('1️⃣ Testing signUp (normal flow)...');
  try {
    const { data, error } = await supabaseAnon.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          full_name: 'Test Debug User',
        },
      },
    });

    if (error) {
      console.log(`   ❌ Error: ${error.message}`);
      console.log(`   Code: ${error.status}`);
    } else if (data.user) {
      console.log(`   ✅ User created: ${data.user.id}`);
      console.log(`   Email confirmed: ${data.user.email_confirmed_at ? 'Yes' : 'No'}`);
      
      // Wait a bit for trigger
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Check if profile was created
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('pricewaze_profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (profile) {
        console.log(`   ✅ Profile created: ${profile.full_name}`);
      } else {
        console.log(`   ⚠️  Profile not created: ${profileError?.message}`);
      }

      // Clean up
      await supabaseAdmin.auth.admin.deleteUser(data.user.id);
      console.log(`   🗑️  Test user deleted`);
    }
  } catch (err: any) {
    console.log(`   ❌ Exception: ${err.message}`);
  }

  console.log('\n2️⃣ Testing admin.createUser...');
  try {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
      user_metadata: {
        full_name: 'Test Debug User Admin',
      },
    });

    if (error) {
      console.log(`   ❌ Error: ${error.message}`);
      console.log(`   Details: ${JSON.stringify(error, null, 2)}`);
    } else if (data.user) {
      console.log(`   ✅ User created: ${data.user.id}`);
      
      // Wait for trigger
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Check profile
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('pricewaze_profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (profile) {
        console.log(`   ✅ Profile created: ${profile.full_name}`);
      } else {
        console.log(`   ⚠️  Profile not created: ${profileError?.message}`);
      }

      // Clean up
      await supabaseAdmin.auth.admin.deleteUser(data.user.id);
      console.log(`   🗑️  Test user deleted`);
    }
  } catch (err: any) {
    console.log(`   ❌ Exception: ${err.message}`);
    console.log(`   Stack: ${err.stack}`);
  }

  console.log('\n3️⃣ Checking existing users...');
  try {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers();
    if (error) {
      console.log(`   ❌ Error: ${error.message}`);
    } else {
      console.log(`   ✅ Found ${data.users.length} users`);
      if (data.users.length > 0) {
        console.log(`   First user: ${data.users[0].email}`);
      }
    }
  } catch (err: any) {
    console.log(`   ❌ Exception: ${err.message}`);
  }
}

testUserCreation();

