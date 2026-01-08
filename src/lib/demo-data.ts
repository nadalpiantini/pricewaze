/**
 * Demo Data Fixtures
 * Realistic demo data for onboarding experience
 */

import type { Property, Offer, PropertySignalTypeState } from '@/types/database';

// Demo Properties (3 properties with different signal states)
// Property A: High pressure (red) - Piantini, Santo Domingo
// Property B: Weak signals (gray) - Arroyo Hondo, Santo Domingo  
// Property C: Clean (blue) - Emerging zone, Santo Domingo
export const DEMO_PROPERTIES: Property[] = [
  {
    id: 'demo-prop-1',
    owner_id: 'demo-owner-1',
    zone_id: null,
    title: 'Modern Apartment in Piantini',
    description: 'Well-located apartment, high recent demand.',
    property_type: 'apartment',
    price: 255000,
    area_m2: 120,
    price_per_m2: 2125,
    bedrooms: 3,
    bathrooms: 2,
    parking_spaces: 1,
    year_built: 2018,
    address: 'Piantini, Santo Domingo',
    latitude: 18.4663,
    longitude: -69.9411,
    location: null,
    images: [
      '/placeholder-property.jpg',
      '/placeholder-property.jpg',
      '/placeholder-property.jpg',
    ],
    features: ['Balcony', 'Modern Kitchen', 'Parking', 'Security'],
    status: 'active',
    views_count: 127,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'demo-prop-2',
    owner_id: 'demo-owner-2',
    zone_id: null,
    title: 'Family Home in Arroyo Hondo',
    description: 'Spacious property with visible details during visits.',
    property_type: 'house',
    price: 210000,
    area_m2: 200,
    price_per_m2: 1050,
    bedrooms: 4,
    bathrooms: 3,
    parking_spaces: 2,
    year_built: 2015,
    address: 'Arroyo Hondo, Santo Domingo',
    latitude: 18.4945,
    longitude: -69.9592,
    location: null,
    images: [
      '/placeholder-property.jpg',
      '/placeholder-property.jpg',
    ],
    features: ['Garden', 'Garage', 'Security System'],
    status: 'active',
    views_count: 89,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'demo-prop-3',
    owner_id: 'demo-owner-3',
    zone_id: null,
    title: 'Apartment in Emerging Zone',
    description: 'Zone with low turnover and little recent movement.',
    property_type: 'apartment',
    price: 175000,
    area_m2: 85,
    price_per_m2: 2059,
    bedrooms: 2,
    bathrooms: 1,
    parking_spaces: 0,
    year_built: 2012,
    address: 'Ensanche Luperón, Santo Domingo',
    latitude: 18.4519,
    longitude: -69.9327,
    location: null,
    images: [
      '/placeholder-property.jpg',
    ],
    features: ['Furnished'],
    status: 'active',
    views_count: 45,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

// Demo Signal States for Property 1 (High Pressure - Red)
// Real pressure: 3 active offers, 7 recent visits
export const DEMO_SIGNALS_PROP_1: PropertySignalTypeState[] = [
  {
    property_id: 'demo-prop-1',
    signal_type: 'many_visits',
    strength: 7,
    confirmed: true,
    last_seen_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    property_id: 'demo-prop-1',
    signal_type: 'competing_offers',
    strength: 3,
    confirmed: true,
    last_seen_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

// Demo Signal States for Property 2 (Weak Signal - Gray)
// Some friction: noise and humidity signals (unconfirmed)
export const DEMO_SIGNALS_PROP_2: PropertySignalTypeState[] = [
  {
    property_id: 'demo-prop-2',
    signal_type: 'noise',
    strength: 2,
    confirmed: false,
    last_seen_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    property_id: 'demo-prop-2',
    signal_type: 'humidity',
    strength: 1,
    confirmed: false,
    last_seen_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

// Demo Signal States for Property 3 (Clean - Blue)
// No signals or strength = 0
export const DEMO_SIGNALS_PROP_3: PropertySignalTypeState[] = [];

// Demo Offers (Negotiation timeline)
// Timeline with clear narrative: initial offer → counteroffer with context
export const DEMO_OFFERS: Offer[] = [
  {
    id: 'demo-offer-1',
    property_id: 'demo-prop-1',
    buyer_id: 'demo-buyer-1',
    seller_id: 'demo-owner-1',
    amount: 240000,
    message: 'Initial offer',
    status: 'countered',
    parent_offer_id: null,
    expires_at: new Date(Date.now() + 18 * 60 * 60 * 1000).toISOString(), // 18 hours from now
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
    updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
  },
  {
    id: 'demo-offer-2',
    property_id: 'demo-prop-1',
    buyer_id: 'demo-buyer-1',
    seller_id: 'demo-owner-1',
    amount: 255000,
    message: 'Counteroffer',
    status: 'pending',
    parent_offer_id: 'demo-offer-1',
    expires_at: new Date(Date.now() + 18 * 60 * 60 * 1000).toISOString(), // 18 hours from now
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
    updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

// Demo Copilot Analysis (pre-filled for demo)
// Exact copy from W1.1 spec - English version
export const DEMO_COPILOT_ANALYSIS = {
  summary: 'The counteroffer occurs in a context of high demand and active competition, which reduces the negotiation margin.',
  confidence_level: 'medium' as const,
  key_factors: [
    'Sustained increase in visits',
    'Appearance of competing offers',
  ],
  risks: [
    'Waiting may reduce the margin',
    'Competition suggests time pressure',
  ],
  scenarios: [
    {
      option: '1) Adjust the offer slightly',
      rationale: 'Improves competitiveness without accepting the full amount.',
      pros: ['Signals real interest'],
      cons: ['Reduces margin'],
    },
    {
      option: '2) Maintain current offer',
      rationale: 'Maintains price discipline, with moderate risk.',
      pros: ['Maintains price discipline'],
      cons: ['Risk of being outbid'],
    },
  ],
};

// Helper to get demo property by ID
export function getDemoProperty(id: string): Property | undefined {
  return DEMO_PROPERTIES.find(p => p.id === id);
}

// Helper to get demo signals by property ID
export function getDemoSignals(propertyId: string): PropertySignalTypeState[] {
  if (propertyId === 'demo-prop-1') return DEMO_SIGNALS_PROP_1;
  if (propertyId === 'demo-prop-2') return DEMO_SIGNALS_PROP_2;
  if (propertyId === 'demo-prop-3') return DEMO_SIGNALS_PROP_3;
  return [];
}

// Helper to get demo offers by property ID
export function getDemoOffers(propertyId: string): Offer[] {
  if (propertyId === 'demo-prop-1') return DEMO_OFFERS;
  return [];
}

