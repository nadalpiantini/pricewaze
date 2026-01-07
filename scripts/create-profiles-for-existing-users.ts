#!/usr/bin/env tsx
/**
 * Create profiles for users that already exist
 * Use this AFTER creating users manually in Supabase Dashboard
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const USER_EMAILS = [
  { email: 'alvaro@nadalpiantini.com', fullName: 'Alvaro' },
  { email: 'alexander@nadalpiantini.com', fullName: 'Alexander' },
];

async function createProfileForUser(email: string, fullName: string) {
  console.log(`\n📧 Processing: ${email}`);

  try {
    // Step 1: Find user by email
    console.log('   🔍 Looking for user...');
    const { data: usersData, error: listError } = await supabase.auth.admin.listUsers();

    if (listError) {
      console.error(`   ❌ Error listing users: ${listError.message}`);
      return { success: false, error: listError.message };
    }

    const user = usersData?.users?.find((u) => u.email === email);

    if (!user) {
      console.log(`   ⚠️  User not found`);
      console.log(`   💡 Create the user first in Supabase Dashboard → Authentication → Users`);
      return { success: false, error: 'User not found' };
    }

    console.log(`   ✅ User found: ${user.id}`);

    // Step 2: Check if profile exists
    console.log('   🔍 Checking profile...');
    const { data: existingProfile, error: profileCheckError } = await supabase
      .from('pricewaze_profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (existingProfile) {
      console.log('   ⚠️  Profile already exists, updating...');
      const { error: updateError } = await supabase
        .from('pricewaze_profiles')
        .update({
          full_name: fullName,
          email: email,
        })
        .eq('id', user.id);

      if (updateError) {
        console.error(`   ❌ Profile update failed: ${updateError.message}`);
        return { success: false, error: updateError.message };
      } else {
        console.log('   ✅ Profile updated');
        return { success: true, userId: user.id, error: null };
      }
    }

    // Step 3: Create profile
    console.log('   📝 Creating profile...');
    const { data: newProfile, error: profileError } = await supabase
      .from('pricewaze_profiles')
      .insert({
        id: user.id,
        email: email,
        full_name: fullName,
      })
      .select()
      .single();

    if (profileError) {
      console.error(`   ❌ Profile creation failed: ${profileError.message}`);
      return { success: false, error: profileError.message };
    }

    console.log('   ✅ Profile created');
    return { success: true, userId: user.id, error: null };
  } catch (err: unknown) {
    const error = err as Error;
    console.error(`   ❌ Exception: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('🚀 Creating profiles for existing users...\n');
  console.log('📝 Make sure users are created first in Supabase Dashboard\n');

  const results = [];

  for (const user of USER_EMAILS) {
    const result = await createProfileForUser(user.email, user.fullName);
    results.push({ ...user, ...result });
  }

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('📋 SUMMARY');
  console.log('='.repeat(80));

  const successful = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);

  for (const result of results) {
    console.log(`\n👤 ${result.email}`);
    if (result.success) {
      console.log(`   ✅ User ID: ${result.userId}`);
      console.log(`   ✅ Profile created/updated`);
      console.log(`   🔑 Password: 1234567 (set when creating user)`);
      console.log(`   📝 Login: Use email + password to login`);
      console.log(`   🔐 Change password: Available in Settings → Security`);
    } else {
      console.log(`   ❌ Failed: ${result.error}`);
      if (result.error === 'User not found') {
        console.log(`   💡 Create the user first:`);
        console.log(`      1. Go to Supabase Dashboard → Authentication → Users`);
        console.log(`      2. Click "Add User" → "Create new user"`);
        console.log(`      3. Email: ${result.email}`);
        console.log(`      4. Password: 1234567`);
        console.log(`      5. Auto Confirm User: ✅`);
        console.log(`      6. Run this script again`);
      }
    }
  }

  if (successful.length > 0) {
    console.log('\n✅ Users ready to use!\n');
  }

  if (failed.length > 0) {
    console.log('\n⚠️  Some users need to be created manually first\n');
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});

