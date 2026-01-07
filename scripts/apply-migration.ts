#!/usr/bin/env tsx
/**
 * Apply migration directly using Supabase client
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
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function applyMigration() {
  console.log('🔧 Applying migration to fix profile trigger...\n');

  try {
    // Read the migration file
    const migrationPath = resolve(process.cwd(), 'supabase/migrations/20260106000002_fix_profile_trigger.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    // Split into individual statements (separated by semicolons)
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.match(/^\s*$/));

    console.log(`Found ${statements.length} SQL statements to execute\n`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.length === 0) continue;

      console.log(`Executing statement ${i + 1}/${statements.length}...`);
      
      try {
        // Try using postgrest-js query (won't work for DDL, but let's try)
        // Actually, we need to use the REST API or direct connection
        // Supabase JS client doesn't support DDL directly
        
        // Try using rpc if available
        const { error: rpcError } = await supabase.rpc('exec_sql', { 
          sql: statement + ';' 
        });

        if (rpcError) {
          // RPC not available, try direct query (won't work for DDL)
          console.log('  ⚠️  RPC not available, trying alternative method...');
          
          // For CREATE POLICY and CREATE FUNCTION, we need direct DB access
          // Let's use the REST API with proper headers
          const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': supabaseServiceKey,
              'Authorization': `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({ sql: statement + ';' }),
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.log(`  ⚠️  Direct API call failed: ${response.status}`);
            console.log(`  Error: ${errorText.substring(0, 200)}`);
            throw new Error('Cannot execute DDL statements via API');
          }
        } else {
          console.log(`  ✅ Statement ${i + 1} executed successfully`);
        }
      } catch (err: any) {
        if (err.message?.includes('Cannot execute') || err.message?.includes('DDL')) {
          console.log('\n❌ Cannot execute DDL statements (CREATE POLICY, CREATE FUNCTION) via API');
          console.log('\n📋 Please apply the migration manually:');
          console.log('   1. Go to Supabase Dashboard > SQL Editor');
          console.log('   2. Copy the contents of:', migrationPath);
          console.log('   3. Paste and run in SQL Editor\n');
          console.log('Or use the Supabase CLI:');
          console.log('   supabase db push\n');
          process.exit(1);
        }
        throw err;
      }
    }

    console.log('\n✅ Migration applied successfully!');
    console.log('\n💡 Now you can run:');
    console.log('   pnpm seed');
    console.log('   pnpm simulate:user\n');

  } catch (error: any) {
    console.error('\n❌ Error applying migration:', error.message);
    console.error('\n📋 Please apply the migration manually:');
    console.error('   1. Go to Supabase Dashboard > SQL Editor');
    console.error('   2. Copy the contents of: supabase/migrations/20260106000002_fix_profile_trigger.sql');
    console.error('   3. Paste and run in SQL Editor\n');
    process.exit(1);
  }
}

applyMigration();

