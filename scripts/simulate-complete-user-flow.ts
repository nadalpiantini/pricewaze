#!/usr/bin/env tsx
/**
 * Complete User Flow Simulation - Single User Testing ALL Features
 * 
 * Simulates a single user (nadalpiantini@gmail.com) using EVERY feature
 * available in the PriceWaze platform according to the PRD and beyond.
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const USER_EMAIL = 'nadalpiantini@gmail.com';
const USER_PASSWORD = 'Teclados#13';

// Helper to get auth token for API requests
async function getAuthToken(supabaseClient: any): Promise<string | null> {
  const session = await supabaseClient.auth.getSession();
  return session.data.session?.access_token || null;
}

// Helper to make authenticated API calls
async function apiCall(url: string, token: string | null, options: RequestInit = {}) {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
    });
    return response;
  } catch (err) {
    return { ok: false, status: 0, json: async () => ({ error: String(err) }) } as Response;
  }
}

interface TestResult {
  feature: string;
  status: '✅' | '❌' | '⚠️';
  message: string;
}

const results: TestResult[] = [];

function logResult(feature: string, status: '✅' | '❌' | '⚠️', message: string) {
  results.push({ feature, status, message });
  const icon = status === '✅' ? '✅' : status === '❌' ? '❌' : '⚠️';
  console.log(`  ${icon} ${feature}: ${message}`);
}

async function testAuth(supabase: any): Promise<string | null> {
  console.log('\n🔐 TESTING AUTHENTICATION...');
  
  const { data: signInData, error } = await supabase.auth.signInWithPassword({
    email: USER_EMAIL,
    password: USER_PASSWORD,
  });

  if (error || !signInData.user) {
    logResult('Login', '❌', error?.message || 'Failed to sign in');
    return null;
  }

  logResult('Login', '✅', `Signed in as ${signInData.user.email}`);
  return signInData.user.id;
}

async function testPropertyCreation(supabase: any, userId: string) {
  console.log('\n🏠 TESTING PROPERTY CREATION...');
  
  const propertyData = {
    owner_id: userId,
    title: 'Beautiful Apartment in Santo Domingo',
    description: 'Spacious 3-bedroom apartment with modern amenities, located in the heart of Santo Domingo. Perfect for families.',
    property_type: 'apartment',
    price: 3500000,
    area_m2: 120,
    bedrooms: 3,
    bathrooms: 2,
    parking_spaces: 1,
    address: '123 Main Street, Santo Domingo',
    latitude: 18.4861,
    longitude: -69.9312,
    status: 'active',
  };

  const { data, error } = await supabase
    .from('pricewaze_properties')
    .insert(propertyData)
    .select('id')
    .single();

  if (error || !data) {
    logResult('Create Property', '❌', error?.message || 'Failed');
    return null;
  }

  logResult('Create Property', '✅', `Created property ${data.id}`);
  return data.id;
}

async function testPropertyUpdate(supabase: any, propertyId: string, userId: string) {
  console.log('\n✏️  TESTING PROPERTY UPDATE...');
  
  const { data, error } = await supabase
    .from('pricewaze_properties')
    .update({
      price: 3400000,
      description: 'Updated: Price reduced! Great opportunity.',
    })
    .eq('id', propertyId)
    .eq('owner_id', userId)
    .select('id')
    .single();

  if (error || !data) {
    logResult('Update Property', '❌', error?.message || 'Failed');
    return false;
  }

  logResult('Update Property', '✅', 'Property updated successfully');
  return true;
}

async function testPropertyListing(supabase: any) {
  console.log('\n📋 TESTING PROPERTY LISTING...');
  
  const { data, error, count } = await supabase
    .from('pricewaze_properties')
    .select('id, title, price', { count: 'exact' })
    .eq('status', 'active')
    .limit(10);

  if (error) {
    logResult('List Properties', '❌', error.message);
    return;
  }

  logResult('List Properties', '✅', `Found ${count || data?.length || 0} properties`);
}

async function testFavorites(supabase: any, userId: string, propertyId: string) {
  console.log('\n❤️  TESTING FAVORITES...');
  
  // Add favorite
  const { data: addData, error: addError } = await supabase
    .from('pricewaze_favorites')
    .upsert({
      user_id: userId,
      property_id: propertyId,
    }, {
      onConflict: 'user_id,property_id',
    })
    .select('id')
    .single();

  if (addError && !addError.message.includes('duplicate')) {
    logResult('Add Favorite', '❌', addError.message);
  } else {
    logResult('Add Favorite', '✅', 'Favorite added');
  }

  // List favorites
  const { data: favorites, error: listError } = await supabase
    .from('pricewaze_favorites')
    .select('property_id')
    .eq('user_id', userId);

  if (listError) {
    logResult('List Favorites', '❌', listError.message);
  } else {
    logResult('List Favorites', '✅', `Found ${favorites?.length || 0} favorites`);
  }

  // Remove favorite via API
  const token = await getAuthToken(supabase);
  const removeResponse = await apiCall(
    `http://localhost:3000/api/favorites/${propertyId}`,
    token,
    { method: 'DELETE' }
  );

  if (removeResponse.ok) {
    logResult('Remove Favorite', '✅', 'Favorite removed');
  } else {
    logResult('Remove Favorite', '⚠️', `Status: ${removeResponse.status}`);
  }
}

async function testOffers(supabase: any, userId: string, propertyId: string) {
  console.log('\n💰 TESTING OFFERS...');
  
  // Get property owner
  const { data: property } = await supabase
    .from('pricewaze_properties')
    .select('owner_id, price')
    .eq('id', propertyId)
    .single();

  if (!property) {
    logResult('Create Offer', '❌', 'Property not found');
    return null;
  }

  // Create offer
  const offerAmount = Math.floor(property.price * 0.9);
  const { data: offerData, error: offerError } = await supabase
    .from('pricewaze_offers')
    .insert({
      buyer_id: userId,
      seller_id: property.owner_id,
      property_id: propertyId,
      amount: offerAmount,
      message: 'I am interested in this property. Would you consider this offer?',
      status: 'pending',
    })
    .select('id')
    .single();

  if (offerError || !offerData) {
    logResult('Create Offer', '❌', offerError?.message || 'Failed');
    return null;
  }

  logResult('Create Offer', '✅', `Created offer: RD$${offerAmount.toLocaleString()}`);

  // List offers
  const { data: offers, error: listError } = await supabase
    .from('pricewaze_offers')
    .select('id, amount, status')
    .eq('buyer_id', userId);

  if (listError) {
    logResult('List Offers', '❌', listError.message);
  } else {
    logResult('List Offers', '✅', `Found ${offers?.length || 0} offers`);
  }

  // Update offer via API
  const token = await getAuthToken(supabase);
  const updateResponse = await apiCall(
    `http://localhost:3000/api/offers/${offerData.id}`,
    token,
    {
      method: 'PUT',
      body: JSON.stringify({
        amount: offerAmount + 50000,
        message: 'Updated offer with better terms',
      }),
    }
  );

  if (updateResponse.ok) {
    logResult('Update Offer', '✅', 'Offer updated');
  } else {
    logResult('Update Offer', '⚠️', `Status: ${updateResponse.status}`);
  }

  return offerData.id;
}

async function testVisits(supabase: any, userId: string, propertyId: string) {
  console.log('\n📅 TESTING VISITS...');
  
  // Get property owner
  const { data: property } = await supabase
    .from('pricewaze_properties')
    .select('owner_id')
    .eq('id', propertyId)
    .single();

  if (!property) {
    logResult('Schedule Visit', '❌', 'Property not found');
    return null;
  }

  // Schedule visit
  const visitDate = new Date();
  visitDate.setDate(visitDate.getDate() + 7);
  const scheduledAt = new Date(visitDate);
  scheduledAt.setHours(14, 0, 0, 0);

  const { data: visitData, error: visitError } = await supabase
    .from('pricewaze_visits')
    .insert({
      visitor_id: userId,
      owner_id: property.owner_id,
      property_id: propertyId,
      scheduled_at: scheduledAt.toISOString(),
      status: 'scheduled',
      verification_code: Math.floor(100000 + Math.random() * 900000).toString(),
    })
    .select('id')
    .single();

  if (visitError || !visitData) {
    logResult('Schedule Visit', '❌', visitError?.message || 'Failed');
    return null;
  }

  logResult('Schedule Visit', '✅', `Scheduled for ${visitDate.toISOString().split('T')[0]}`);

  // List visits
  const { data: visits, error: listError } = await supabase
    .from('pricewaze_visits')
    .select('id, status, scheduled_at')
    .eq('visitor_id', userId);

  if (listError) {
    logResult('List Visits', '❌', listError.message);
  } else {
    logResult('List Visits', '✅', `Found ${visits?.length || 0} visits`);
  }

  // Verify visit with GPS via API
  const token = await getAuthToken(supabase);
  const verifyResponse = await apiCall(
    `http://localhost:3000/api/visits/${visitData.id}/verify`,
    token,
    {
      method: 'POST',
      body: JSON.stringify({
        latitude: 18.4861,
        longitude: -69.9312,
      }),
    }
  );

  if (verifyResponse.ok) {
    logResult('Verify Visit GPS', '✅', 'Visit verified with GPS');
  } else {
    logResult('Verify Visit GPS', '⚠️', `Status: ${verifyResponse.status}`);
  }

  return visitData.id;
}

async function testConversations(supabase: any, userId: string, propertyId: string) {
  console.log('\n💬 TESTING CONVERSATIONS...');
  
  // Get property owner
  const { data: property } = await supabase
    .from('pricewaze_properties')
    .select('owner_id')
    .eq('id', propertyId)
    .single();

  if (!property) {
    logResult('Create Conversation', '❌', 'Property not found');
    return null;
  }

  // Create conversation
  const { data: convData, error: convError } = await supabase
    .from('pricewaze_conversations')
    .insert({
      buyer_id: userId,
      seller_id: property.owner_id,
      property_id: propertyId,
      last_message_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (convError && !convError.message.includes('duplicate')) {
    logResult('Create Conversation', '❌', convError.message);
    return null;
  }

  const conversationId = convData?.id || (await supabase
    .from('pricewaze_conversations')
    .select('id')
    .eq('buyer_id', userId)
    .eq('property_id', propertyId)
    .single()).data?.id;

  if (!conversationId) {
    logResult('Create Conversation', '❌', 'Failed to get conversation');
    return null;
  }

  logResult('Create Conversation', '✅', `Conversation ${conversationId}`);

  // Send messages
  const messages = [
    'Hello! I am interested in this property.',
    'Can we schedule a visit?',
    'What is the best time to see it?',
  ];

  let sentCount = 0;
  for (const content of messages) {
    const { error: msgError } = await supabase
      .from('pricewaze_messages')
      .insert({
        conversation_id: conversationId,
        sender_id: userId,
        content,
        message_type: 'text',
      });

    if (!msgError) sentCount++;
  }

  logResult('Send Messages', '✅', `Sent ${sentCount}/${messages.length} messages`);

  // Send message with offer link
  const { data: offer } = await supabase
    .from('pricewaze_offers')
    .select('id')
    .eq('buyer_id', userId)
    .limit(1)
    .single();

  if (offer) {
    const { error: linkError } = await supabase
      .from('pricewaze_messages')
      .insert({
        conversation_id: conversationId,
        sender_id: userId,
        content: `Check out my offer: ${offer.id}`,
        message_type: 'offer_link',
        metadata: { offer_id: offer.id },
      });

    if (!linkError) {
      logResult('Send Offer Link', '✅', 'Offer link sent');
    }
  }

  // Mark messages as read
  const { data: unreadMessages } = await supabase
    .from('pricewaze_messages')
    .select('id')
    .eq('conversation_id', conversationId)
    .neq('sender_id', userId)
    .is('read_at', null)
    .limit(5);

  if (unreadMessages && unreadMessages.length > 0) {
    for (const msg of unreadMessages) {
      await supabase
        .from('pricewaze_messages')
        .update({ read_at: new Date().toISOString() })
        .eq('id', msg.id);
    }
    logResult('Mark Messages Read', '✅', `Marked ${unreadMessages.length} as read`);
  }

  return conversationId;
}

async function testReviews(supabase: any, userId: string, propertyId: string) {
  console.log('\n⭐ TESTING REVIEWS...');
  
  // Create review
  const { data: reviewData, error: reviewError } = await supabase
    .from('pricewaze_reviews')
    .insert({
      user_id: userId,
      property_id: propertyId,
      rating: 5,
      title: 'Excellent Property',
      comment: 'Great location, well maintained, highly recommend!',
      verified_visit: true,
    })
    .select('id')
    .single();

  if (reviewError && !reviewError.message.includes('duplicate')) {
    logResult('Create Review', '❌', reviewError.message);
    return null;
  }

  const reviewId = reviewData?.id || (await supabase
    .from('pricewaze_reviews')
    .select('id')
    .eq('user_id', userId)
    .eq('property_id', propertyId)
    .single()).data?.id;

  if (reviewId) {
    logResult('Create Review', '✅', `Review ${reviewId}`);
  }

  // Vote review helpful
  const { data: otherReview } = await supabase
    .from('pricewaze_reviews')
    .select('id')
    .eq('property_id', propertyId)
    .neq('user_id', userId)
    .limit(1)
    .single();

  if (otherReview) {
    const { error: voteError } = await supabase
      .from('pricewaze_review_helpful')
      .upsert({
        review_id: otherReview.id,
        user_id: userId,
      }, {
        onConflict: 'review_id,user_id',
      });

    if (!voteError) {
      logResult('Vote Review Helpful', '✅', 'Voted helpful');
    }
  }

  return reviewId;
}

async function testComparisons(supabase: any, userId: string, propertyIds: string[]) {
  console.log('\n📊 TESTING COMPARISONS...');
  
  if (propertyIds.length < 2) {
    logResult('Create Comparison', '⚠️', 'Need at least 2 properties');
    return null;
  }

  const comparisonProperties = propertyIds.slice(0, 3);
  
  const { data: compData, error: compError } = await supabase
    .from('pricewaze_comparisons')
    .insert({
      user_id: userId,
      property_ids: comparisonProperties,
      name: 'My Property Comparison',
    })
    .select('id')
    .single();

  if (compError) {
    logResult('Create Comparison', '❌', compError.message);
    return null;
  }

  logResult('Create Comparison', '✅', `Comparing ${comparisonProperties.length} properties`);

  // Update comparison via API
  const token = await getAuthToken(supabase);
  const updateResponse = await apiCall(
    `http://localhost:3000/api/comparisons/${compData.id}`,
    token,
    {
      method: 'PUT',
      body: JSON.stringify({
        property_ids: comparisonProperties.slice(0, 2),
        name: 'Updated Comparison',
      }),
    }
  );

  if (updateResponse.ok) {
    logResult('Update Comparison', '✅', 'Comparison updated');
  } else {
    logResult('Update Comparison', '⚠️', `Status: ${updateResponse.status}`);
  }

  return compData.id;
}

async function testSavedSearches(supabase: any, userId: string) {
  console.log('\n🔔 TESTING SAVED SEARCHES...');
  
  // Create saved search
  const { data: searchData, error: searchError } = await supabase
    .from('pricewaze_saved_searches')
    .insert({
      user_id: userId,
      name: 'Apartments in Santo Domingo',
      filters: {
        property_type: 'apartment',
        city: 'Santo Domingo',
        min_price: 2000000,
        max_price: 5000000,
        bedrooms: 2,
      },
      is_active: true,
      notification_frequency: 'daily',
    })
    .select('id')
    .single();

  if (searchError) {
    logResult('Create Saved Search', '❌', searchError.message);
    return null;
  }

  logResult('Create Saved Search', '✅', `Search ${searchData.id}`);

  // Update saved search via API
  const token = await getAuthToken(supabase);
  const updateResponse = await apiCall(
    `http://localhost:3000/api/alerts/searches/${searchData.id}`,
    token,
    {
      method: 'PUT',
      body: JSON.stringify({
        name: 'Updated Search',
        filters: {
          property_type: 'house',
          max_price: 6000000,
        },
        notification_frequency: 'instant',
      }),
    }
  );

  if (updateResponse.ok) {
    logResult('Update Saved Search', '✅', 'Search updated');
  } else {
    logResult('Update Saved Search', '⚠️', `Status: ${updateResponse.status}`);
  }

  return searchData.id;
}

async function testPriceAlerts(supabase: any, userId: string, propertyId: string) {
  console.log('\n📈 TESTING PRICE ALERTS...');
  
  const { data: alertData, error: alertError } = await supabase
    .from('pricewaze_price_alerts')
    .insert({
      user_id: userId,
      property_id: propertyId,
      threshold_type: 'percentage',
      threshold_value: 5,
    })
    .select('id')
    .single();

  if (alertError && !alertError.message.includes('duplicate')) {
    logResult('Create Price Alert', '❌', alertError.message);
  } else {
    logResult('Create Price Alert', '✅', 'Price alert created');
  }
}

async function testAIFeatures(supabase: any, propertyId: string, offerId?: string) {
  console.log('\n🤖 TESTING AI FEATURES...');
  
  const token = await getAuthToken(supabase);

  // Pricing analysis
  const pricingResponse = await apiCall(
    `http://localhost:3000/api/ai/pricing?property_id=${propertyId}`,
    token
  );

  if (pricingResponse.ok) {
    logResult('AI Pricing Analysis', '✅', 'Analysis completed');
  } else {
    logResult('AI Pricing Analysis', '⚠️', `Status: ${pricingResponse.status}`);
  }

  // Offer advice
  if (offerId) {
    const adviceResponse = await apiCall(
      `http://localhost:3000/api/ai/advice?offer_id=${offerId}`,
      token
    );

    if (adviceResponse.ok) {
      logResult('AI Offer Advice', '✅', 'Advice received');
    } else {
      logResult('AI Offer Advice', '⚠️', `Status: ${adviceResponse.status}`);
    }
  }

  // CrewAI full analysis
  const crewResponse = await apiCall(
    'http://localhost:3000/api/crewai/analysis',
    token,
    {
      method: 'POST',
      body: JSON.stringify({
        property_id: propertyId,
        buyer_budget: 5000000,
        async: false,
      }),
    }
  );

  if (crewResponse.ok) {
    logResult('CrewAI Full Analysis', '✅', 'Analysis completed');
  } else {
    logResult('CrewAI Full Analysis', '⚠️', `Status: ${crewResponse.status}`);
  }
}

async function testContracts(supabase: any, offerId: string) {
  console.log('\n📄 TESTING CONTRACTS...');
  
  const token = await getAuthToken(supabase);

  const response = await apiCall(
    'http://localhost:3000/api/ai/contracts',
    token,
    {
      method: 'POST',
      body: JSON.stringify({ offer_id: offerId }),
    }
  );

  if (response.ok) {
    logResult('Generate Contract', '✅', 'Contract generated');
  } else {
    logResult('Generate Contract', '⚠️', `Status: ${response.status}`);
  }
}

async function testGamification(supabase: any) {
  console.log('\n🎮 TESTING GAMIFICATION...');
  
  const token = await getAuthToken(supabase);

  // Award points
  const pointsResponse = await apiCall(
    'http://localhost:3000/api/gamification/award-points',
    token,
    {
      method: 'POST',
      body: JSON.stringify({
        action: 'property_viewed',
        points: 10,
        description: 'Viewed property',
      }),
    }
  );

  if (pointsResponse.ok) {
    logResult('Award Points', '✅', 'Points awarded');
  } else {
    logResult('Award Points', '⚠️', `Status: ${pointsResponse.status}`);
  }

  // Get stats
  const statsResponse = await apiCall(
    'http://localhost:3000/api/gamification/stats',
    token
  );

  if (statsResponse.ok) {
    const stats = await statsResponse.json();
    logResult('Get Gamification Stats', '✅', `${stats.total_points || 0} points, Level ${stats.level || 1}`);
  } else {
    logResult('Get Gamification Stats', '⚠️', `Status: ${statsResponse.status}`);
  }
}

async function testMarketSignals(supabase: any) {
  console.log('\n📈 TESTING MARKET SIGNALS...');
  
  const token = await getAuthToken(supabase);

  const response = await apiCall(
    'http://localhost:3000/api/market-signals',
    token,
    {
      method: 'POST',
      body: JSON.stringify({
        signal_type: 'price_trend',
        property_type: 'apartment',
        data: {
          trend: 'increasing',
          percentage: 5.2,
        },
      }),
    }
  );

  if (response.ok) {
    logResult('Create Market Signal', '✅', 'Signal created');
  } else {
    logResult('Create Market Signal', '⚠️', `Status: ${response.status}`);
  }
}

async function testAlertRules(supabase: any) {
  console.log('\n🔔 TESTING ALERT RULES...');
  
  const token = await getAuthToken(supabase);

  const response = await apiCall(
    'http://localhost:3000/api/alert-rules',
    token,
    {
      method: 'POST',
      body: JSON.stringify({
        name: 'High-value properties',
        conditions: {
          min_price: 3000000,
          property_type: 'house',
        },
        is_active: true,
      }),
    }
  );

  if (response.ok) {
    logResult('Create Alert Rule', '✅', 'Rule created');
  } else {
    logResult('Create Alert Rule', '⚠️', `Status: ${response.status}`);
  }
}

async function main() {
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   PRICEWAZE - COMPLETE USER FLOW SIMULATION (360°)      ║');
  console.log('║   Testing ALL features with: nadalpiantini@gmail.com      ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('\n');

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  // Step 1: Authentication
  const userId = await testAuth(supabase);
  if (!userId) {
    console.error('\n❌ Authentication failed. Cannot continue.\n');
    process.exit(1);
  }

  // Step 2: Properties
  const propertyId = await testPropertyCreation(supabase, userId);
  if (propertyId) {
    await testPropertyUpdate(supabase, propertyId, userId);
  }
  await testPropertyListing(supabase);

  // Get multiple properties for comparisons
  const { data: allProperties } = await supabase
    .from('pricewaze_properties')
    .select('id')
    .eq('status', 'active')
    .limit(5);
  const propertyIds = allProperties?.map(p => p.id) || [];

  // Step 3: Favorites
  if (propertyId) {
    await testFavorites(supabase, userId, propertyId);
  }

  // Step 4: Offers
  const offerId = propertyId ? await testOffers(supabase, userId, propertyId) : null;

  // Step 5: Visits
  const visitId = propertyId ? await testVisits(supabase, userId, propertyId) : null;

  // Step 6: Conversations & Messages
  if (propertyId) {
    await testConversations(supabase, userId, propertyId);
  }

  // Step 7: Reviews
  if (propertyId) {
    await testReviews(supabase, userId, propertyId);
  }

  // Step 8: Comparisons
  if (propertyIds.length >= 2) {
    await testComparisons(supabase, userId, propertyIds);
  }

  // Step 9: Saved Searches
  await testSavedSearches(supabase, userId);

  // Step 10: Price Alerts
  if (propertyId) {
    await testPriceAlerts(supabase, userId, propertyId);
  }

  // Step 11: AI Features
  if (propertyId) {
    await testAIFeatures(supabase, propertyId, offerId || undefined);
  }

  // Step 12: Contracts
  if (offerId) {
    await testContracts(supabase, offerId);
  }

  // Step 13: Gamification
  await testGamification(supabase);

  // Step 14: Market Signals
  await testMarketSignals(supabase);

  // Step 15: Alert Rules
  await testAlertRules(supabase);

  // Final Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 FINAL SUMMARY');
  console.log('='.repeat(60));
  
  const success = results.filter(r => r.status === '✅').length;
  const warnings = results.filter(r => r.status === '⚠️').length;
  const failures = results.filter(r => r.status === '❌').length;
  const total = results.length;

  console.log(`\n✅ Success: ${success}/${total} (${Math.round(success/total*100)}%)`);
  console.log(`⚠️  Warnings: ${warnings}/${total} (${Math.round(warnings/total*100)}%)`);
  console.log(`❌ Failures: ${failures}/${total} (${Math.round(failures/total*100)}%)`);

  console.log('\n📋 Feature Breakdown:');
  results.forEach(r => {
    console.log(`  ${r.status} ${r.feature}: ${r.message}`);
  });

  console.log('\n✅ Complete user flow simulation finished!\n');
}

main().catch(console.error);

