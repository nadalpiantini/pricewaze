import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const createMessageSchema = z.object({
  conversation_id: z.string().uuid(),
  content: z.string().min(1).max(5000),
  message_type: z.enum(['text', 'image', 'file', 'offer_link', 'visit_link']).default('text'),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
});

// POST /api/messages - Send a message
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const result = createMessageSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: result.error.issues },
        { status: 400 }
      );
    }

    const { conversation_id, content, message_type, metadata } = result.data;

    // Verify user has access to conversation
    const { data: conversation } = await supabase
      .from('pricewaze_conversations')
      .select('buyer_id, seller_id')
      .eq('id', conversation_id)
      .single();

    if (!conversation || (conversation.buyer_id !== user.id && conversation.seller_id !== user.id)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Create message
    const { data, error } = await supabase
      .from('pricewaze_messages')
      .insert({
        conversation_id,
        sender_id: user.id,
        content,
        message_type,
        metadata: metadata || null,
      })
      .select()
      .single();

    if (error) {
      logger.error('Failed to send message', error);
      return NextResponse.json(
        { error: 'Failed to send message' },
        { status: 500 }
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    logger.error('Error in POST /api/messages', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

