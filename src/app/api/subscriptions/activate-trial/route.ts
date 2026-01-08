import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

/**
 * POST /api/subscriptions/activate-trial
 * Activate 7-day Pro trial (Soft Launch L4)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user already has Pro access
    const { data: existingSub } = await supabase
      .from('pricewaze_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (existingSub) {
      const hasPro = await supabase.rpc('pricewaze_has_pro_access', {
        user_id_param: user.id,
      });

      if (hasPro.data) {
        return NextResponse.json({
          message: 'You already have Pro access',
          subscription: existingSub,
        });
      }
    }

    // Activate trial using database function
    const { data: subscription, error } = await supabase.rpc(
      'pricewaze_activate_pro_trial',
      {
        user_id_param: user.id,
      }
    );

    if (error) {
      logger.error('Failed to activate Pro trial', error);
      return NextResponse.json(
        { error: 'Failed to activate Pro trial' },
        { status: 500 }
      );
    }

    logger.info(`Pro trial activated for user ${user.id}`);

    return NextResponse.json({
      success: true,
      subscription,
      message: 'Pro trial activated successfully. Enjoy 7 days free!',
    });
  } catch (error) {
    logger.error('Error in activate-trial route', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

