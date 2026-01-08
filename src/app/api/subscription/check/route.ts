import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/subscription/check
 * Check if user has Pro access
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ hasPro: false }, { status: 200 });
    }

    // Check Pro access using database function
    const { data, error } = await supabase.rpc('pricewaze_has_pro_access', {
      user_id_param: user.id,
    });

    if (error) {
      console.error('Error checking Pro access:', error);
      return NextResponse.json({ hasPro: false }, { status: 200 });
    }

    return NextResponse.json({ hasPro: data === true });
  } catch (error) {
    console.error('Subscription check error:', error);
    return NextResponse.json({ hasPro: false }, { status: 200 });
  }
}

