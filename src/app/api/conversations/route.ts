import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const createConversationSchema = z.object({
  property_id: z.string().uuid(),
  buyer_id: z.string().uuid(),
  seller_id: z.string().uuid(),
});

// GET /api/conversations - List user's conversations
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('pricewaze_conversations')
      .select(`
        *,
        property:pricewaze_properties(id, title, images),
        buyer:pricewaze_profiles!pricewaze_conversations_buyer_id_fkey(id, full_name, avatar_url),
        seller:pricewaze_profiles!pricewaze_conversations_seller_id_fkey(id, full_name, avatar_url)
      `)
      .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
      .order('last_message_at', { ascending: false, nullsFirst: false });

    if (error) {
      logger.error('Failed to fetch conversations', error);
      return NextResponse.json(
        { error: 'Failed to fetch conversations' },
        { status: 500 }
      );
    }

    // Get unread counts for each conversation
    const conversationsWithUnread = await Promise.all(
      (data || []).map(async (conv) => {
        const { count } = await supabase
          .from('pricewaze_messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', conv.id)
          .eq('read_at', null)
          .neq('sender_id', user.id);

        return {
          ...conv,
          unread_count: count || 0,
        };
      })
    );

    return NextResponse.json(conversationsWithUnread);
  } catch (error) {
    logger.error('Error in GET /api/conversations', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/conversations - Create new conversation
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const result = createConversationSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: result.error.issues },
        { status: 400 }
      );
    }

    const { property_id, buyer_id, seller_id } = result.data;

    // Verify user is either buyer or seller
    if (user.id !== buyer_id && user.id !== seller_id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Check if conversation already exists
    const { data: existing } = await supabase
      .from('pricewaze_conversations')
      .select('id')
      .eq('property_id', property_id)
      .eq('buyer_id', buyer_id)
      .eq('seller_id', seller_id)
      .single();

    if (existing) {
      return NextResponse.json(existing);
    }

    // Create conversation
    const { data, error } = await supabase
      .from('pricewaze_conversations')
      .insert({
        property_id,
        buyer_id,
        seller_id,
      })
      .select()
      .single();

    if (error) {
      logger.error('Failed to create conversation', error);
      return NextResponse.json(
        { error: 'Failed to create conversation' },
        { status: 500 }
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    logger.error('Error in POST /api/conversations', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

