/**
 * Verify Pro Access for @nadalpiantini.com users
 * Checks that all users with @nadalpiantini.com email have Pro access
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function verifyProAccess() {
  console.log('🔍 Verifying Pro access for @nadalpiantini.com users...\n');

  try {
    // Get all users with @nadalpiantini.com email using SQL (more reliable)
    const { data: users, error: usersError } = await supabase
      .from('auth.users')
      .select('id, email')
      .like('email', '%@nadalpiantini.com');

    // If that doesn't work, try RPC or direct query
    if (usersError || !users || users.length === 0) {
      // Try using RPC to query auth.users
      const { data: rpcData, error: rpcError } = await supabase.rpc('exec_sql', {
        sql: `
          SELECT id, email 
          FROM auth.users 
          WHERE email LIKE '%@nadalpiantini.com'
        `,
      });

      if (rpcError) {
        // Last resort: query via profiles table
        const { data: profiles, error: profilesError } = await supabase
          .from('pricewaze_profiles')
          .select('id, email')
          .like('email', '%@nadalpiantini.com');

        if (profilesError || !profiles || profiles.length === 0) {
          console.log('⚠️  No users found with @nadalpiantini.com email');
          console.log('   (This might be normal if no users have registered yet)');
          return;
        }

        // Use profiles data
        const nadalpiantiniUsers = profiles.map((p: any) => ({
          id: p.id,
          email: p.email,
        }));

        console.log(`📧 Found ${nadalpiantiniUsers.length} user(s) with @nadalpiantini.com email:\n`);

        for (const user of nadalpiantiniUsers) {
          await checkUserProAccess(user.id, user.email);
        }
        return;
      }
    }

    if (!users || users.length === 0) {
      console.log('⚠️  No users found with @nadalpiantini.com email');
      console.log('   (This might be normal if no users have registered yet)');
      return;
    }

    console.log(`📧 Found ${users.length} user(s) with @nadalpiantini.com email:\n`);

    for (const user of users) {
      await checkUserProAccess(user.id, user.email);
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

async function checkUserProAccess(userId: string, email: string) {
  console.log(`  👤 ${email} (ID: ${userId})`);

  // Check Pro access using RPC
  const { data: hasPro, error: proError } = await supabase.rpc('pricewaze_has_pro_access', {
    user_id_param: userId,
  });

  if (proError) {
    console.error(`    ❌ Error checking Pro access: ${proError.message}`);
    return;
  }

  // Get subscription details
  const { data: subscription, error: subError } = await supabase
    .from('pricewaze_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (subError && subError.code !== 'PGRST116') {
    console.error(`    ❌ Error fetching subscription: ${subError.message}`);
    return;
  }

  if (hasPro) {
    console.log(`    ✅ Pro access: ACTIVE`);
    if (subscription) {
      console.log(`       Plan: ${subscription.plan}`);
      console.log(`       Status: ${subscription.status}`);
      if (subscription.expires_at) {
        console.log(`       Expires: ${new Date(subscription.expires_at).toLocaleString()}`);
      } else {
        console.log(`       Expires: NEVER (lifetime free)`);
      }
    } else {
      console.log(`       (Subscription will be created automatically on next access)`);
    }
  } else {
    console.log(`    ❌ Pro access: INACTIVE`);
    console.log(`    ⚠️  Attempting to grant Pro access...`);

    // Try to grant Pro access
    const { error: grantError } = await supabase.rpc('pricewaze_grant_free_pro_to_nadalpiantini');

    if (grantError) {
      console.error(`    ❌ Error granting Pro access: ${grantError.message}`);
      console.log(`    💡 Try running the SQL migration manually in Supabase Dashboard`);
    } else {
      console.log(`    ✅ Pro access granted!`);
    }
  }
  console.log('');
}

verifyProAccess();

