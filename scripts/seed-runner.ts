#!/usr/bin/env npx tsx
/**
 * PriceWaze Seed Runner
 *
 * Execute with: npx tsx scripts/seed-runner.ts
 *
 * Make sure to have the following environment variables set:
 * - NEXT_PUBLIC_SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 *
 * You can source them from .env.local:
 *   export $(cat .env.local | grep -v '^#' | xargs) && npx tsx scripts/seed-runner.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

// Validate required environment variables
const requiredEnvVars = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];

const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('\n❌ Missing required environment variables:');
  missingVars.forEach((varName) => {
    console.error(`   - ${varName}`);
  });
  console.error('\nMake sure .env.local contains:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url');
  console.error('   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key');
  console.error('\nYou can find the Service Role Key in your Supabase Dashboard:');
  console.error('   Settings > API > service_role (secret)\n');
  process.exit(1);
}

// Import and run seed
async function main() {
  console.log('🌱 Starting PriceWaze seed process...\n');
  console.log('📍 Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
  console.log('🔑 Service Key:', process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(0, 20) + '...');
  console.log('\n');

  try {
    const { seed } = await import('./seed');
    await seed();
    console.log('\n✅ Seed process completed successfully!\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Seed process failed:', error);
    process.exit(1);
  }
}

main();
