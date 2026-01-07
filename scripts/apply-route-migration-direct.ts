#!/usr/bin/env tsx
/**
 * Apply visit routes migration directly
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

// Use service role key for admin operations
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function applyMigration() {
  console.log('🔧 Applying visit routes migration directly...\n');

  try {
    const migrationPath = resolve(process.cwd(), 'supabase/migrations/20260109000001_create_visit_routes.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    // Split SQL into statements (handle multi-line statements)
    const statements = migrationSQL
      .split(/;\s*(?=\n|$)/)
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.match(/^\s*$/));

    console.log(`📋 Found ${statements.length} SQL statements to execute\n`);

    // Execute each statement using RPC or direct SQL execution
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (!statement || statement.length < 10) continue;

      console.log(`⏳ Executing statement ${i + 1}/${statements.length}...`);

      try {
        // Try using PostgREST RPC (if exec_sql function exists)
        const { data, error } = await supabase.rpc('exec_sql', { 
          sql_query: statement 
        });

        if (error) {
          // If RPC doesn't exist, try direct SQL via REST API
          const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': supabaseServiceKey,
              'Authorization': `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({ sql_query: statement }),
          });

          if (!response.ok) {
            const errorText = await response.text();
            if (errorText.includes('exec_sql') || errorText.includes('not found')) {
              throw new Error('exec_sql RPC not available');
            }
            throw new Error(`HTTP ${response.status}: ${errorText.substring(0, 100)}`);
          }
        }

        console.log(`  ✅ Statement ${i + 1} executed successfully`);
      } catch (err: unknown) {
        const error = err as Error;
        
        if (error.message?.includes('exec_sql') || error.message?.includes('RPC')) {
          console.log('\n⚠️  Cannot execute DDL statements via API');
          console.log('   DDL operations (CREATE TABLE, CREATE POLICY, etc.) require direct database access.\n');
          console.log('📋 Please apply the migration manually:\n');
          console.log('   Option 1: Supabase Dashboard');
          console.log('   1. Go to https://supabase.com/dashboard');
          console.log('   2. Select your project > SQL Editor');
          console.log('   3. Copy and paste the SQL from:');
          console.log(`      ${migrationPath}`);
          console.log('   4. Click "Run"\n');
          console.log('   Option 2: Supabase CLI');
          console.log('   supabase db push\n');
          console.log('📄 SQL to apply:\n');
          console.log('─'.repeat(80));
          console.log(migrationSQL);
          console.log('─'.repeat(80));
          process.exit(0);
        }
        
        console.error(`  ❌ Error: ${error.message}`);
        // Continue with next statement
      }
    }

    console.log('\n✅ Migration application completed!');
    console.log('💡 If you saw errors, apply the SQL manually in Supabase Dashboard\n');

  } catch (error: unknown) {
    const err = error as Error;
    console.error('\n❌ Error:', err.message);
    process.exit(1);
  }
}

applyMigration();

