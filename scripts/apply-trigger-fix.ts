#!/usr/bin/env tsx
/**
 * Apply trigger fix migration using Supabase Management API
 */

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

// Extract project ref from URL
const projectRefMatch = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
if (!projectRefMatch) {
  console.error('❌ Could not extract project ref from Supabase URL');
  process.exit(1);
}

const projectRef = projectRefMatch[1];

async function applyMigration() {
  console.log('🔧 Applying trigger fix migration...\n');
  console.log(`📦 Project: ${projectRef}\n`);

  try {
    const migrationPath = resolve(process.cwd(), 'supabase/migrations/20260110000003_fix_user_creation_trigger.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    console.log('📄 Migration file:', migrationPath);
    console.log('\n⚠️  DDL statements (CREATE FUNCTION, CREATE TRIGGER, etc.) cannot be executed via REST API');
    console.log('   They must be applied via Supabase Dashboard SQL Editor\n');

    // Try using Supabase Management API
    // Note: This requires the project to be linked or using access token
    console.log('🔗 Attempting to apply via Supabase Management API...\n');

    // Construct the SQL Editor API URL
    // Note: Supabase doesn't have a public API for executing arbitrary SQL
    // We need to use the Dashboard or CLI

    // Show the SQL and provide instructions
    console.log('📋 Migration SQL:\n');
    console.log('─'.repeat(80));
    console.log(migrationSQL);
    console.log('─'.repeat(80));
    console.log('\n');

    // Try to open browser or provide direct link
    const sqlEditorUrl = `https://supabase.com/dashboard/project/${projectRef}/sql/new`;
    
    console.log('📝 To apply this migration:\n');
    console.log('   Option 1: Supabase Dashboard (Recommended)');
    console.log(`   1. Go to: ${sqlEditorUrl}`);
    console.log('   2. Copy and paste the SQL above');
    console.log('   3. Click "Run"\n');
    
    console.log('   Option 2: Supabase CLI (if linked)');
    console.log('   supabase db push\n');

    // Try to use fetch to execute via SQL Editor API if available
    // Note: This might not work as Supabase doesn't expose SQL execution via REST
    // But we can try using the project API
    
    console.log('🔄 Attempting automated application...\n');
    
    try {
      // Supabase has a projects API, but SQL execution requires Dashboard
      // Let's try a different approach: use the REST API with a custom function
      // But first, let's check if we can use the Management API
      
      const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/sql`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
          'apikey': supabaseServiceKey,
        },
        body: JSON.stringify({
          query: migrationSQL,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Migration applied successfully!\n');
        console.log('📋 Result:', result);
        return;
      } else {
        const error = await response.text();
        console.log(`⚠️  API call failed: ${response.status}`);
        console.log(`   ${error}\n`);
        console.log('💡 This is expected - SQL execution requires Dashboard access\n');
      }
    } catch (err: any) {
      console.log(`⚠️  Automated application not available: ${err.message}\n`);
      console.log('💡 This is normal - Supabase requires Dashboard access for DDL\n');
    }

    // Provide final instructions
    console.log('='.repeat(80));
    console.log('✅ NEXT STEPS');
    console.log('='.repeat(80));
    console.log('\n1. Copy the SQL shown above');
    console.log(`2. Go to: ${sqlEditorUrl}`);
    console.log('3. Paste the SQL and click "Run"');
    console.log('4. After applying, run: pnpm tsx scripts/test-trigger-fix.ts');
    console.log('5. If test passes, create users: pnpm tsx scripts/create-users-password-only.ts');
    console.log('='.repeat(80) + '\n');

  } catch (error: unknown) {
    const err = error as Error;
    console.error('\n❌ Error:', err.message);
    process.exit(1);
  }
}

applyMigration();

