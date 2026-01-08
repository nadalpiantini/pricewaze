/**
 * Process NCE Jobs
 * 
 * This script can be run manually or scheduled via cron
 * Processes pending NCE jobs by calling the calculate endpoint
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

async function processNCEJobs() {
  console.log('🔄 Processing NCE jobs...');
  console.log(`API URL: ${API_URL}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);

  try {
    // Call the calculate endpoint
    const response = await fetch(`${API_URL}/api/negotiation/coherence/calculate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Note: In production, use service role key or internal API key
      },
      body: JSON.stringify({ limit: 10 }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    console.log('✅ Response:', result);
    console.log(`✅ Processed: ${result.processed} jobs`);
    
    if (result.errors > 0) {
      console.log(`⚠️  Errors: ${result.errors}`);
    }

    // Get pending jobs count
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { count } = await supabase
      .from('pricewaze_nce_jobs')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    console.log(`📊 Remaining pending jobs: ${count || 0}`);

    return result;
  } catch (error) {
    console.error('❌ Error processing NCE jobs:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  processNCEJobs()
    .then(() => {
      console.log('✅ Done');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Failed:', error);
      process.exit(1);
    });
}

export { processNCEJobs };

