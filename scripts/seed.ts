/**
 * PriceWaze Database Seed Script
 *
 * Creates test data for development:
 * - 10 Users (buyers, sellers, agents, admins)
 * - 3 Zones (Santo Domingo areas with PostGIS polygons)
 * - 15 Properties with realistic Dominican Republic prices
 * - 30 Simulations (offers, visits, notifications, transactions)
 */

import { createClient } from '@supabase/supabase-js';

// Types
type UserRole = 'buyer' | 'seller' | 'agent' | 'admin';
type PropertyType = 'apartment' | 'house' | 'land' | 'commercial' | 'office';
type OfferStatus = 'pending' | 'accepted' | 'rejected' | 'countered' | 'withdrawn' | 'expired';
type VisitStatus = 'scheduled' | 'completed' | 'cancelled' | 'no_show';
type PropertyStatus = 'active' | 'pending' | 'sold' | 'inactive';

interface SeedUser {
  email: string;
  password: string;
  fullName: string;
  phone: string;
  role: UserRole;
}

interface SeedZone {
  name: string;
  city: string;
  avgPriceM2: number;
  polygon: number[][];
}

interface SeedProperty {
  ownerEmail: string;
  title: string;
  description: string;
  propertyType: PropertyType;
  price: number;
  areaM2: number;
  bedrooms: number | null;
  bathrooms: number | null;
  parkingSpaces: number | null;
  yearBuilt: number | null;
  address: string;
  latitude: number;
  longitude: number;
  images: string[];
  features: string[];
  status: PropertyStatus;
}

// Supabase client with service role
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓' : '✗');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// ============================================================================
// SEED DATA DEFINITIONS
// ============================================================================

const USERS: SeedUser[] = [
  // Buyers (3)
  { email: 'maria@test.com', password: 'Test123!', fullName: 'Maria Garcia', phone: '+1-809-555-0101', role: 'buyer' },
  { email: 'juan@test.com', password: 'Test123!', fullName: 'Juan Perez', phone: '+1-809-555-0102', role: 'buyer' },
  { email: 'ana@test.com', password: 'Test123!', fullName: 'Ana Rodriguez', phone: '+1-809-555-0103', role: 'buyer' },
  // Sellers (3)
  { email: 'carlos@test.com', password: 'Test123!', fullName: 'Carlos Mendez', phone: '+1-809-555-0104', role: 'seller' },
  { email: 'laura@test.com', password: 'Test123!', fullName: 'Laura Santos', phone: '+1-809-555-0105', role: 'seller' },
  { email: 'pedro@test.com', password: 'Test123!', fullName: 'Pedro Jimenez', phone: '+1-809-555-0106', role: 'seller' },
  // Agents (2)
  { email: 'elena@test.com', password: 'Test123!', fullName: 'Elena Vega', phone: '+1-809-555-0107', role: 'agent' },
  { email: 'roberto@test.com', password: 'Test123!', fullName: 'Roberto Cruz', phone: '+1-809-555-0108', role: 'agent' },
  // Admins (2)
  { email: 'admin1@test.com', password: 'Admin123!', fullName: 'Admin One', phone: '+1-809-555-0109', role: 'admin' },
  { email: 'admin2@test.com', password: 'Admin123!', fullName: 'Admin Two', phone: '+1-809-555-0110', role: 'admin' },
];

// Santo Domingo zones with realistic PostGIS polygons
const ZONES: SeedZone[] = [
  {
    name: 'Piantini',
    city: 'Santo Domingo',
    avgPriceM2: 2500,
    // Approximate polygon for Piantini neighborhood
    polygon: [
      [-69.9450, 18.4700],
      [-69.9350, 18.4700],
      [-69.9350, 18.4600],
      [-69.9450, 18.4600],
      [-69.9450, 18.4700],
    ],
  },
  {
    name: 'Naco',
    city: 'Santo Domingo',
    avgPriceM2: 1800,
    // Approximate polygon for Naco neighborhood
    polygon: [
      [-69.9400, 18.4650],
      [-69.9300, 18.4650],
      [-69.9300, 18.4550],
      [-69.9400, 18.4550],
      [-69.9400, 18.4650],
    ],
  },
  {
    name: 'Los Prados',
    city: 'Santo Domingo',
    avgPriceM2: 1200,
    // Approximate polygon for Los Prados neighborhood
    polygon: [
      [-69.9550, 18.4800],
      [-69.9450, 18.4800],
      [-69.9450, 18.4700],
      [-69.9550, 18.4700],
      [-69.9550, 18.4800],
    ],
  },
];

// Properties with realistic Dominican Republic prices (RD$3M - RD$25M)
const PROPERTIES: SeedProperty[] = [
  // Carlos's properties (seller)
  {
    ownerEmail: 'carlos@test.com',
    title: 'Lujoso Apartamento en Piantini',
    description: 'Espectacular apartamento de 3 habitaciones con vista panoramica, acabados de primera calidad, cocina italiana y terraza privada.',
    propertyType: 'apartment',
    price: 12500000, // RD$12.5M
    areaM2: 185,
    bedrooms: 3,
    bathrooms: 3,
    parkingSpaces: 2,
    yearBuilt: 2022,
    address: 'Torre Platinum, Av. Abraham Lincoln #502, Piantini',
    latitude: 18.4655,
    longitude: -69.9380,
    images: ['https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800'],
    features: ['Piscina', 'Gimnasio', 'Seguridad 24/7', 'Generador', 'Aire Central'],
    status: 'active',
  },
  {
    ownerEmail: 'carlos@test.com',
    title: 'Casa Moderna en Los Prados',
    description: 'Hermosa casa de 2 niveles con jardin amplio, ideal para familias. Cocina remodelada y areas sociales espaciosas.',
    propertyType: 'house',
    price: 8500000, // RD$8.5M
    areaM2: 280,
    bedrooms: 4,
    bathrooms: 3,
    parkingSpaces: 3,
    yearBuilt: 2018,
    address: 'Calle Los Rosales #45, Los Prados',
    latitude: 18.4755,
    longitude: -69.9500,
    images: ['https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800'],
    features: ['Jardin', 'BBQ Area', 'Cuarto de Servicio', 'Cisterna'],
    status: 'active',
  },
  {
    ownerEmail: 'carlos@test.com',
    title: 'Penthouse Premium en Naco',
    description: 'Exclusivo penthouse con terraza de 100m2, jacuzzi privado y las mejores vistas de la ciudad.',
    propertyType: 'apartment',
    price: 25000000, // RD$25M
    areaM2: 350,
    bedrooms: 4,
    bathrooms: 5,
    parkingSpaces: 3,
    yearBuilt: 2023,
    address: 'Torre Elite, Av. Tiradentes #88, Naco',
    latitude: 18.4600,
    longitude: -69.9350,
    images: ['https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800'],
    features: ['Jacuzzi', 'Terraza', 'Smart Home', 'Vista 360', 'Wine Cellar'],
    status: 'active',
  },
  // Laura's properties (seller)
  {
    ownerEmail: 'laura@test.com',
    title: 'Apartamento Acogedor en Naco',
    description: 'Perfecto apartamento de 2 habitaciones para jovenes profesionales. Cerca de todo, excelente ubicacion.',
    propertyType: 'apartment',
    price: 6500000, // RD$6.5M
    areaM2: 95,
    bedrooms: 2,
    bathrooms: 2,
    parkingSpaces: 1,
    yearBuilt: 2020,
    address: 'Residencial Sol, Calle Fantino Falco #23, Naco',
    latitude: 18.4620,
    longitude: -69.9370,
    images: ['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800'],
    features: ['Balcon', 'Aire Split', 'Seguridad', 'Area Social'],
    status: 'active',
  },
  {
    ownerEmail: 'laura@test.com',
    title: 'Casa Familiar en Los Prados',
    description: 'Espaciosa casa familiar con patio grande, perfecta para ninos. Zona tranquila y segura.',
    propertyType: 'house',
    price: 7200000, // RD$7.2M
    areaM2: 220,
    bedrooms: 3,
    bathrooms: 2,
    parkingSpaces: 2,
    yearBuilt: 2015,
    address: 'Calle Las Margaritas #78, Los Prados',
    latitude: 18.4765,
    longitude: -69.9480,
    images: ['https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800'],
    features: ['Patio', 'Marquesina Techada', 'Cerca Perimetral'],
    status: 'active',
  },
  {
    ownerEmail: 'laura@test.com',
    title: 'Local Comercial en Piantini',
    description: 'Excelente local comercial en zona de alto trafico. Ideal para oficinas o retail.',
    propertyType: 'commercial',
    price: 15000000, // RD$15M
    areaM2: 200,
    bedrooms: null,
    bathrooms: 2,
    parkingSpaces: 5,
    yearBuilt: 2019,
    address: 'Plaza Comercial Piantini, Av. Gustavo Mejia Ricart #120',
    latitude: 18.4670,
    longitude: -69.9400,
    images: ['https://images.unsplash.com/photo-1497366216548-37526070297c?w=800'],
    features: ['Alto Trafico', 'Estacionamiento', 'Aire Central', 'Banos Publicos'],
    status: 'active',
  },
  // Pedro's properties (seller)
  {
    ownerEmail: 'pedro@test.com',
    title: 'Apartamento Economico en Los Prados',
    description: 'Oportunidad unica! Apartamento de 1 habitacion perfecto para inversion o primera vivienda.',
    propertyType: 'apartment',
    price: 3200000, // RD$3.2M
    areaM2: 55,
    bedrooms: 1,
    bathrooms: 1,
    parkingSpaces: 1,
    yearBuilt: 2010,
    address: 'Edificio Los Prados, Calle Central #15',
    latitude: 18.4745,
    longitude: -69.9510,
    images: ['https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800'],
    features: ['Seguridad', 'Agua 24/7', 'Ascensor'],
    status: 'active',
  },
  {
    ownerEmail: 'pedro@test.com',
    title: 'Casa de Esquina en Naco',
    description: 'Amplia casa de esquina con gran potencial. Perfecta para remodelar a tu gusto.',
    propertyType: 'house',
    price: 9800000, // RD$9.8M
    areaM2: 300,
    bedrooms: 5,
    bathrooms: 3,
    parkingSpaces: 4,
    yearBuilt: 2005,
    address: 'Calle Jose Contreras esq. Max Henriquez, Naco',
    latitude: 18.4610,
    longitude: -69.9340,
    images: ['https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800'],
    features: ['Esquina', 'Solar Grande', 'Potencial Remodelacion'],
    status: 'active',
  },
  {
    ownerEmail: 'pedro@test.com',
    title: 'Terreno en Zona Premium',
    description: 'Terreno plano de 500m2 en zona residencial exclusiva. Listo para construir.',
    propertyType: 'land',
    price: 18000000, // RD$18M
    areaM2: 500,
    bedrooms: null,
    bathrooms: null,
    parkingSpaces: null,
    yearBuilt: null,
    address: 'Solar #234, Urbanizacion Piantini',
    latitude: 18.4680,
    longitude: -69.9420,
    images: ['https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800'],
    features: ['Plano', 'Servicios Disponibles', 'Uso Residencial'],
    status: 'active',
  },
  // Elena's properties (agent)
  {
    ownerEmail: 'elena@test.com',
    title: 'Oficina Ejecutiva en Piantini',
    description: 'Moderna oficina corporativa con sala de reuniones y recepcion. Torre de prestigio.',
    propertyType: 'office',
    price: 8000000, // RD$8M
    areaM2: 120,
    bedrooms: null,
    bathrooms: 2,
    parkingSpaces: 2,
    yearBuilt: 2021,
    address: 'Torre Corporativa, Av. Winston Churchill #200',
    latitude: 18.4665,
    longitude: -69.9390,
    images: ['https://images.unsplash.com/photo-1497366216548-37526070297c?w=800'],
    features: ['Sala Reuniones', 'Recepcion', 'Vista Ciudad', 'Cableado Estructurado'],
    status: 'active',
  },
  {
    ownerEmail: 'elena@test.com',
    title: 'Apartamento de Lujo en Piantini',
    description: 'Impresionante apartamento con acabados importados, muebles de disenador incluidos.',
    propertyType: 'apartment',
    price: 22000000, // RD$22M
    areaM2: 280,
    bedrooms: 3,
    bathrooms: 4,
    parkingSpaces: 2,
    yearBuilt: 2023,
    address: 'Torre Diamante, Av. Sarasota #55, Piantini',
    latitude: 18.4660,
    longitude: -69.9395,
    images: ['https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800'],
    features: ['Amueblado', 'Smart Home', 'Wine Cellar', 'Spa Privado'],
    status: 'active',
  },
  {
    ownerEmail: 'elena@test.com',
    title: 'Casa con Piscina en Naco',
    description: 'Espectacular casa con piscina privada, BBQ y areas verdes. Perfecta para entretenimiento.',
    propertyType: 'house',
    price: 16500000, // RD$16.5M
    areaM2: 400,
    bedrooms: 5,
    bathrooms: 4,
    parkingSpaces: 4,
    yearBuilt: 2017,
    address: 'Calle Los Almendros #12, Naco',
    latitude: 18.4595,
    longitude: -69.9360,
    images: ['https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800'],
    features: ['Piscina', 'BBQ', 'Jardin', 'Gazebo', 'Cuarto Servicio'],
    status: 'active',
  },
  {
    ownerEmail: 'elena@test.com',
    title: 'Apartamento Studio en Los Prados',
    description: 'Moderno studio ideal para estudiantes o profesionales solteros. Totalmente equipado.',
    propertyType: 'apartment',
    price: 4500000, // RD$4.5M
    areaM2: 45,
    bedrooms: 1,
    bathrooms: 1,
    parkingSpaces: 1,
    yearBuilt: 2022,
    address: 'Residencial Universitario, Calle 27 de Febrero',
    latitude: 18.4740,
    longitude: -69.9490,
    images: ['https://images.unsplash.com/photo-1536376072261-38c75010e6c9?w=800'],
    features: ['Equipado', 'Internet Incluido', 'Lavanderia'],
    status: 'active',
  },
  {
    ownerEmail: 'elena@test.com',
    title: 'Local en Centro Comercial',
    description: 'Local comercial en centro comercial de alto trafico. Excelente para retail o servicios.',
    propertyType: 'commercial',
    price: 5500000, // RD$5.5M
    areaM2: 80,
    bedrooms: null,
    bathrooms: 1,
    parkingSpaces: 0,
    yearBuilt: 2020,
    address: 'Centro Comercial Los Prados, Local 45',
    latitude: 18.4750,
    longitude: -69.9495,
    images: ['https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800'],
    features: ['Alto Trafico', 'Aire Central', 'Vigilancia'],
    status: 'active',
  },
  {
    ownerEmail: 'elena@test.com',
    title: 'Casa Colonial Remodelada',
    description: 'Hermosa casa colonial completamente remodelada. Combina historia con modernidad.',
    propertyType: 'house',
    price: 11000000, // RD$11M
    areaM2: 320,
    bedrooms: 4,
    bathrooms: 3,
    parkingSpaces: 2,
    yearBuilt: 1960,
    address: 'Calle Hostos #89, Zona Colonial cercana a Naco',
    latitude: 18.4590,
    longitude: -69.9380,
    images: ['https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=800'],
    features: ['Colonial', 'Remodelada', 'Techos Altos', 'Patio Interior'],
    status: 'active',
  },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function log(emoji: string, message: string) {
  console.log(`${emoji} ${message}`);
}

function logSection(title: string) {
  console.log('\n' + '='.repeat(60));
  console.log(`  ${title}`);
  console.log('='.repeat(60) + '\n');
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function getRandomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomDate(daysFromNow: number, daysRange: number = 0): Date {
  const date = new Date();
  const offset = daysRange > 0 ? Math.floor(Math.random() * daysRange) - daysRange / 2 : 0;
  date.setDate(date.getDate() + daysFromNow + offset);
  return date;
}

// ============================================================================
// SEED FUNCTIONS
// ============================================================================

async function clearExistingData() {
  logSection('CLEARING EXISTING SEED DATA');

  const tables = [
    'pricewaze_property_views',
    'pricewaze_favorites',
    'pricewaze_notifications',
    'pricewaze_agreements',
    'pricewaze_visits',
    'pricewaze_offers',
    'pricewaze_property_price_history',
    'pricewaze_properties',
    'pricewaze_zones',
  ];

  for (const table of tables) {
    const { error } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error && !error.message.includes('no rows')) {
      log('⚠️', `Warning clearing ${table}: ${error.message}`);
    } else {
      log('🗑️', `Cleared ${table}`);
    }
  }

  // Delete test users from auth
  log('🔄', 'Clearing test users from auth...');
  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  for (const user of USERS) {
    const existingUser = existingUsers?.users?.find(
      (u: { email?: string }) => u.email === user.email
    );
    if (existingUser) {
      // First delete profile
      await supabase.from('pricewaze_profiles').delete().eq('id', existingUser.id);
      // Then delete auth user
      await supabase.auth.admin.deleteUser(existingUser.id);
      log('🗑️', `Deleted user: ${user.email}`);
    }
  }

  log('✅', 'Cleared all existing seed data');
}

async function createUsers(): Promise<Map<string, string>> {
  logSection('CREATING USERS');

  const userIdMap = new Map<string, string>();

  for (const user of USERS) {
    try {
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
        user_metadata: {
          full_name: user.fullName,
        },
      });

      if (authError) {
        // Try to get more details about the error
        const errorDetails = authError.message || JSON.stringify(authError);
        log('❌', `Failed to create auth user ${user.email}: ${errorDetails}`);
        
        // If user already exists, try to get the existing user
        if (errorDetails.includes('already') || errorDetails.includes('exists')) {
          const { data: existingUsers } = await supabase.auth.admin.listUsers();
          const existingUser = existingUsers?.users?.find((u: any) => u.email === user.email);
          if (existingUser) {
            userIdMap.set(user.email, existingUser.id);
            log('⚠️', `User ${user.email} already exists, using existing user`);
            // Update profile
            await supabase
              .from('pricewaze_profiles')
              .update({
                full_name: user.fullName,
                phone: user.phone,
                role: user.role,
                verified: user.role === 'admin',
              })
              .eq('id', existingUser.id);
            continue;
          }
        }
        continue;
      }

      if (!authData.user) {
        log('❌', `No user data returned for ${user.email}`);
        continue;
      }

      const userId = authData.user.id;
      userIdMap.set(user.email, userId);

      // Update profile with additional data (profile is auto-created by trigger)
      await sleep(100); // Small delay to ensure trigger has run

      const { error: profileError } = await supabase
        .from('pricewaze_profiles')
        .update({
          full_name: user.fullName,
          phone: user.phone,
          role: user.role,
          verified: user.role === 'admin',
        })
        .eq('id', userId);

      if (profileError) {
        log('⚠️', `Failed to update profile for ${user.email}: ${profileError.message}`);
      }

      const roleEmoji = {
        buyer: '🛒',
        seller: '🏠',
        agent: '👔',
        admin: '👑',
      };

      log(roleEmoji[user.role], `Created: ${user.fullName} (${user.email}) - ${user.role}`);
    } catch (err) {
      log('❌', `Error creating user ${user.email}: ${err}`);
    }
  }

  log('✅', `Created ${userIdMap.size} users`);
  return userIdMap;
}

async function createZones(): Promise<Map<string, string>> {
  logSection('CREATING ZONES');

  const zoneIdMap = new Map<string, string>();

  for (const zone of ZONES) {
    // Create WKT polygon string
    const wktCoords = zone.polygon.map((coord) => `${coord[0]} ${coord[1]}`).join(', ');
    const wktPolygon = `SRID=4326;POLYGON((${wktCoords}))`;

    const { data, error } = await supabase
      .from('pricewaze_zones')
      .insert({
        name: zone.name,
        city: zone.city,
        avg_price_m2: zone.avgPriceM2,
        boundary: wktPolygon,
      })
      .select('id')
      .single();

    if (error) {
      log('❌', `Failed to create zone ${zone.name}: ${error.message}`);
      continue;
    }

    zoneIdMap.set(zone.name, data.id);
    log('📍', `Created zone: ${zone.name} (avg $${zone.avgPriceM2}/m2)`);
  }

  log('✅', `Created ${zoneIdMap.size} zones`);
  return zoneIdMap;
}

async function createProperties(
  userIdMap: Map<string, string>,
  zoneIdMap: Map<string, string>
): Promise<Map<number, string>> {
  logSection('CREATING PROPERTIES');

  const propertyIdMap = new Map<number, string>();

  for (let i = 0; i < PROPERTIES.length; i++) {
    const prop = PROPERTIES[i];
    const ownerId = userIdMap.get(prop.ownerEmail);

    if (!ownerId) {
      log('❌', `Owner not found for property: ${prop.title}`);
      continue;
    }

    const { data, error } = await supabase
      .from('pricewaze_properties')
      .insert({
        owner_id: ownerId,
        title: prop.title,
        description: prop.description,
        property_type: prop.propertyType,
        price: prop.price,
        area_m2: prop.areaM2,
        bedrooms: prop.bedrooms,
        bathrooms: prop.bathrooms,
        parking_spaces: prop.parkingSpaces,
        year_built: prop.yearBuilt,
        address: prop.address,
        latitude: prop.latitude,
        longitude: prop.longitude,
        images: prop.images,
        features: prop.features,
        status: prop.status,
      })
      .select('id')
      .single();

    if (error) {
      log('❌', `Failed to create property ${prop.title}: ${error.message}`);
      continue;
    }

    propertyIdMap.set(i + 1, data.id); // 1-indexed for easier reference

    const priceFormatted = new Intl.NumberFormat('es-DO', {
      style: 'currency',
      currency: 'DOP',
      maximumFractionDigits: 0,
    }).format(prop.price);

    log('🏘️', `Property ${i + 1}: ${prop.title} - ${priceFormatted}`);
  }

  log('✅', `Created ${propertyIdMap.size} properties`);
  return propertyIdMap;
}

async function createOffers(
  userIdMap: Map<string, string>,
  propertyIdMap: Map<number, string>
): Promise<Map<string, string>> {
  logSection('CREATING OFFERS');

  const offerIdMap = new Map<string, string>();

  // Get property owners for reference
  const propertyOwners: Record<number, string> = {};
  for (let i = 1; i <= PROPERTIES.length; i++) {
    const prop = PROPERTIES[i - 1];
    propertyOwners[i] = userIdMap.get(prop.ownerEmail)!;
  }

  const offers = [
    // 1. Maria -> Property1 (pending, RD$8.5M)
    {
      key: 'offer1',
      buyerEmail: 'maria@test.com',
      propertyIndex: 1,
      amount: 8500000,
      status: 'pending' as OfferStatus,
      message: 'Me interesa mucho esta propiedad. Estoy lista para cerrar rapido.',
    },
    // 2. Juan -> Property2 (countered, RD$12M -> RD$13M)
    {
      key: 'offer2',
      buyerEmail: 'juan@test.com',
      propertyIndex: 2,
      amount: 12000000,
      status: 'countered' as OfferStatus,
      message: 'Ofrezco RD$12M al contado.',
    },
    // 3. Juan -> Property3 (accepted, RD$6M)
    {
      key: 'offer3',
      buyerEmail: 'juan@test.com',
      propertyIndex: 3,
      amount: 6000000,
      status: 'accepted' as OfferStatus,
      message: 'Acepto el precio publicado.',
    },
    // 4. Ana -> Property4 (rejected, low-ball RD$4M)
    {
      key: 'offer4',
      buyerEmail: 'ana@test.com',
      propertyIndex: 4,
      amount: 4000000,
      status: 'rejected' as OfferStatus,
      message: 'Ofrezco RD$4M, es mi presupuesto maximo.',
    },
    // 5. Maria -> Property5 (withdrawn)
    {
      key: 'offer5',
      buyerEmail: 'maria@test.com',
      propertyIndex: 5,
      amount: 7000000,
      status: 'withdrawn' as OfferStatus,
      message: 'Interesada en la propiedad.',
    },
    // 6. Juan -> Property6 (pending, RD$18M)
    {
      key: 'offer6',
      buyerEmail: 'juan@test.com',
      propertyIndex: 6,
      amount: 18000000,
      status: 'pending' as OfferStatus,
      message: 'Excelente ubicacion, ofrezco precio publicado.',
    },
    // 7. Ana -> Property2 (pending)
    {
      key: 'offer7',
      buyerEmail: 'ana@test.com',
      propertyIndex: 2,
      amount: 8000000,
      status: 'pending' as OfferStatus,
      message: 'Segunda oferta por esta propiedad.',
    },
    // 8. Maria -> Property7 (countered twice)
    {
      key: 'offer8',
      buyerEmail: 'maria@test.com',
      propertyIndex: 7,
      amount: 2800000,
      status: 'countered' as OfferStatus,
      message: 'Buen apartamento para inversion.',
    },
  ];

  for (const offer of offers) {
    const buyerId = userIdMap.get(offer.buyerEmail);
    const propertyId = propertyIdMap.get(offer.propertyIndex);
    const sellerId = propertyOwners[offer.propertyIndex];

    if (!buyerId || !propertyId || !sellerId) {
      log('❌', `Missing data for offer: ${offer.key}`);
      continue;
    }

    const { data, error } = await supabase
      .from('pricewaze_offers')
      .insert({
        property_id: propertyId,
        buyer_id: buyerId,
        seller_id: sellerId,
        amount: offer.amount,
        message: offer.message,
        status: offer.status,
        expires_at: getRandomDate(7).toISOString(),
      })
      .select('id')
      .single();

    if (error) {
      log('❌', `Failed to create ${offer.key}: ${error.message}`);
      continue;
    }

    offerIdMap.set(offer.key, data.id);

    const statusEmoji: Record<OfferStatus, string> = {
      pending: '⏳',
      accepted: '✅',
      rejected: '❌',
      countered: '🔄',
      withdrawn: '🚫',
      expired: '⌛',
    };

    const amountFormatted = new Intl.NumberFormat('es-DO', {
      style: 'currency',
      currency: 'DOP',
      maximumFractionDigits: 0,
    }).format(offer.amount);

    log(statusEmoji[offer.status], `${offer.key}: ${offer.buyerEmail} -> Property${offer.propertyIndex} ${amountFormatted} (${offer.status})`);
  }

  // Create counter-offer for offer2 (Juan -> Property2)
  const offer2Id = offerIdMap.get('offer2');
  const juanId = userIdMap.get('juan@test.com');
  const property2Id = propertyIdMap.get(2);
  const seller2Id = propertyOwners[2];

  if (offer2Id && juanId && property2Id && seller2Id) {
    const { data: counterOffer, error: counterError } = await supabase
      .from('pricewaze_offers')
      .insert({
        property_id: property2Id,
        buyer_id: juanId,
        seller_id: seller2Id,
        amount: 13000000,
        message: 'Contra-oferta: RD$13M es mi precio minimo.',
        status: 'pending',
        parent_offer_id: offer2Id,
        expires_at: getRandomDate(7).toISOString(),
      })
      .select('id')
      .single();

    if (!counterError && counterOffer) {
      offerIdMap.set('counter_offer2', counterOffer.id);
      log('🔄', 'Counter-offer created for offer2: RD$13M');
    }
  }

  // Create two counter-offers for offer8 (Maria -> Property7)
  const offer8Id = offerIdMap.get('offer8');
  const mariaId = userIdMap.get('maria@test.com');
  const property7Id = propertyIdMap.get(7);
  const seller7Id = propertyOwners[7];

  if (offer8Id && mariaId && property7Id && seller7Id) {
    // First counter
    const { data: counter1 } = await supabase
      .from('pricewaze_offers')
      .insert({
        property_id: property7Id,
        buyer_id: mariaId,
        seller_id: seller7Id,
        amount: 3000000,
        message: 'Contra-oferta 1: RD$3M',
        status: 'countered',
        parent_offer_id: offer8Id,
        expires_at: getRandomDate(7).toISOString(),
      })
      .select('id')
      .single();

    if (counter1) {
      // Second counter
      await supabase.from('pricewaze_offers').insert({
        property_id: property7Id,
        buyer_id: mariaId,
        seller_id: seller7Id,
        amount: 3100000,
        message: 'Contra-oferta 2: RD$3.1M, precio final.',
        status: 'pending',
        parent_offer_id: counter1.id,
        expires_at: getRandomDate(7).toISOString(),
      });

      log('🔄', 'Two counter-offers created for offer8');
    }
  }

  log('✅', `Created ${offerIdMap.size} offers`);
  return offerIdMap;
}

async function createVisits(userIdMap: Map<string, string>, propertyIdMap: Map<number, string>) {
  logSection('CREATING VISITS');

  const propertyOwners: Record<number, string> = {};
  for (let i = 1; i <= PROPERTIES.length; i++) {
    const prop = PROPERTIES[i - 1];
    propertyOwners[i] = userIdMap.get(prop.ownerEmail)!;
  }

  const visits = [
    // 1. Ana -> Property1 (scheduled, tomorrow)
    {
      visitorEmail: 'ana@test.com',
      propertyIndex: 1,
      status: 'scheduled' as VisitStatus,
      scheduledAt: getRandomDate(1),
      verifiedAt: null,
      verificationLat: null,
      verificationLng: null,
      notes: 'Primera visita programada',
    },
    // 2. Maria -> Property2 (completed, verified GPS)
    {
      visitorEmail: 'maria@test.com',
      propertyIndex: 2,
      status: 'completed' as VisitStatus,
      scheduledAt: getRandomDate(-2),
      verifiedAt: getRandomDate(-2),
      verificationLat: 18.4655,
      verificationLng: -69.937,
      notes: 'Visita completada, cliente muy interesada',
    },
    // 3. Juan -> Property3 (completed, pending verification)
    {
      visitorEmail: 'juan@test.com',
      propertyIndex: 3,
      status: 'completed' as VisitStatus,
      scheduledAt: getRandomDate(-1),
      verifiedAt: null,
      verificationLat: null,
      verificationLng: null,
      notes: 'Visita realizada sin verificacion GPS',
    },
    // 4. Ana -> Property4 (cancelled)
    {
      visitorEmail: 'ana@test.com',
      propertyIndex: 4,
      status: 'cancelled' as VisitStatus,
      scheduledAt: getRandomDate(-3),
      verifiedAt: null,
      verificationLat: null,
      verificationLng: null,
      notes: 'Cliente cancelo por conflicto de horario',
    },
    // 5. Maria -> Property5 (completed)
    {
      visitorEmail: 'maria@test.com',
      propertyIndex: 5,
      status: 'completed' as VisitStatus,
      scheduledAt: getRandomDate(-5),
      verifiedAt: getRandomDate(-5),
      verificationLat: 18.4765,
      verificationLng: -69.948,
      notes: 'Buena visita, pero cliente busca algo mas grande',
    },
    // 6. Juan -> Property1 (scheduled, next week)
    {
      visitorEmail: 'juan@test.com',
      propertyIndex: 1,
      status: 'scheduled' as VisitStatus,
      scheduledAt: getRandomDate(7),
      verifiedAt: null,
      verificationLat: null,
      verificationLng: null,
      notes: 'Segunda visita programada para la proxima semana',
    },
  ];

  for (const visit of visits) {
    const visitorId = userIdMap.get(visit.visitorEmail);
    const propertyId = propertyIdMap.get(visit.propertyIndex);
    const ownerId = propertyOwners[visit.propertyIndex];

    if (!visitorId || !propertyId || !ownerId) {
      log('❌', `Missing data for visit: ${visit.visitorEmail} -> Property${visit.propertyIndex}`);
      continue;
    }

    const { error } = await supabase.from('pricewaze_visits').insert({
      property_id: propertyId,
      visitor_id: visitorId,
      owner_id: ownerId,
      scheduled_at: visit.scheduledAt.toISOString(),
      verification_code: generateVerificationCode(),
      verified_at: visit.verifiedAt?.toISOString() || null,
      verification_latitude: visit.verificationLat,
      verification_longitude: visit.verificationLng,
      status: visit.status,
      notes: visit.notes,
    });

    if (error) {
      log('❌', `Failed to create visit: ${error.message}`);
      continue;
    }

    const statusEmoji: Record<VisitStatus, string> = {
      scheduled: '📅',
      completed: '✅',
      cancelled: '❌',
      no_show: '👻',
    };

    log(statusEmoji[visit.status], `Visit: ${visit.visitorEmail} -> Property${visit.propertyIndex} (${visit.status})`);
  }

  log('✅', 'Created 6 visits');
}

async function createNotifications(userIdMap: Map<string, string>, propertyIdMap: Map<number, string>) {
  logSection('CREATING NOTIFICATIONS');

  const notifications = [
    // 3x "Nueva oferta recibida"
    {
      userEmail: 'carlos@test.com',
      title: 'Nueva oferta recibida',
      message: 'Has recibido una nueva oferta de RD$8,500,000 por tu propiedad en Piantini.',
      type: 'offer_received',
      data: { propertyIndex: 1, amount: 8500000 },
    },
    {
      userEmail: 'laura@test.com',
      title: 'Nueva oferta recibida',
      message: 'Has recibido una nueva oferta de RD$6,500,000 por tu apartamento en Naco.',
      type: 'offer_received',
      data: { propertyIndex: 4, amount: 6500000 },
    },
    {
      userEmail: 'pedro@test.com',
      title: 'Nueva oferta recibida',
      message: 'Has recibido una nueva oferta de RD$18,000,000 por tu terreno en Piantini.',
      type: 'offer_received',
      data: { propertyIndex: 9, amount: 18000000 },
    },
    // 2x "Oferta contraofertada"
    {
      userEmail: 'juan@test.com',
      title: 'Oferta contraofertada',
      message: 'El vendedor ha respondido con una contraoferta de RD$13,000,000.',
      type: 'offer_countered',
      data: { propertyIndex: 2, originalAmount: 12000000, counterAmount: 13000000 },
    },
    {
      userEmail: 'maria@test.com',
      title: 'Oferta contraofertada',
      message: 'El vendedor ha respondido con una contraoferta de RD$3,100,000.',
      type: 'offer_countered',
      data: { propertyIndex: 7, originalAmount: 2800000, counterAmount: 3100000 },
    },
    // 2x "Visita programada"
    {
      userEmail: 'ana@test.com',
      title: 'Visita programada',
      message: 'Tu visita ha sido confirmada para manana a las 10:00 AM.',
      type: 'visit_scheduled',
      data: { propertyIndex: 1, date: getRandomDate(1).toISOString() },
    },
    {
      userEmail: 'juan@test.com',
      title: 'Visita programada',
      message: 'Tu visita ha sido confirmada para la proxima semana.',
      type: 'visit_scheduled',
      data: { propertyIndex: 1, date: getRandomDate(7).toISOString() },
    },
    // 2x "Alerta de precio"
    {
      userEmail: 'maria@test.com',
      title: 'Alerta de precio',
      message: 'Una propiedad que te interesa ha bajado de precio un 5%.',
      type: 'price_alert',
      data: { propertyIndex: 3, oldPrice: 26000000, newPrice: 25000000 },
    },
    {
      userEmail: 'ana@test.com',
      title: 'Alerta de precio',
      message: 'Hay nuevas propiedades en tu rango de precio en Los Prados.',
      type: 'price_alert',
      data: { zone: 'Los Prados', priceRange: '3M-8M' },
    },
    // 1x "Propiedad vista"
    {
      userEmail: 'carlos@test.com',
      title: 'Propiedad vista',
      message: 'Tu propiedad en Piantini ha sido vista 15 veces esta semana.',
      type: 'property_viewed',
      data: { propertyIndex: 1, viewCount: 15 },
    },
  ];

  for (const notif of notifications) {
    const userId = userIdMap.get(notif.userEmail);

    if (!userId) {
      log('❌', `User not found for notification: ${notif.userEmail}`);
      continue;
    }

    const { error } = await supabase.from('pricewaze_notifications').insert({
      user_id: userId,
      title: notif.title,
      message: notif.message,
      type: notif.type,
      data: notif.data,
      read: Math.random() > 0.7, // 30% read
    });

    if (error) {
      log('❌', `Failed to create notification: ${error.message}`);
      continue;
    }

    log('🔔', `${notif.type}: ${notif.userEmail}`);
  }

  log('✅', 'Created 10 notifications');
}

async function createFavorites(userIdMap: Map<string, string>, propertyIdMap: Map<number, string>) {
  logSection('CREATING FAVORITES');

  const favorites = [
    // Maria -> Prop1, Prop2
    { userEmail: 'maria@test.com', propertyIndex: 1 },
    { userEmail: 'maria@test.com', propertyIndex: 2 },
    // Ana -> Prop3, Prop4, Prop5
    { userEmail: 'ana@test.com', propertyIndex: 3 },
    { userEmail: 'ana@test.com', propertyIndex: 4 },
    { userEmail: 'ana@test.com', propertyIndex: 5 },
    // Juan -> Prop1
    { userEmail: 'juan@test.com', propertyIndex: 1 },
  ];

  for (const fav of favorites) {
    const userId = userIdMap.get(fav.userEmail);
    const propertyId = propertyIdMap.get(fav.propertyIndex);

    if (!userId || !propertyId) {
      log('❌', `Missing data for favorite: ${fav.userEmail} -> Property${fav.propertyIndex}`);
      continue;
    }

    const { error } = await supabase.from('pricewaze_favorites').insert({
      user_id: userId,
      property_id: propertyId,
    });

    if (error) {
      log('❌', `Failed to create favorite: ${error.message}`);
      continue;
    }

    log('❤️', `${fav.userEmail} -> Property${fav.propertyIndex}`);
  }

  log('✅', 'Created 6 favorites');
}

async function createPropertyViews(userIdMap: Map<string, string>, propertyIdMap: Map<number, string>) {
  logSection('CREATING PROPERTY VIEWS');

  const userEmails = ['maria@test.com', 'juan@test.com', 'ana@test.com'];
  let viewCount = 0;

  // Distribute 50+ random views across properties
  for (let propIndex = 1; propIndex <= PROPERTIES.length; propIndex++) {
    const propertyId = propertyIdMap.get(propIndex);
    if (!propertyId) continue;

    // Random number of views per property (2-8)
    const numViews = Math.floor(Math.random() * 7) + 2;

    for (let v = 0; v < numViews; v++) {
      const randomUserEmail = getRandomElement(userEmails);
      const viewerId = Math.random() > 0.3 ? userIdMap.get(randomUserEmail) : null; // 30% anonymous

      await supabase.from('pricewaze_property_views').insert({
        property_id: propertyId,
        viewer_id: viewerId,
        viewed_at: getRandomDate(-30, 30).toISOString(),
      });

      viewCount++;
    }
  }

  log('👁️', `Created ${viewCount} property views`);
}

async function createPriceHistory(propertyIdMap: Map<number, string>) {
  logSection('CREATING PRICE HISTORY');

  // Properties with price changes: Property 3, Property 5, Property 10
  const priceChanges = [
    { propertyIndex: 3, prices: [27000000, 26000000, 25000000] }, // Penthouse - reduced twice
    { propertyIndex: 5, prices: [7500000, 7200000] }, // Casa Familiar - reduced once
    { propertyIndex: 10, prices: [7500000, 8000000] }, // Oficina - increased once
  ];

  for (const change of priceChanges) {
    const propertyId = propertyIdMap.get(change.propertyIndex);
    if (!propertyId) continue;

    // Get property area for price_per_m2 calculation
    const { data: property } = await supabase
      .from('pricewaze_properties')
      .select('area_m2')
      .eq('id', propertyId)
      .single();

    if (!property) continue;

    for (let i = 0; i < change.prices.length; i++) {
      const price = change.prices[i];
      const pricePerM2 = price / property.area_m2;

      await supabase.from('pricewaze_property_price_history').insert({
        property_id: propertyId,
        price: price,
        price_per_m2: pricePerM2,
        changed_at: getRandomDate(-30 + i * 10).toISOString(),
      });
    }

    log('📊', `Property${change.propertyIndex}: ${change.prices.length} price changes recorded`);
  }

  log('✅', 'Created price history for 3 properties');
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

export async function seed() {
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║              PRICEWAZE DATABASE SEED SCRIPT                ║');
  console.log('║                  Santo Domingo, DR Data                    ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('\n');

  try {
    // 1. Clear existing data
    await clearExistingData();

    // 2. Create users
    const userIdMap = await createUsers();

    // 3. Create zones
    const zoneIdMap = await createZones();

    // 4. Create properties
    const propertyIdMap = await createProperties(userIdMap, zoneIdMap);

    // 5. Create offers
    await createOffers(userIdMap, propertyIdMap);

    // 6. Create visits
    await createVisits(userIdMap, propertyIdMap);

    // 7. Create notifications
    await createNotifications(userIdMap, propertyIdMap);

    // 8. Create favorites
    await createFavorites(userIdMap, propertyIdMap);

    // 9. Create property views
    await createPropertyViews(userIdMap, propertyIdMap);

    // 10. Create price history
    await createPriceHistory(propertyIdMap);

    // Final summary
    logSection('SEED COMPLETED SUCCESSFULLY');
    console.log('📊 Summary:');
    console.log(`   👤 Users:         ${userIdMap.size}`);
    console.log(`   📍 Zones:         ${zoneIdMap.size}`);
    console.log(`   🏠 Properties:    ${propertyIdMap.size}`);
    console.log(`   💰 Offers:        8 (+ counter-offers)`);
    console.log(`   📅 Visits:        6`);
    console.log(`   🔔 Notifications: 10`);
    console.log(`   ❤️  Favorites:     6`);
    console.log(`   👁️  Views:         50+`);
    console.log(`   📊 Price History: 3 properties\n`);

    console.log('🔑 Test Credentials:');
    console.log('   Buyers:  maria@test.com / juan@test.com / ana@test.com');
    console.log('   Sellers: carlos@test.com / laura@test.com / pedro@test.com');
    console.log('   Agents:  elena@test.com / roberto@test.com');
    console.log('   Admins:  admin1@test.com / admin2@test.com');
    console.log('   Password: Test123! (Admin123! for admins)\n');

  } catch (error) {
    console.error('\n❌ SEED FAILED:', error);
    process.exit(1);
  }
}

// Export for runner
export { clearExistingData };
export default seed;
