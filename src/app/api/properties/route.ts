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
    let supabase;
    try {
      supabase = await createClient(request);
    } catch (error) {
      logger.error('Failed to create Supabase client in GET /api/properties', error);
      return NextResponse.json(
        { error: 'Database connection failed' },
        { status: 503 }
      );
    }
    
    const { searchParams } = new URL(request.url);

    // Handle special case: fetch by IDs (for favorites, etc.)
    const ids = searchParams.get('ids');
    if (ids) {
      const idList = ids.split(',').filter(id => id.trim());
      if (idList.length === 0) {
        return NextResponse.json([]);
      }

      const { data, error } = await supabase
        .from('pricewaze_properties')
        .select(`
          *,
          zone:pricewaze_zones(id, name, city, avg_price_m2),
          owner:pricewaze_profiles(id, full_name, avatar_url)
        `)
        .in('id', idList);

      if (error) {
        logger.error('Failed to fetch properties by IDs', error);
        return NextResponse.json([]);
      }

      return NextResponse.json(data || []);
    }

    // Handle special case: fetch owner's properties
    const owner = searchParams.get('owner');
    if (owner === 'me') {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return NextResponse.json({ data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0, hasMore: false } });
      }

      const { data, error, count } = await supabase
        .from('pricewaze_properties')
        .select(`
          *,
          zone:pricewaze_zones(id, name, city, avg_price_m2),
          owner:pricewaze_profiles(id, full_name, avatar_url)
        `, { count: 'exact' })
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Failed to fetch owner properties', error);
        return NextResponse.json({ data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0, hasMore: false } });
      }

      return NextResponse.json({
        data: data || [],
        pagination: {
          page: 1,
          limit: data?.length || 0,
          total: count || 0,
          totalPages: 1,
          hasMore: false,
        },
      });
    }

    // Parse and validate filters
    const rawFilters: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      if (key !== 'ids' && key !== 'owner') {
        rawFilters[key] = value;
      }
    });

    const result = propertyFiltersSchema.safeParse(rawFilters);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid filter parameters', details: result.error.issues },
        { status: 400 }
      );
    }

    const filters = result.data;

    // Pagination parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100); // Max 100 per page
    const offset = (page - 1) * limit;

    // Build query - start simple, add relations if they work
    let query = supabase
      .from('pricewaze_properties')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

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

    const { data, error, count } = await query;

    if (error) {
      logger.error('Failed to fetch properties', {
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        query: filters,
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30),
      });
      return NextResponse.json(
        { 
          error: 'Failed to fetch properties',
          message: error.message,
          code: error.code,
          details: process.env.NODE_ENV === 'development' ? {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint,
          } : undefined,
        },
        { status: 500 }
      );
    }

    // Fetch related data separately if needed (fallback if joins fail)
    let enrichedData = data || [];
    if (enrichedData.length > 0) {
      try {
        // Fetch zones and owners separately
        const zoneIds = Array.from(new Set(enrichedData.map(p => p.zone_id).filter(Boolean) as string[]));
        const ownerIds = Array.from(new Set(enrichedData.map(p => p.owner_id).filter(Boolean) as string[]));
        
        const [zonesResult, ownersResult] = await Promise.all([
          zoneIds.length > 0 
            ? supabase.from('pricewaze_zones').select('id, name, city, avg_price_m2').in('id', zoneIds)
            : Promise.resolve({ data: [], error: null }),
          ownerIds.length > 0
            ? supabase.from('pricewaze_profiles').select('id, full_name, avatar_url').in('id', ownerIds)
            : Promise.resolve({ data: [], error: null }),
        ]);

        const zonesMap = new Map((zonesResult.data || []).map(z => [z.id, z]));
        const ownersMap = new Map((ownersResult.data || []).map(o => [o.id, o]));

        enrichedData = enrichedData.map(property => ({
          ...property,
          zone: property.zone_id ? zonesMap.get(property.zone_id) || null : null,
          owner: property.owner_id ? ownersMap.get(property.owner_id) || null : null,
        }));
      } catch (enrichError) {
        logger.warn('Failed to enrich properties with relations', enrichError);
        // Continue without relations if enrichment fails
      }
    }

    // Return paginated response
    return NextResponse.json({
      data: enrichedData,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
        hasMore: (count || 0) > offset + limit,
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    logger.error('Unexpected error in GET /api/properties', {
      message: errorMessage,
      stack: errorStack,
      error: error,
    });
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      },
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
    const supabase = await createClient(request);

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
