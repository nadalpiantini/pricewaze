import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

// GET /api/conversations/[id]/messages - Get messages for a conversation
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

    // Verify user has access to conversation
    const { data: conversation } = await supabase
      .from('pricewaze_conversations')
      .select('buyer_id, seller_id')
      .eq('id', id)
      .single();

    if (!conversation || (conversation.buyer_id !== user.id && conversation.seller_id !== user.id)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Fetch messages
    const { data, error } = await supabase
      .from('pricewaze_messages')
      .select(`
        *,
        sender:pricewaze_profiles!pricewaze_messages_sender_id_fkey(id, full_name, avatar_url)
      `)
      .eq('conversation_id', id)
      .order('created_at', { ascending: true });

    if (error) {
      logger.error('Failed to fetch messages', error);
      return NextResponse.json(
        { error: 'Failed to fetch messages' },
        { status: 500 }
      );
    }

    // Mark messages as read
    await supabase
      .from('pricewaze_messages')
      .update({ read_at: new Date().toISOString() })
      .eq('conversation_id', id)
      .eq('read_at', null)
      .neq('sender_id', user.id);

    return NextResponse.json(data || []);
  } catch (error) {
    logger.error('Error in GET /api/conversations/[id]/messages', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

