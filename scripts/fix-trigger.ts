#!/usr/bin/env tsx
/**
 * Fix profile creation trigger in Supabase
 * This script applies the migration to fix the trigger that creates profiles automatically
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

async function fixTrigger() {
  console.log('🔧 Fixing profile creation trigger...\n');

  try {
    // Read the migration file
    const migrationPath = resolve(process.cwd(), 'supabase/migrations/20260106000002_fix_profile_trigger.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    // Split by semicolons and execute each statement
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      if (statement.length === 0) continue;
      
      try {
        const { error } = await supabase.rpc('exec_sql', { sql: statement + ';' });
        if (error) {
          // Try direct query if RPC doesn't work
          const { error: queryError } = await supabase.from('_').select('*').limit(0);
          console.warn('⚠️  RPC not available, you may need to run the migration manually in Supabase SQL Editor');
          console.warn('   Migration file:', migrationPath);
          break;
        }
      } catch (err: any) {
        if (err.message?.includes('exec_sql')) {
          console.warn('⚠️  RPC exec_sql not available');
          console.warn('   Please run the migration manually in Supabase SQL Editor:');
          console.warn('   ', migrationPath);
          break;
        }
        throw err;
      }
    }

    console.log('\n✅ Trigger fix applied (or instructions provided)');
    console.log('\n💡 If you see warnings above, please:');
    console.log('   1. Go to Supabase Dashboard > SQL Editor');
    console.log('   2. Copy the contents of:', migrationPath);
    console.log('   3. Paste and run in SQL Editor');
    console.log('\n   Then run: pnpm simulate:user\n');

  } catch (error: any) {
    console.error('❌ Error fixing trigger:', error.message);
    console.error('\n💡 Please apply the migration manually:');
    console.error('   1. Go to Supabase Dashboard > SQL Editor');
    console.error('   2. Copy contents of: supabase/migrations/20260106000002_fix_profile_trigger.sql');
    console.error('   3. Paste and run in SQL Editor\n');
    process.exit(1);
  }
}

fixTrigger();

