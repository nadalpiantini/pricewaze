#!/usr/bin/env tsx
/**
 * Attempt to apply all migrations automatically
 * Note: DDL statements may need to be applied manually in Supabase Dashboard
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

async function applyMigrations() {
  console.log('🔧 Applying all migrations...\n');

  const migrationFile = resolve(process.cwd(), 'APLICAR_TODAS_LAS_MIGRACIONES.sql');
  const sql = readFileSync(migrationFile, 'utf-8');

  // Split by sections (between -- ====== comments)
  const sections = sql.split(/-- =+[^=]+=+\s*\n/).filter(s => s.trim().length > 0);

  console.log(`Found ${sections.length} migration sections\n`);

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i].trim();
    if (!section || section.startsWith('--')) continue;

    // Extract statements (split by semicolons, but keep function bodies intact)
    const statements: string[] = [];
    let currentStatement = '';
    let inFunction = false;
    let dollarQuote = '';

    for (const line of section.split('\n')) {
      currentStatement += line + '\n';

      // Detect function start/end
      if (line.match(/CREATE\s+(OR\s+REPLACE\s+)?FUNCTION/)) {
        inFunction = true;
        const match = line.match(/\$\$(\w*)\$\$/);
        if (match) dollarQuote = match[0];
      }

      if (inFunction && line.includes(dollarQuote) && line.includes('LANGUAGE')) {
        inFunction = false;
        dollarQuote = '';
      }

      // End of statement (not in function and has semicolon)
      if (!inFunction && line.trim().endsWith(';') && !line.trim().startsWith('--')) {
        statements.push(currentStatement.trim());
        currentStatement = '';
      }
    }

    if (currentStatement.trim()) {
      statements.push(currentStatement.trim());
    }

    console.log(`Section ${i + 1}: ${statements.length} statements`);

    for (let j = 0; j < statements.length; j++) {
      const statement = statements[j];
      if (!statement || statement.startsWith('--') || statement.length < 10) continue;

      try {
        // Try using REST API directly
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseServiceKey,
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify({ sql: statement }),
        });

        if (response.ok) {
          console.log(`  ✅ Statement ${j + 1} applied`);
        } else {
          const errorText = await response.text();
          if (errorText.includes('exec_sql') || errorText.includes('not found')) {
            console.log(`  ⚠️  Statement ${j + 1}: RPC not available - needs manual application`);
            break;
          } else {
            console.log(`  ⚠️  Statement ${j + 1}: ${response.status} - ${errorText.substring(0, 100)}`);
          }
        }
      } catch (err: unknown) {
        const error = err as { message?: string };
        if (error.message?.includes('exec_sql') || error.message?.includes('RPC')) {
          console.log(`  ⚠️  Cannot execute DDL via API - needs manual application`);
          console.log(`\n📋 Please apply manually in Supabase Dashboard:`);
          console.log(`   File: ${migrationFile}\n`);
          process.exit(0);
        }
        console.log(`  ⚠️  Error: ${err.message}`);
      }
    }
  }

  console.log('\n✅ Migration application attempted');
  console.log('💡 If you see warnings, apply the SQL manually in Supabase Dashboard');
}

applyMigrations().catch(console.error);

