import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import OpenAI from 'openai';
import { buildCopilotChatV2SystemPrompt } from '@/prompts/copilot/CopilotChat.v2';

// Lazy-load client
let deepseek: OpenAI | null = null;

function getClient(): OpenAI {
  if (!deepseek) {
    deepseek = new OpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseURL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
    });
  }
  return deepseek;
}

const MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat';

/**
 * POST /api/copilot/chat
 * 
 * Chat conversacional con el Copilot
 * 
 * Body:
 * {
 *   question: string
 *   property_id?: string
 *   offer_id?: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { question, property_id, offer_id } = body;

    if (!question || typeof question !== 'string') {
      return NextResponse.json(
        { error: 'question is required' },
        { status: 400 }
      );
    }

    // Obtener contexto de la propiedad si existe
    let propertyContext = null;
    if (property_id) {
      const { data: property } = await supabase
        .from('pricewaze_properties')
        .select('id, title, price, address, area_m2, property_type, zone_id')
        .eq('id', property_id)
        .single();

      if (property) {
        // Obtener insights de la propiedad
        const { data: insights } = await supabase
          .from('pricewaze_property_insights')
          .select('*')
          .eq('property_id', property_id)
          .single();

        // Obtener zona
        let zoneName = 'Unknown Zone';
        if (property.zone_id) {
          const { data: zone } = await supabase
            .from('pricewaze_zones')
            .select('name')
            .eq('id', property.zone_id)
            .single();
          if (zone) zoneName = zone.name;
        }

        propertyContext = {
          ...property,
          zoneName,
          insights: insights || {},
        };
      }
    }

    // Use v2 prompt
    const systemPrompt = buildCopilotChatV2SystemPrompt({
      question,
      propertyContext: propertyContext ? {
        title: propertyContext.title,
        price: propertyContext.price,
        address: propertyContext.address,
        zoneName: propertyContext.zoneName,
        area_m2: propertyContext.area_m2,
        property_type: propertyContext.property_type,
        insights: propertyContext.insights,
      } : undefined,
    });

    const userPrompt = question;

    // Llamar a DeepSeek
    const response = await getClient().chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const answer = response.choices[0]?.message?.content || 'No pude generar una respuesta.';

    // Log de la interacción (opcional, para analytics)
    await supabase.from('pricewaze_ai_logs').insert({
      user_id: user.id,
      context: 'copilot_chat',
      input_text: question,
      output_text: answer,
      latency_ms: response.usage?.total_tokens ? 0 : 0, // TODO: calcular latency real
      metadata: {
        property_id: property_id || null,
        offer_id: offer_id || null,
        model: MODEL,
      },
    });

    return NextResponse.json({
      success: true,
      answer,
      metadata: {
        property_id: property_id || null,
        offer_id: offer_id || null,
      },
    });
  } catch (error) {
    console.error('Copilot chat POST error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

