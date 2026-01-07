import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/demo/properties - Get demo properties for onboarding
// I.2 Demo data inteligente: 3 propiedades con diferentes estados de presión
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get 3 properties with different pressure states
    // 1. Property with high competition (🥊)
    // 2. Property with negative signals (🔊💧)
    // 3. Property "clean" (no signals)

    const { data: properties, error } = await supabase
      .from('pricewaze_properties')
      .select(`
        *,
        zone:pricewaze_zones(id, name, avg_price_m2)
      `)
      .eq('status', 'active')
      .limit(10)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching demo properties:', error);
      return NextResponse.json({ error: 'Failed to fetch properties' }, { status: 500 });
    }

    if (!properties || properties.length === 0) {
      return NextResponse.json([]);
    }

    // Get signal states for all properties
    const propertyIds = properties.map((p) => p.id);
    const { data: signalStates } = await supabase
      .from('pricewaze_property_signal_state')
      .select('property_id, signal_type, strength, confirmed')
      .in('property_id', propertyIds);

    // Get active offers count for each property
    const { data: offers } = await supabase
      .from('pricewaze_offers')
      .select('property_id, status')
      .in('property_id', propertyIds)
      .in('status', ['pending', 'countered']);

    // Categorize properties
    const propertiesWithMetadata = properties.map((property) => {
      const signals = signalStates?.filter((s) => s.property_id === property.id) || [];
      const activeOffers = offers?.filter((o) => o.property_id === property.id).length || 0;

      const hasCompetition = activeOffers >= 2;
      const hasNegativeSignals = signals.some(
        (s) => s.confirmed && ['noise', 'humidity', 'price_issue'].includes(s.signal_type)
      );
      const isClean = signals.length === 0 && activeOffers === 0;

      return {
        ...property,
        _demo_category: hasCompetition
          ? 'competition'
          : hasNegativeSignals
          ? 'negative_signals'
          : isClean
          ? 'clean'
          : 'normal',
        _active_offers: activeOffers,
        _signals_count: signals.length,
      };
    });

    // Select one of each category
    const competitionProperty = propertiesWithMetadata.find((p) => p._demo_category === 'competition');
    const negativeSignalsProperty = propertiesWithMetadata.find(
      (p) => p._demo_category === 'negative_signals'
    );
    const cleanProperty = propertiesWithMetadata.find((p) => p._demo_category === 'clean');

    // Fallback: if we don't have all categories, use first 3 properties
    const demoProperties = [
      competitionProperty || propertiesWithMetadata[0],
      negativeSignalsProperty || propertiesWithMetadata[1] || propertiesWithMetadata[0],
      cleanProperty || propertiesWithMetadata[2] || propertiesWithMetadata[0],
    ].filter(Boolean).slice(0, 3);

    // Remove metadata before returning
    const cleaned = demoProperties.map(({ _demo_category, _active_offers, _signals_count, ...rest }) => rest);

    return NextResponse.json(cleaned);
  } catch (error) {
    console.error('Demo properties GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

