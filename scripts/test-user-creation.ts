#!/usr/bin/env tsx
/**
 * Test script to debug user creation issues
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function testUserCreation() {
  console.log('Testing user creation...\n');
  
  // Test 1: Create user with admin API
  console.log('Test 1: Creating user with admin.createUser...');
  try {
    const { data, error } = await supabase.auth.admin.createUser({
      email: 'test@example.com',
      password: 'Test123!',
      email_confirm: true,
      user_metadata: {
        full_name: 'Test User',
      },
    });
    
    if (error) {
      console.error('Error:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
    } else {
      console.log('Success! User created:', data.user?.id);
      // Delete test user
      if (data.user) {
        await supabase.auth.admin.deleteUser(data.user.id);
        console.log('Test user deleted');
      }
    }
  } catch (err: any) {
    console.error('Exception:', err);
    console.error('Stack:', err.stack);
  }
  
  // Test 2: List existing users
  console.log('\nTest 2: Listing existing users...');
  try {
    const { data, error } = await supabase.auth.admin.listUsers();
    if (error) {
      console.error('Error listing users:', error);
    } else {
      console.log(`Found ${data.users.length} users`);
      if (data.users.length > 0) {
        console.log('First user:', data.users[0].email);
      }
    }
  } catch (err: any) {
    console.error('Exception:', err);
  }
}

testUserCreation();

