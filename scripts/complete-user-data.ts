#!/usr/bin/env tsx
/**
 * Complete user data after manual registration
 * Run this after a user registers through the UI
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

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function completeUserData(email: string, updates: { fullName?: string; phone?: string; role?: string }) {
  console.log(`Completing data for user: ${email}...`);
  
  // Find user by email
  const { data: profiles, error: findError } = await supabase
    .from('pricewaze_profiles')
    .select('*')
    .eq('email', email)
    .single();

  if (findError || !profiles) {
    console.error(`❌ User not found: ${email}`);
    return false;
  }

  // Update profile
  const { error: updateError } = await supabase
    .from('pricewaze_profiles')
    .update({
      full_name: updates.fullName || profiles.full_name,
      phone: updates.phone || profiles.phone,
      role: updates.role || profiles.role,
      verified: true,
    })
    .eq('id', profiles.id);

  if (updateError) {
    console.error(`❌ Update failed: ${updateError.message}`);
    return false;
  }

  console.log(`✅ Profile updated for ${email}`);
  return true;
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.log('Usage: tsx scripts/complete-user-data.ts <email> [fullName] [phone] [role]');
    console.log('\nExample:');
    console.log('  tsx scripts/complete-user-data.ts maria@test.com "Maria Garcia" "+1-809-555-0101" buyer');
    process.exit(1);
  }

  const email = args[0];
  const fullName = args[1];
  const phone = args[2];
  const role = args[3] as 'buyer' | 'seller' | 'agent' | 'admin' | undefined;

  await completeUserData(email, { fullName, phone, role });
}

main();

