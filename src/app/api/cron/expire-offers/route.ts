import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// POST /api/cron/expire-offers - Cron job to expire offers (call hourly)
// Protected by CRON_SECRET header (set in Vercel Cron or similar)
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret (optional but recommended)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();

    // Call the database function to expire offers
    const { data, error } = await supabase.rpc('pricewaze_expire_offers');

    if (error) {
      console.error('Error expiring offers:', error);
      return NextResponse.json(
        { error: 'Failed to expire offers', details: error.message },
        { status: 500 }
      );
    }

    const expiredCount = data?.[0]?.expired_count || 0;

    return NextResponse.json({
      success: true,
      expired_count: expiredCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Cron expire-offers error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET endpoint for manual testing
export async function GET(request: NextRequest) {
  return POST(request);
}

