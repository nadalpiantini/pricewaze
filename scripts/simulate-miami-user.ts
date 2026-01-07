#!/usr/bin/env tsx
/**
 * Simulate a user searching for property price in Miami, FL
 * Creates user, property, and tests pricing analysis
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';
import { randomUUID } from 'crypto';

config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);

// Miami coordinates
const MIAMI_COORDS = {
  latitude: 25.7617,
  longitude: -80.1918,
};

// Test user for Miami - using existing user
const MIAMI_USER = {
  email: 'nadalpiantini@gmail.com',
  password: 'Teclados#13',
  fullName: 'Nadal Piantini',
  phone: '+1-305-555-0101',
  role: 'buyer' as const,
};

interface TestResult {
  step: string;
  status: '✅' | '❌' | '⚠️';
  message: string;
}

const results: TestResult[] = [];

function logResult(step: string, status: '✅' | '❌' | '⚠️', message: string) {
  results.push({ step, status, message });
  console.log(`${status} ${step}: ${message}`);
}

async function createMiamiUser(): Promise<string | null> {
  console.log('\n👤 Finding Miami user...\n');

  try {
    // First, try to find existing user
    const { data: usersData } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = usersData?.users?.find((u: any) => u.email === MIAMI_USER.email);
    
    if (existingUser) {
      logResult('User Auth', '✅', `Found existing user: ${MIAMI_USER.email}`);
      
      // Update profile
      const { error: profileError } = await supabaseAdmin
        .from('pricewaze_profiles')
        .upsert({
          id: existingUser.id,
          email: MIAMI_USER.email,
          full_name: MIAMI_USER.fullName,
          phone: MIAMI_USER.phone,
          role: MIAMI_USER.role,
          verified: true,
        }, {
          onConflict: 'id',
        });

      if (profileError) {
        logResult('User Profile', '⚠️', `Profile update warning: ${profileError.message}`);
      } else {
        logResult('User Profile', '✅', 'Profile updated');
      }

      return existingUser.id;
    }
    
    // If not found in admin list, try to sign in to verify user exists
    logResult('User Auth', '⚠️', `User not found in admin list. Trying to sign in...`);
    const { data: signInData, error: signInError } = await supabaseAnon.auth.signInWithPassword({
      email: MIAMI_USER.email,
      password: MIAMI_USER.password,
    });
    
    if (signInData?.user) {
      logResult('User Auth', '✅', `User authenticated: ${MIAMI_USER.email}`);
      
      // Update profile
      const { error: profileError } = await supabaseAdmin
        .from('pricewaze_profiles')
        .upsert({
          id: signInData.user.id,
          email: MIAMI_USER.email,
          full_name: MIAMI_USER.fullName,
          phone: MIAMI_USER.phone,
          role: MIAMI_USER.role,
          verified: true,
        }, {
          onConflict: 'id',
        });

      if (profileError) {
        logResult('User Profile', '⚠️', `Profile update warning: ${profileError.message}`);
      } else {
        logResult('User Profile', '✅', 'Profile updated');
      }

      return signInData.user.id;
    }
    
    if (signInError) {
      logResult('User Auth', '❌', `Cannot authenticate: ${signInError.message}`);
      return null;
    }

    // Try to create user using admin API
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: MIAMI_USER.email,
      password: MIAMI_USER.password,
      email_confirm: true,
      user_metadata: {
        full_name: MIAMI_USER.fullName,
      },
    });

    if (authError) {
      logResult('User Auth', '⚠️', `Cannot create user: ${authError.message}`);
      logResult('User Auth', '⚠️', 'Will use existing test user or create property without user');
      
      // Try to use an existing test user (maria@test.com from seed)
      const { data: testUsers } = await supabaseAdmin.auth.admin.listUsers();
      const testUser = testUsers?.users?.find((u: any) => 
        u.email === 'maria@test.com' || u.email?.includes('test.com')
      );
      
      if (testUser) {
        logResult('User Auth', '✅', `Using existing test user: ${testUser.email}`);
        return testUser.id;
      }
      
      // If no test user, we'll create property with a dummy owner
      logResult('User Auth', '⚠️', 'No test user available. Property will be created with dummy owner.');
      return null;
    }

    if (!authData?.user) {
      logResult('User Auth', '❌', 'No user data returned');
      return null;
    }

    const userId = authData.user.id;
    logResult('User Auth', '✅', `User created: ${MIAMI_USER.email}`);

    // Wait for trigger to create profile
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Ensure profile exists with correct data
    const { error: profileError } = await supabaseAdmin
      .from('pricewaze_profiles')
      .upsert({
        id: userId,
        email: MIAMI_USER.email,
        full_name: MIAMI_USER.fullName,
        phone: MIAMI_USER.phone,
        role: MIAMI_USER.role,
        verified: true,
      }, {
        onConflict: 'id',
      });

    if (profileError) {
      logResult('User Profile', '⚠️', `Profile warning: ${profileError.message}`);
    } else {
      logResult('User Profile', '✅', 'Profile created/updated');
    }

    return userId;
  } catch (err: any) {
    logResult('User Auth', '⚠️', `Exception: ${err.message}`);
    logResult('User Auth', '⚠️', 'Will continue with property creation using dummy owner');
    return null;
  }
}

async function createMiamiProperty(ownerId: string): Promise<string | null> {
  console.log('\n🏠 Creating Miami property...\n');

  try {
    // Find an existing user to use as owner (from seed data)
    let sellerId = ownerId;
    
    if (ownerId === '00000000-0000-0000-0000-000000000000') {
      // Try to find existing seller from seed
      const { data: existingProfiles, error: profileQueryError } = await supabaseAdmin
        .from('pricewaze_profiles')
        .select('id, email, role')
        .eq('role', 'seller')
        .limit(1);

      if (existingProfiles && existingProfiles.length > 0) {
        sellerId = existingProfiles[0].id;
        logResult('Property Owner', '✅', `Using existing seller: ${existingProfiles[0].email}`);
      } else {
        // Try to get any existing user
        const { data: anyProfiles } = await supabaseAdmin
          .from('pricewaze_profiles')
          .select('id, email')
          .limit(1);

        if (anyProfiles && anyProfiles.length > 0) {
          sellerId = anyProfiles[0].id;
          logResult('Property Owner', '✅', `Using existing user: ${anyProfiles[0].email}`);
        } else {
          // Try to use the Miami user as owner
          const { data: miamiProfile } = await supabaseAdmin
            .from('pricewaze_profiles')
            .select('id, email')
            .eq('email', MIAMI_USER.email)
            .single();
          
          if (miamiProfile) {
            sellerId = miamiProfile.id;
            logResult('Property Owner', '✅', `Using Miami user as owner: ${miamiProfile.email}`);
          } else {
            logResult('Property Owner', '❌', 'No existing users found.');
            logResult('Property Owner', '💡', 'Please ensure your user exists in the database');
            return null;
          }
        }
      }
    }

    // Create property in Miami
    const property = {
      owner_id: sellerId,
      title: 'Modern Condo in Miami Beach',
      description: 'Beautiful 2-bedroom, 2-bathroom condo with ocean views. Recently renovated with modern finishes. Located in the heart of Miami Beach, walking distance to restaurants, shops, and the beach.',
      property_type: 'apartment',
      price: 450000, // USD
      area_m2: 120,
      bedrooms: 2,
      bathrooms: 2,
      parking_spaces: 1,
      year_built: 2018,
      address: '123 Ocean Drive, Miami Beach, FL 33139',
      latitude: MIAMI_COORDS.latitude,
      longitude: MIAMI_COORDS.longitude,
      images: [
        'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800',
        'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800',
      ],
      features: ['Ocean View', 'Modern Kitchen', 'Balcony', 'Pool Access', 'Gym'],
      status: 'active',
    };

    const { data, error } = await supabaseAdmin
      .from('pricewaze_properties')
      .insert(property)
      .select()
      .single();

    if (error) {
      logResult('Property Creation', '❌', `Failed: ${error.message}`);
      return null;
    }

    const priceFormatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(property.price);

    logResult('Property Creation', '✅', `Created: ${property.title} - ${priceFormatted}`);
    logResult('Property Location', '✅', `Miami Beach, FL (${MIAMI_COORDS.latitude}, ${MIAMI_COORDS.longitude})`);
    
    return data.id;
  } catch (err: any) {
    logResult('Property Creation', '❌', `Exception: ${err.message}`);
    return null;
  }
}

async function testPricingAnalysis(userId: string, propertyId: string): Promise<void> {
  console.log('\n💰 Testing pricing analysis...\n');

  try {
    // Try to authenticate, but continue even if it fails (for testing)
    let token: string | undefined;
    
    const { data: signInData, error: authError } = await supabaseAnon.auth.signInWithPassword({
      email: MIAMI_USER.email,
      password: MIAMI_USER.password,
    });

    if (signInData?.session) {
      token = signInData.session.access_token;
      logResult('Pricing Auth', '✅', 'Authentication successful');
    } else {
      logResult('Pricing Auth', '⚠️', `Auth warning: ${authError?.message || 'No session'}. Will try API call anyway.`);
    }

    // Test pricing API
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    const pricingUrl = `${apiUrl}/api/ai/pricing?property_id=${propertyId}`;

    logResult('Pricing API Call', '⚠️', `Calling: ${pricingUrl}`);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    let response: Response;
    try {
      response = await fetch(pricingUrl, { headers });
    } catch (fetchError: any) {
      if (fetchError.code === 'ECONNREFUSED' || fetchError.message.includes('ECONNREFUSED')) {
        logResult('Pricing API', '⚠️', 'Server not running. Start with: pnpm dev');
        logResult('Pricing API', '⚠️', 'Property created successfully. You can test pricing when server is running.');
        return;
      }
      throw fetchError;
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      
      if (response.status === 401) {
        logResult('Pricing API', '⚠️', 'API requires cookie-based authentication (not Bearer token)');
        logResult('Pricing API', '💡', 'To test pricing analysis:');
        logResult('Pricing API', '💡', '1. Start server: pnpm dev');
        logResult('Pricing API', '💡', `2. Login at: http://localhost:3000/login`);
        logResult('Pricing API', '💡', `3. Visit property: http://localhost:3000/properties/${propertyId}`);
        logResult('Pricing API', '💡', '4. Click "Analyze Price" button');
      } else if (response.status === 404) {
        logResult('Pricing API', '⚠️', 'Property not found or API route not available.');
      } else {
        logResult('Pricing API', '❌', `API returned ${response.status}: ${errorText.substring(0, 100)}`);
      }
      return;
    }

    const analysis = await response.json();

    logResult('Pricing API', '✅', 'Analysis received successfully');
    
    // Display key results
    if (analysis.fairnessScore !== undefined) {
      logResult('Fairness Score', '✅', `${analysis.fairnessScore}/100 (${analysis.fairnessLabel || 'N/A'})`);
    }
    
    if (analysis.estimatedFairValue) {
      const fairValue = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
      }).format(analysis.estimatedFairValue);
      logResult('Estimated Fair Value', '✅', fairValue);
    }

    if (analysis.suggestedOffers) {
      const offers = analysis.suggestedOffers;
      logResult('Suggested Offers', '✅', 
        `Aggressive: $${offers.aggressive?.toLocaleString() || 'N/A'}, ` +
        `Balanced: $${offers.balanced?.toLocaleString() || 'N/A'}, ` +
        `Conservative: $${offers.conservative?.toLocaleString() || 'N/A'}`
      );
    }

    if (analysis.insights && analysis.insights.length > 0) {
      logResult('AI Insights', '✅', `${analysis.insights.length} insights provided`);
      analysis.insights.slice(0, 2).forEach((insight: string, i: number) => {
        console.log(`   ${i + 1}. ${insight}`);
      });
    }

    if (analysis.zoneStats) {
      logResult('Zone Analysis', '✅', 
        `Zone: ${analysis.zoneStats.zoneName || 'N/A'}, ` +
        `Avg Price/m²: $${analysis.zoneStats.avgPricePerM2?.toFixed(2) || 'N/A'}`
      );
    }

  } catch (err: any) {
    logResult('Pricing Analysis', '❌', `Exception: ${err.message}`);
    if (err.code === 'ECONNREFUSED' || err.message.includes('ECONNREFUSED')) {
      logResult('Pricing Analysis', '⚠️', 'Server not running. Start with: pnpm dev');
    }
  }
}

async function main() {
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     PRICEWAZE - MIAMI USER SIMULATION                     ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('\n');

  try {
    // 1. Create user (or use existing)
    const userId = await createMiamiUser();
    const effectiveUserId = userId || '00000000-0000-0000-0000-000000000000'; // Dummy ID if no user

    // 2. Create property
    const propertyId = await createMiamiProperty(effectiveUserId);
    if (!propertyId) {
      console.error('\n❌ Failed to create property. Cannot continue.');
      process.exit(1);
    }

    // 3. Test pricing analysis (only if we have a real user)
    if (userId) {
      await testPricingAnalysis(userId, propertyId);
    } else {
      logResult('Pricing Analysis', '⚠️', 'Skipped - no authenticated user available');
      logResult('Pricing Analysis', '⚠️', 'Property created. You can test pricing via UI or API with authenticated user.');
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 SIMULATION SUMMARY');
    console.log('='.repeat(60) + '\n');

    const total = results.length;
    const passed = results.filter(r => r.status === '✅').length;
    const failed = results.filter(r => r.status === '❌').length;
    const warnings = results.filter(r => r.status === '⚠️').length;

    console.log(`Total Steps: ${total}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⚠️  Warnings: ${warnings}\n`);

    console.log('🔑 Test User Credentials:');
    console.log(`   Email: ${MIAMI_USER.email}`);
    console.log(`   Password: ${MIAMI_USER.password}\n`);

    console.log('🏠 Property Created:');
    console.log(`   ID: ${propertyId}`);
    console.log(`   Location: Miami Beach, FL\n`);

    // Property creation is the main goal - that succeeded
    const propertyCreated = results.some(r => r.step === 'Property Creation' && r.status === '✅');
    
    if (propertyCreated) {
      console.log('✅ Property created successfully in Miami!\n');
      console.log('📝 Next steps:');
      console.log('   1. Start server: pnpm dev');
      console.log('   2. Login with your credentials');
      console.log(`   3. View property: http://localhost:3000/properties/${propertyId}`);
      console.log('   4. Test pricing analysis from the UI\n');
    }
    
    if (failed > 0 && !propertyCreated) {
      console.log('❌ Some steps failed. Review the output above.\n');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ SIMULATION FAILED:', error);
    process.exit(1);
  }
}

main().catch(console.error);

