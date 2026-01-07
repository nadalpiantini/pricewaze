#!/usr/bin/env tsx
/**
 * Apply trigger fix directly using Supabase client
 * Attempts to execute SQL via RPC or direct query
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

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
  db: {
    schema: 'public',
  },
});

async function applyMigration() {
  console.log('🔧 Applying trigger fix migration directly...\n');

  try {
    const migrationPath = resolve(process.cwd(), 'supabase/migrations/20260110000003_fix_user_creation_trigger.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    // Split SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.match(/^\s*$/) && !s.startsWith('COMMENT'));

    console.log(`📋 Found ${statements.length} SQL statements to execute\n`);

    // Try to execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.length === 0) continue;

      console.log(`Executing statement ${i + 1}/${statements.length}...`);
      console.log(`  ${statement.substring(0, 100)}...`);

      try {
        // Try using RPC exec_sql if it exists
        const { data, error } = await supabase.rpc('exec_sql', {
          sql: statement + ';',
        });

        if (error) {
          // Try alternative: use fetch directly to Supabase REST API
          console.log(`  ⚠️  RPC failed, trying direct API...`);
          
          const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
              'apikey': supabaseServiceKey,
              'Authorization': `Bearer ${supabaseServiceKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ sql: statement + ';' }),
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error(`  ❌ Failed: ${errorText.substring(0, 200)}`);
            console.log(`\n💡 DDL statements cannot be executed via API`);
            console.log(`   Please apply manually in Supabase Dashboard\n`);
            return false;
          }

          console.log(`  ✅ Success`);
        } else {
          console.log(`  ✅ Success`);
        }
      } catch (err: any) {
        console.error(`  ❌ Exception: ${err.message}`);
        console.log(`\n💡 DDL statements require Dashboard access`);
        console.log(`   Please apply manually: https://supabase.com/dashboard/project/${supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1]}/sql/new\n`);
        return false;
      }
    }

    console.log('\n✅ Migration applied successfully!\n');
    console.log('🧪 Testing user creation...\n');
    
    // Test if it works
    const testEmail = `test-after-fix-${Date.now()}@test.com`;
    const { data: userData, error: userError } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: 'Test123!',
      email_confirm: true,
    });

    if (userError) {
      console.error(`❌ User creation still failing: ${userError.message}`);
      return false;
    }

    if (userData.user) {
      console.log(`✅ User creation works! Test user: ${userData.user.id}`);
      // Clean up
      await supabase.auth.admin.deleteUser(userData.user.id);
      console.log(`🧹 Test user deleted\n`);
      return true;
    }

    return false;
  } catch (error: unknown) {
    const err = error as Error;
    console.error('\n❌ Error:', err.message);
    console.log('\n💡 Please apply the migration manually in Supabase Dashboard');
    return false;
  }
}

applyMigration().then((success) => {
  if (success) {
    console.log('✅ Migration applied and verified! You can now create users.\n');
    process.exit(0);
  } else {
    console.log('⚠️  Could not apply automatically. Please apply manually.\n');
    process.exit(1);
  }
});

