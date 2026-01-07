#!/usr/bin/env tsx
/**
 * Simulate a complete user by creating profile directly in database
 * This bypasses auth issues and creates a working test user
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';
import { randomUUID } from 'crypto';

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

interface SimulatedUser {
  email: string;
  fullName: string;
  phone: string;
  role: 'buyer' | 'seller' | 'agent' | 'admin';
}

const USERS: SimulatedUser[] = [
  { email: 'maria@test.com', fullName: 'Maria Garcia', phone: '+1-809-555-0101', role: 'buyer' },
  { email: 'juan@test.com', fullName: 'Juan Perez', phone: '+1-809-555-0102', role: 'buyer' },
  { email: 'carlos@test.com', fullName: 'Carlos Mendez', phone: '+1-809-555-0104', role: 'seller' },
  { email: 'laura@test.com', fullName: 'Laura Santos', phone: '+1-809-555-0105', role: 'seller' },
];

async function simulateUser(user: SimulatedUser) {
  console.log(`Simulating user: ${user.email}...`);
  
  try {
    // Generate a UUID for the user
    const userId = randomUUID();
    
    // Insert directly into auth.users using SQL (requires service role)
    // Note: This is a workaround - normally users are created via auth API
    const { error: authError } = await supabase.rpc('exec_sql', {
      sql: `
        INSERT INTO auth.users (
          id, 
          instance_id, 
          email, 
          encrypted_password,
          email_confirmed_at,
          created_at,
          updated_at,
          raw_app_meta_data,
          raw_user_meta_data,
          is_super_admin,
          role
        ) VALUES (
          '${userId}',
          '00000000-0000-0000-0000-000000000000',
          '${user.email}',
          crypt('Test123!', gen_salt('bf')),
          now(),
          now(),
          now(),
          '{"provider":"email","providers":["email"]}',
          '{"full_name":"${user.fullName}"}',
          false,
          'authenticated'
        )
        ON CONFLICT (id) DO NOTHING;
      `
    }).catch(() => ({ error: { message: 'RPC not available' } }));

    // Alternative: Just create the profile directly
    // The profile will work for testing even without auth.users entry
    const { data: profileData, error: profileError } = await supabase
      .from('pricewaze_profiles')
      .upsert({
        id: userId,
        email: user.email,
        full_name: user.fullName,
        phone: user.phone,
        role: user.role,
        verified: true,
      }, {
        onConflict: 'id',
      })
      .select()
      .single();

    if (profileError) {
      console.error(`  ❌ Profile creation failed: ${profileError.message}`);
      return null;
    }

    console.log(`  ✅ Profile created: ${userId}`);
    return userId;
  } catch (err: any) {
    console.error(`  ❌ Exception: ${err.message}`);
    return null;
  }
}

async function main() {
  console.log('Simulating users (creating profiles directly)...\n');
  
  const userIds: string[] = [];
  
  for (const user of USERS) {
    const userId = await simulateUser(user);
    if (userId) {
      userIds.push(userId);
    }
    console.log('');
  }
  
  console.log(`\n✅ Simulated ${userIds.length} users`);
  console.log('\n⚠️  Note: These users can access the database but cannot login via UI');
  console.log('   To login via UI, you need to create users through the registration page');
  console.log('\nUser IDs created:');
  userIds.forEach((id, i) => {
    console.log(`  ${USERS[i].email}: ${id}`);
  });
}

main();

