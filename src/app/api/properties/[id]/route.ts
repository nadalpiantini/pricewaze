import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { generatePriceDropSignal, generatePriceIncreaseSignal } from '@/lib/alerts/generateSignals';
import { z } from 'zod';

// GET /api/properties/[id] - Get single property
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('pricewaze_properties')
      .select(`
        *,
        zone:pricewaze_zones(id, name, city, avg_price_m2, total_listings),
        owner:pricewaze_profiles(id, full_name, avatar_url, phone, verified)
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Property not found' },
          { status: 404 }
        );
      }
      logger.error('Failed to fetch property', error);
      return NextResponse.json(
        { error: 'Failed to fetch property' },
        { status: 500 }
      );
    }

    // Increment view count (fire and forget)
    supabase
      .from('pricewaze_properties')
      .update({ views_count: (data.views_count || 0) + 1 })
      .eq('id', id)
      .then(() => {});

    // Track view if user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      supabase
        .from('pricewaze_property_views')
        .insert({ property_id: id, viewer_id: user.id })
        .then(() => {});

      // Evaluate Copilot alerts (fire and forget)
      fetch(`${request.nextUrl.origin}/api/copilot/property-viewed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ property_id: id }),
      }).catch((err) => {
        logger.error('Failed to evaluate Copilot alerts:', err);
      });
    }

    // Create automatic signal for high activity (views)
    supabase
      .from('pricewaze_property_signals_raw')
      .insert({
        property_id: id,
        signal_type: 'high_activity',
        source: 'system',
        // user_id and visit_id are NULL for system signals
      })
      .then(() => {});

    return NextResponse.json(data);
  } catch (error) {
    logger.error('Unexpected error in GET /api/properties/[id]', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/properties/[id] - Update property
const updatePropertySchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  property_type: z.enum(['apartment', 'house', 'land', 'commercial', 'office']).optional(),
  price: z.number().min(0).optional(),
  area_m2: z.number().min(0).optional(),
  bedrooms: z.number().int().min(0).optional(),
  bathrooms: z.number().int().min(0).optional(),
  parking_spaces: z.number().int().min(0).optional(),
  year_built: z.number().int().min(1800).max(new Date().getFullYear()).optional(),
  address: z.string().min(1).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  images: z.array(z.string().url()).optional(),
  features: z.array(z.string()).optional(),
  status: z.enum(['active', 'pending', 'sold', 'inactive']).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Verify ownership
    const { data: existingProperty } = await supabase
      .from('pricewaze_properties')
      .select('owner_id')
      .eq('id', id)
      .single();

    if (!existingProperty) {
      return NextResponse.json(
        { error: 'Property not found' },
        { status: 404 }
      );
    }

    if (existingProperty.owner_id !== user.id) {
      return NextResponse.json(
        { error: 'Not authorized to update this property' },
        { status: 403 }
      );
    }

    // Parse and validate body
    const body = await request.json();
    const result = updatePropertySchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid property data', details: result.error.issues },
        { status: 400 }
      );
    }

    // Get old price before update (if price is being changed)
    let oldPrice: number | null = null;
    if (result.data.price !== undefined) {
      const { data: oldProperty } = await supabase
        .from('pricewaze_properties')
        .select('price, zone_id')
        .eq('id', id)
        .single();
      
      if (oldProperty?.price) {
        oldPrice = oldProperty.price;
      }
    }

    const { data, error } = await supabase
      .from('pricewaze_properties')
      .update(result.data)
      .eq('id', id)
      .select(`
        *,
        zone:pricewaze_zones(id, name, city, avg_price_m2),
        owner:pricewaze_profiles(id, full_name, avatar_url)
      `)
      .single();

    if (error) {
      logger.error('Failed to update property', error);
      return NextResponse.json(
        { error: 'Failed to update property' },
        { status: 500 }
      );
    }

    // Generate market signal if price changed (fallback if trigger doesn't work)
    if (oldPrice !== null && result.data.price !== undefined && data.price && oldPrice !== data.price) {
      const zoneId = data.zone_id || null;
      if (data.price < oldPrice) {
        // Price dropped
        generatePriceDropSignal(id, zoneId, oldPrice, data.price).catch((err) => {
          logger.error('Failed to generate price drop signal', err);
        });
      } else if (data.price > oldPrice) {
        // Price increased
        generatePriceIncreaseSignal(id, zoneId, oldPrice, data.price).catch((err) => {
          logger.error('Failed to generate price increase signal', err);
        });
      }
    }

    return NextResponse.json(data);
  } catch (error) {
    logger.error('Unexpected error in PATCH /api/properties/[id]', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/properties/[id] - Delete property
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Verify ownership
    const { data: existingProperty } = await supabase
      .from('pricewaze_properties')
      .select('owner_id')
      .eq('id', id)
      .single();

    if (!existingProperty) {
      return NextResponse.json(
        { error: 'Property not found' },
        { status: 404 }
      );
    }

    if (existingProperty.owner_id !== user.id) {
      return NextResponse.json(
        { error: 'Not authorized to delete this property' },
        { status: 403 }
      );
    }

    const { error } = await supabase
      .from('pricewaze_properties')
      .delete()
      .eq('id', id);

    if (error) {
      logger.error('Failed to delete property', error);
      return NextResponse.json(
        { error: 'Failed to delete property' },
        { status: 500 }
      );
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    logger.error('Unexpected error in DELETE /api/properties/[id]', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
