import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

// GET /api/conversations/[id] - Get conversation details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('pricewaze_conversations')
      .select(`
        *,
        property:pricewaze_properties(*),
        buyer:pricewaze_profiles!pricewaze_conversations_buyer_id_fkey(*),
        seller:pricewaze_profiles!pricewaze_conversations_seller_id_fkey(*)
      `)
      .eq('id', id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Verify user has access
    if (data.buyer_id !== user.id && data.seller_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    return NextResponse.json(data);
  } catch (error) {
    logger.error('Error in GET /api/conversations/[id]', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

