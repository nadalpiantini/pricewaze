#!/usr/bin/env tsx
/**
 * Create a test user using normal signup flow (simulates real user registration)
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

// Use anon key for signup (like frontend does)
const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);
// Use service key for admin operations
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

interface TestUser {
  email: string;
  password: string;
  fullName: string;
  phone: string;
  role: 'buyer' | 'seller' | 'agent' | 'admin';
}

const TEST_USERS: TestUser[] = [
  { email: 'maria@test.com', password: 'Test123!', fullName: 'Maria Garcia', phone: '+1-809-555-0101', role: 'buyer' },
  { email: 'juan@test.com', password: 'Test123!', fullName: 'Juan Perez', phone: '+1-809-555-0102', role: 'buyer' },
  { email: 'carlos@test.com', password: 'Test123!', fullName: 'Carlos Mendez', phone: '+1-809-555-0104', role: 'seller' },
];

async function createUser(user: TestUser) {
  console.log(`Creating user: ${user.email}...`);
  
  try {
    // Step 1: Sign up (like frontend)
    const { data: signUpData, error: signUpError } = await supabaseAnon.auth.signUp({
      email: user.email,
      password: user.password,
      options: {
        data: {
          full_name: user.fullName,
        },
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/callback`,
      },
    });

    if (signUpError) {
      // If user exists, try to sign in and get the user
      if (signUpError.message.includes('already registered') || signUpError.message.includes('already exists')) {
        console.log(`  User ${user.email} already exists, signing in...`);
        const { data: signInData, error: signInError } = await supabaseAnon.auth.signInWithPassword({
          email: user.email,
          password: user.password,
        });
        
        if (signInError) {
          console.error(`  ❌ Failed to sign in: ${signInError.message}`);
          return null;
        }
        
        if (signInData.user) {
          console.log(`  ✅ Using existing user: ${signInData.user.id}`);
          return signInData.user.id;
        }
      } else {
        console.error(`  ❌ Sign up failed: ${signUpError.message}`);
        return null;
      }
    }

    if (!signUpData.user) {
      console.error(`  ❌ No user returned from signup`);
      return null;
    }

    const userId = signUpData.user.id;
    console.log(`  ✅ User created: ${userId}`);

    // Step 2: Update profile with service role (bypass RLS)
    await new Promise(resolve => setTimeout(resolve, 500)); // Wait for trigger
    
    const { error: profileError } = await supabaseAdmin
      .from('pricewaze_profiles')
      .update({
        full_name: user.fullName,
        phone: user.phone,
        role: user.role,
        verified: true, // Auto-verify test users
      })
      .eq('id', userId);

    if (profileError) {
      console.error(`  ⚠️  Profile update failed: ${profileError.message}`);
    } else {
      console.log(`  ✅ Profile updated`);
    }

    return userId;
  } catch (err: unknown) {
    const error = err as Error;
    console.error(`  ❌ Exception: ${error.message}`);
    return null;
  }
}

async function main() {
  console.log('Creating test users using normal signup flow...\n');
  
  const userIds: string[] = [];
  
  for (const user of TEST_USERS) {
    const userId = await createUser(user);
    if (userId) {
      userIds.push(userId);
    }
    console.log('');
  }
  
  console.log(`\n✅ Created ${userIds.length} users`);
  console.log('\nTest credentials:');
  TEST_USERS.forEach(user => {
    console.log(`  ${user.email} / ${user.password}`);
  });
}

main();

