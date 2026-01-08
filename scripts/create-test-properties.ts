#!/usr/bin/env tsx
/**
 * Create test properties directly (no user needed for public data)
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';
import { randomUUID } from 'crypto';

config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Create a dummy owner profile first
async function createDummyOwner() {
  const ownerId = randomUUID();
  
  const { error } = await supabase
    .from('pricewaze_profiles')
    .insert({
      id: ownerId,
      email: 'owner@test.com',
      full_name: 'Test Owner',
      role: 'seller',
      verified: true,
    });

  if (error && !error.message.includes('duplicate')) {
    console.error('Error creating owner:', error.message);
    return null;
  }

  return ownerId;
}

async function createTestProperties() {
  console.log('🏠 Creating test properties...\n');

  // Get zones
  const { data: zones } = await supabase
    .from('pricewaze_zones')
    .select('id, name')
    .limit(3);

  if (!zones || zones.length === 0) {
    console.error('❌ No zones found. Run seed first.');
    return;
  }

  const ownerId = await createDummyOwner();
  if (!ownerId) {
    console.error('❌ Failed to create owner');
    return;
  }

  const properties = [
    {
      owner_id: ownerId,
      title: 'Apartamento Moderno en Piantini',
      description: 'Hermoso apartamento de 2 habitaciones con vista panorámica, acabados de primera calidad.',
      property_type: 'apartment',
      price: 8500000,
      area_m2: 95,
      bedrooms: 2,
      bathrooms: 2,
      parking_spaces: 1,
      year_built: 2020,
      address: 'Torre Platinum, Av. Abraham Lincoln #502, Piantini',
      latitude: 18.4655,
      longitude: -69.9380,
      images: ['https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800'],
      features: ['Piscina', 'Gimnasio', 'Seguridad 24/7'],
      status: 'active',
    },
    {
      owner_id: ownerId,
      title: 'Casa Familiar en Los Prados',
      description: 'Espaciosa casa de 3 habitaciones con jardín amplio, ideal para familias.',
      property_type: 'house',
      price: 7200000,
      area_m2: 220,
      bedrooms: 3,
      bathrooms: 2,
      parking_spaces: 2,
      year_built: 2018,
      address: 'Calle Los Rosales #45, Los Prados',
      latitude: 18.4755,
      longitude: -69.9500,
      images: ['https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800'],
      features: ['Jardín', 'BBQ Area', 'Cisterna'],
      status: 'active',
    },
    {
      owner_id: ownerId,
      title: 'Penthouse de Lujo en Naco',
      description: 'Exclusivo penthouse con terraza privada y las mejores vistas de la ciudad.',
      property_type: 'apartment',
      price: 25000000,
      area_m2: 350,
      bedrooms: 4,
      bathrooms: 5,
      parking_spaces: 3,
      year_built: 2023,
      address: 'Torre Elite, Av. Tiradentes #88, Naco',
      latitude: 18.4600,
      longitude: -69.9350,
      images: ['https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800'],
      features: ['Jacuzzi', 'Terraza', 'Smart Home', 'Vista 360'],
      status: 'active',
    },
  ];

  for (const prop of properties) {
    const { data, error } = await supabase
      .from('pricewaze_properties')
      .insert(prop)
      .select()
      .single();

    if (error) {
      console.error(`   ❌ Failed: ${prop.title} - ${error.message}`);
    } else {
      const price = new Intl.NumberFormat('es-DO', {
        style: 'currency',
        currency: 'DOP',
        maximumFractionDigits: 0,
      }).format(prop.price);
      console.log(`   ✅ Created: ${prop.title} - ${price}`);
    }
  }

  console.log('\n✅ Test properties created!\n');
}

createTestProperties().catch(console.error);








