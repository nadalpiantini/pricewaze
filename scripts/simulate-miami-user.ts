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

// Test user for Miami
const MIAMI_USER = {
  email: 'miami.buyer@test.com',
  password: 'Miami2024!',
  fullName: 'John Miami',
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
  console.log('\n👤 Creating Miami test user...\n');

  try {
    // Try to create user using admin API (requires service role)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: MIAMI_USER.email,
      password: MIAMI_USER.password,
      email_confirm: true,
      user_metadata: {
        full_name: MIAMI_USER.fullName,
      },
    });

    let userId: string | null = null;

    if (authError) {
      // If user already exists, try to get existing user
      if (authError.message.includes('already') || authError.message.includes('exists')) {
        logResult('User Auth', '⚠️', `User already exists: ${authError.message}`);
        
        // Try to list and find existing user
        const { data: usersData } = await supabaseAdmin.auth.admin.listUsers();
        const existingUser = usersData?.users?.find((u: any) => u.email === MIAMI_USER.email);
        
        if (existingUser) {
          userId = existingUser.id;
          logResult('User Auth', '✅', `Found existing user: ${MIAMI_USER.email}`);
        } else {
          // Try to sign in
          const { data: signInData } = await supabaseAnon.auth.signInWithPassword({
            email: MIAMI_USER.email,
            password: MIAMI_USER.password,
          });
          
          if (signInData?.user) {
            userId = signInData.user.id;
            logResult('User Auth', '✅', `Signed in to existing user: ${MIAMI_USER.email}`);
          } else {
            logResult('User Auth', '❌', 'User exists but cannot authenticate');
            return null;
          }
        }
      } else {
        logResult('User Auth', '❌', `Failed to create user: ${authError.message}`);
        return null;
      }
    } else if (authData?.user) {
      userId = authData.user.id;
      logResult('User Auth', '✅', `User created: ${MIAMI_USER.email}`);
    } else {
      logResult('User Auth', '❌', 'No user data returned');
      return null;
    }

    if (!userId) {
      logResult('User Auth', '❌', 'No user ID obtained');
      return null;
    }

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
      logResult('User Profile', '❌', `Profile creation failed: ${profileError.message}`);
      return null;
    }

    logResult('User Profile', '✅', 'Profile created/updated');
    logResult('User Auth', '✅', `User ready: ${MIAMI_USER.email} (ID: ${userId})`);
    return userId;
  } catch (err: any) {
    logResult('User Auth', '❌', `Exception: ${err.message}`);
    return null;
  }
}

async function createMiamiProperty(ownerId: string): Promise<string | null> {
  console.log('\n🏠 Creating Miami property...\n');

  try {
    // Create a seller/owner for the property
    const sellerId = randomUUID();
    const { error: sellerError } = await supabaseAdmin
      .from('pricewaze_profiles')
      .upsert({
        id: sellerId,
        email: 'miami.seller@test.com',
        full_name: 'Miami Property Owner',
        role: 'seller',
        verified: true,
      }, {
        onConflict: 'id',
      });

    if (sellerError) {
      logResult('Property Owner', '⚠️', `Owner creation warning: ${sellerError.message}`);
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
      logResult('Pricing API', '❌', `API returned ${response.status}: ${errorText.substring(0, 100)}`);
      
      if (response.status === 401) {
        logResult('Pricing API', '⚠️', 'Authentication required. User may need to be created via UI first.');
      } else if (response.status === 404) {
        logResult('Pricing API', '⚠️', 'Property not found or API route not available.');
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
    // 1. Create user
    const userId = await createMiamiUser();
    if (!userId) {
      console.error('\n❌ Failed to create user. Cannot continue.');
      process.exit(1);
    }

    // 2. Create property
    const propertyId = await createMiamiProperty(userId);
    if (!propertyId) {
      console.error('\n❌ Failed to create property. Cannot continue.');
      process.exit(1);
    }

    // 3. Test pricing analysis
    await testPricingAnalysis(userId, propertyId);

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

    if (failed > 0) {
      console.log('❌ Some steps failed. Review the output above.\n');
      process.exit(1);
    } else {
      console.log('✅ Simulation completed successfully!\n');
    }

  } catch (error) {
    console.error('\n❌ SIMULATION FAILED:', error);
    process.exit(1);
  }
}

main().catch(console.error);

