#!/usr/bin/env tsx
/**
 * Try to disable the trigger temporarily to test if it's the problem
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';
import { readFileSync } from 'fs';

config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

console.log('🔧 Attempting to disable trigger temporarily...\n');
console.log('📋 This will help us verify if the trigger is causing the issue\n');

const migrationPath = resolve(process.cwd(), 'supabase/migrations/20260110000004_disable_trigger_temporarily.sql');
const migrationSQL = readFileSync(migrationPath, 'utf-8');

console.log('📄 SQL to apply in Supabase Dashboard:\n');
console.log('─'.repeat(80));
console.log(migrationSQL);
console.log('─'.repeat(80));
console.log('\n');

// Extract project ref
const projectRefMatch = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
const projectRef = projectRefMatch?.[1] || 'unknown';

console.log('📝 To apply:');
console.log(`1. Go to: https://supabase.com/dashboard/project/${projectRef}/sql/new`);
console.log('2. Copy and paste the SQL above');
console.log('3. Click "Run"');
console.log('4. After disabling, test user creation:');
console.log('   pnpm tsx scripts/test-trigger-fix.ts');
console.log('\n💡 If user creation works after disabling, then the trigger is definitely the problem.\n');

