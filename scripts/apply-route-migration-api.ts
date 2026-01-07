#!/usr/bin/env tsx
/**
 * Apply visit routes migration using Supabase Management API
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { readFileSync } from 'fs';

config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAccessToken = process.env.SUPABASE_ACCESS_TOKEN; // Optional: for Management API

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

// Extract project ref
const projectRefMatch = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
if (!projectRefMatch) {
  console.error('❌ Could not extract project ref');
  process.exit(1);
}

const projectRef = projectRefMatch[1];

async function applyMigration() {
  console.log('🔧 Applying visit routes migration via Supabase API...\n');
  console.log(`📦 Project: ${projectRef}\n`);

  try {
    const migrationPath = resolve(process.cwd(), 'supabase/migrations/20260109000001_create_visit_routes.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    // Try using Supabase Management API to execute SQL
    // This requires a personal access token
    if (supabaseAccessToken) {
      console.log('🔑 Using Supabase Access Token for Management API...\n');
      
      const managementUrl = `https://api.supabase.com/v1/projects/${projectRef}/sql`;
      
      try {
        const response = await fetch(managementUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseAccessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: migrationSQL,
          }),
        });

        if (response.ok) {
          const result = await response.json();
          console.log('✅ Migration applied successfully via Management API!\n');
          console.log('Result:', result);
          return;
        } else {
          const error = await response.text();
          console.log('⚠️  Management API error:', error);
          console.log('   Falling back to manual application...\n');
        }
      } catch (err) {
        console.log('⚠️  Management API not available or token invalid');
        console.log('   Falling back to manual application...\n');
      }
    }

    // Fallback: Show instructions for manual application
    console.log('📋 Manual Application Required\n');
    console.log('DDL operations (CREATE TABLE, CREATE POLICY, etc.) require direct database access.\n');
    console.log('🚀 Quick Steps:\n');
    console.log(`   1. Open: https://supabase.com/dashboard/project/${projectRef}/sql/new`);
    console.log(`   2. Copy the SQL below`);
    console.log(`   3. Paste and click "Run"\n`);
    console.log('─'.repeat(80));
    console.log(migrationSQL);
    console.log('─'.repeat(80));
    console.log('\n💡 Tip: You can also use Supabase CLI:');
    console.log('   supabase link --project-ref ' + projectRef);
    console.log('   supabase db push\n');

  } catch (error: unknown) {
    const err = error as Error;
    console.error('\n❌ Error:', err.message);
    process.exit(1);
  }
}

applyMigration();

