#!/usr/bin/env tsx
/**
 * Apply visit routes migration using direct PostgreSQL connection
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { readFileSync } from 'fs';
import { execSync } from 'child_process';

config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

// Extract project ref from Supabase URL
const projectRefMatch = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
if (!projectRefMatch) {
  console.error('❌ Could not extract project ref from Supabase URL');
  process.exit(1);
}

const projectRef = projectRefMatch[1];
console.log(`📦 Project: ${projectRef}\n`);

async function applyMigration() {
  console.log('🔧 Applying visit routes migration...\n');

  try {
    const migrationPath = resolve(process.cwd(), 'supabase/migrations/20260109000001_create_visit_routes.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    // Try using Supabase CLI db push
    console.log('📤 Attempting to apply migration via Supabase CLI...\n');
    
    try {
      // First, try to link the project (non-interactive)
      console.log('🔗 Checking project link...');
      
      // Use supabase db push which should work if we have the right setup
      // But first we need the connection string or to link the project
      
      // Alternative: Use psql directly if we can construct the connection string
      // Supabase connection string format: postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
      
      // Since we don't have the DB password in env, let's try using Supabase CLI
      // with the migration file directly
      
      console.log('💡 Attempting to apply migration...');
      console.log('   If this fails, you can apply it manually:\n');
      console.log('   1. Go to Supabase Dashboard > SQL Editor');
      console.log(`   2. Copy contents of: ${migrationPath}`);
      console.log('   3. Paste and run\n');
      
      // Try using supabase migration up
      try {
        execSync(`supabase migration up --db-url "postgresql://postgres.${projectRef}:${supabaseServiceKey.substring(0, 20)}...@aws-0-us-east-1.pooler.supabase.com:6543/postgres"`, {
          cwd: process.cwd(),
          stdio: 'inherit',
          env: { ...process.env }
        });
      } catch (err) {
        // If that fails, try linking first
        console.log('\n⚠️  Direct migration failed. Trying alternative method...\n');
        
        // Show the SQL for manual application
        console.log('📄 Migration SQL (copy this to Supabase Dashboard > SQL Editor):\n');
        console.log('─'.repeat(80));
        console.log(migrationSQL);
        console.log('─'.repeat(80));
        console.log('\n✅ Migration SQL is ready to apply manually in Supabase Dashboard\n');
        console.log('🔗 Quick link: https://supabase.com/dashboard/project/' + projectRef + '/sql/new\n');
      }
      
    } catch (error: unknown) {
      const err = error as Error;
      console.error('❌ Error:', err.message);
      console.log('\n📋 Manual application required:\n');
      console.log('   1. Go to: https://supabase.com/dashboard/project/' + projectRef + '/sql/new');
      console.log(`   2. Copy SQL from: ${migrationPath}`);
      console.log('   3. Paste and run\n');
    }

  } catch (error: unknown) {
    const err = error as Error;
    console.error('\n❌ Error:', err.message);
    process.exit(1);
  }
}

applyMigration();

