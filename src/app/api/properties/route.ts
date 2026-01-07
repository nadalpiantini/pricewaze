import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { generateNewListingSignal } from '@/lib/alerts/generateSignals';
import { z } from 'zod';
import type { PropertyFilters } from '@/types/database';

const propertyFiltersSchema = z.object({
  zone_id: z.string().uuid().optional(),
  property_type: z.enum(['apartment', 'house', 'land', 'commercial', 'office']).optional(),
  min_price: z.coerce.number().min(0).optional(),
  max_price: z.coerce.number().min(0).optional(),
  min_area: z.coerce.number().min(0).optional(),
  max_area: z.coerce.number().min(0).optional(),
  bedrooms: z.coerce.number().int().min(0).optional(),
  bathrooms: z.coerce.number().int().min(0).optional(),
  status: z.enum(['active', 'pending', 'sold', 'inactive']).optional(),
});

// GET /api/properties - List properties with filters
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    // Parse and validate filters
    const rawFilters: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      rawFilters[key] = value;
    });

    const result = propertyFiltersSchema.safeParse(rawFilters);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid filter parameters', details: result.error.issues },
        { status: 400 }
      );
    }

    const filters = result.data;

    // Build query
    let query = supabase
      .from('pricewaze_properties')
      .select(`
        *,
        zone:pricewaze_zones(id, name, city, avg_price_m2),
        owner:pricewaze_profiles(id, full_name, avatar_url)
      `)
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.property_type) {
      query = query.eq('property_type', filters.property_type);
    }
    if (filters.zone_id) {
      query = query.eq('zone_id', filters.zone_id);
    }
    if (filters.min_price !== undefined) {
      query = query.gte('price', filters.min_price);
    }
    if (filters.max_price !== undefined) {
      query = query.lte('price', filters.max_price);
    }
    if (filters.min_area !== undefined) {
      query = query.gte('area_m2', filters.min_area);
    }
    if (filters.max_area !== undefined) {
      query = query.lte('area_m2', filters.max_area);
    }
    if (filters.bedrooms !== undefined) {
      query = query.gte('bedrooms', filters.bedrooms);
    }
    if (filters.bathrooms !== undefined) {
      query = query.gte('bathrooms', filters.bathrooms);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('Failed to fetch properties', error);
      return NextResponse.json(
        { error: 'Failed to fetch properties' },
        { status: 500 }
      );
    }

    return NextResponse.json(data || []);
  } catch (error) {
    logger.error('Unexpected error in GET /api/properties', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/properties - Create a new property
const createPropertySchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  property_type: z.enum(['apartment', 'house', 'land', 'commercial', 'office']),
  price: z.number().min(0),
  area_m2: z.number().min(0),
  bedrooms: z.number().int().min(0).optional(),
  bathrooms: z.number().int().min(0).optional(),
  parking_spaces: z.number().int().min(0).optional(),
  year_built: z.number().int().min(1800).max(new Date().getFullYear()).optional(),
  address: z.string().min(1),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  images: z.array(z.string().url()).optional(),
  features: z.array(z.string()).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse and validate body
    const body = await request.json();
    const result = createPropertySchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid property data', details: result.error.issues },
        { status: 400 }
      );
    }

    const propertyData = {
      ...result.data,
      owner_id: user.id,
      status: 'active' as const,
    };

    const { data, error } = await supabase
      .from('pricewaze_properties')
      .insert(propertyData)
      .select(`
        *,
        zone:pricewaze_zones(id, name, city, avg_price_m2),
        owner:pricewaze_profiles(id, full_name, avatar_url)
      `)
      .single();

    if (error) {
      logger.error('Failed to create property', error);
      return NextResponse.json(
        { error: 'Failed to create property' },
        { status: 500 }
      );
    }

    // Generate new listing signal (fallback if trigger doesn't work)
    if (data && data.status === 'active') {
      const zoneId = data.zone_id || null;
      generateNewListingSignal(data.id, zoneId).catch((err) => {
        logger.error('Failed to generate new listing signal', err);
      });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    logger.error('Unexpected error in POST /api/properties', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
