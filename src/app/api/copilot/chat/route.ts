import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import OpenAI from 'openai';

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

    // Construir prompt con contexto
    let systemPrompt = `Eres el Copilot de PriceWaze, un asistente inmobiliario experto. 
Ayudas a usuarios a tomar mejores decisiones sobre propiedades, ofertas y negociaciones.

Siempre:
- Explica el "por qué", no solo el "qué"
- Cita datos reales cuando los tengas
- Sugiere acciones concretas
- Sé conversacional pero profesional
- Responde en español`;

    let userPrompt = question;

    if (propertyContext) {
      systemPrompt += `\n\nContexto de la propiedad:
- Título: ${propertyContext.title}
- Precio: $${propertyContext.price.toLocaleString()}
- Dirección: ${propertyContext.address}
- Zona: ${propertyContext.zoneName}
- Área: ${propertyContext.area_m2 || 'N/A'} m²
- Tipo: ${propertyContext.property_type}

${propertyContext.insights.fairness_score ? `- Fairness Score: ${propertyContext.insights.fairness_score}/100` : ''}
${propertyContext.insights.overprice_pct ? `- Sobreprecio: ${propertyContext.insights.overprice_pct}%` : ''}
${propertyContext.insights.underprice_pct ? `- Subprecio: ${propertyContext.insights.underprice_pct}%` : ''}`;
    }

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

