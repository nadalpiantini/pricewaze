import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import OpenAI from 'openai';
import { z } from 'zod';
import { buildCopilotChatV2SystemPrompt } from '@/prompts/copilot/CopilotChat.v2';
import { Errors, ErrorCodes, apiError } from '@/lib/api/errors';

// Zod schema for input validation
const copilotChatSchema = z.object({
  question: z.string()
    .min(1, 'Question is required')
    .max(2000, 'Question must be less than 2000 characters'),
  property_id: z.string().uuid('Invalid property ID format').optional(),
  offer_id: z.string().uuid('Invalid offer ID format').optional(),
});

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
      return Errors.unauthorized();
    }

    const body = await request.json();

    // Validate input with Zod
    const parseResult = copilotChatSchema.safeParse(body);
    if (!parseResult.success) {
      return Errors.validationFailed(parseResult.error.flatten().fieldErrors as Record<string, unknown>);
    }

    const { question, property_id, offer_id } = parseResult.data;

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

    // Llamar a DeepSeek with latency tracking
    const startTime = performance.now();
    const response = await getClient().chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });
    const endTime = performance.now();
    const latencyMs = Math.round(endTime - startTime);

    const answer = response.choices[0]?.message?.content || 'No pude generar una respuesta.';

    // Log de la interacción with real latency
    await supabase.from('pricewaze_ai_logs').insert({
      user_id: user.id,
      context: 'copilot_chat',
      input_text: question,
      output_text: answer,
      latency_ms: latencyMs,
      metadata: {
        property_id: property_id || null,
        offer_id: offer_id || null,
        model: MODEL,
        tokens_used: response.usage?.total_tokens || null,
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
    return apiError(
      error instanceof Error ? error.message : 'AI service error',
      ErrorCodes.AI_001,
      500
    );
  }
}

