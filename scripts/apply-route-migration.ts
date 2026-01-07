#!/usr/bin/env tsx
/**
 * Apply visit routes migration
 * Run: pnpm tsx scripts/apply-route-migration.ts
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';
import { readFileSync } from 'fs';

config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  console.error('   Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function applyMigration() {
  console.log('🔧 Applying visit routes migration...\n');

  try {
    // Read the migration file
    const migrationPath = resolve(process.cwd(), 'supabase/migrations/20260109000001_create_visit_routes.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    console.log('📄 Migration file:', migrationPath);
    console.log('📋 SQL statements to execute:\n');

    // For DDL statements (CREATE TABLE, CREATE POLICY, etc.), we need to use Supabase CLI
    // or apply manually via Dashboard
    console.log('⚠️  This migration contains DDL statements (CREATE TABLE, CREATE POLICY, etc.)');
    console.log('   These cannot be executed via the REST API.\n');
    console.log('📋 Please apply the migration using one of these methods:\n');
    console.log('   Option 1: Supabase Dashboard (Recommended)');
    console.log('   1. Go to https://supabase.com/dashboard');
    console.log('   2. Select your project');
    console.log('   3. Go to SQL Editor');
    console.log('   4. Copy and paste the contents of:');
    console.log(`      ${migrationPath}`);
    console.log('   5. Click "Run"\n');
    console.log('   Option 2: Supabase CLI');
    console.log('   If you have Supabase CLI installed:');
    console.log('   supabase db push\n');
    console.log('📄 Migration SQL:\n');
    console.log('─'.repeat(80));
    console.log(migrationSQL);
    console.log('─'.repeat(80));
    console.log('\n✅ Migration file is ready to apply!');

  } catch (error: unknown) {
    const err = error as Error;
    console.error('\n❌ Error reading migration file:', err.message);
    process.exit(1);
  }
}

applyMigration();

