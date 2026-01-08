import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { deepseekChatJSON } from '@/lib/deepseek';
import { isValidAnalysis, safeJsonParse, fallbackAnalysis } from '@/lib/copilotValidator';
import type { CopilotContext, CopilotAnalysis } from '@/types/copilot';
import { getMarketConfig, formatPrice } from '@/config/market';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { checkRateLimit } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

/**
 * POST /api/copilot/negotiate
 * Analyzes a negotiation using DeepSeek copilot
 */
export async function POST(request: NextRequest) {
  try {
    // Check feature flag
    if (!isFeatureEnabled('copilot')) {
      logger.warn('Copilot API called but feature is disabled');
      return NextResponse.json(
        { error: 'Copilot is currently disabled' },
        { status: 503 }
      );
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting (L1.1)
    const identifier = user.id;
    const rateLimitResult = checkRateLimit(identifier, '/api/copilot/negotiate');
    
    if (!rateLimitResult.allowed) {
      logger.warn(`Rate limit exceeded for user ${identifier}`);
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: 'Too many requests. Please try again later.',
          resetAt: rateLimitResult.resetAt,
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': '10',
            'X-RateLimit-Remaining': String(rateLimitResult.remaining),
            'X-RateLimit-Reset': String(rateLimitResult.resetAt),
            'Retry-After': String(Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000)),
          },
        }
      );
    }

    const body = await request.json();
    const { offer_id } = body;

    if (!offer_id) {
      return NextResponse.json(
        { error: 'offer_id is required' },
        { status: 400 }
      );
    }

    // Get offer with property
    const { data: offer, error: offerError } = await supabase
      .from('pricewaze_offers')
      .select(`
        *,
        property:pricewaze_properties(
          id, title, address, price, area_m2, price_per_m2, property_type, created_at
        )
      `)
      .eq('id', offer_id)
      .single();

    if (offerError || !offer) {
      return NextResponse.json(
        { error: 'Offer not found' },
        { status: 404 }
      );
    }

    // Only buyer or seller can analyze
    if (offer.buyer_id !== user.id && offer.seller_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check for cached analysis (last 1 hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: cached } = await supabase
      .from('pricewaze_copilot_analyses')
      .select('analysis')
      .eq('offer_id', offer_id)
      .gte('created_at', oneHourAgo)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (cached?.analysis) {
      return NextResponse.json(cached.analysis as CopilotAnalysis);
    }

    // Get offer events timeline
    const { data: events } = await supabase
      .from('pricewaze_offer_events')
      .select('*')
      .eq('offer_id', offer_id)
      .order('created_at', { ascending: true });

    // Get current signal state
    const { data: signalStates } = await supabase
      .from('pricewaze_property_signal_state')
      .select('*')
      .eq('property_id', offer.property_id)
      .gt('strength', 0);

    // Build signal snapshot (current)
    const signalSnapshotCurrent: Record<string, { strength: number; confirmed: boolean }> = {};
    signalStates?.forEach((s) => {
      signalSnapshotCurrent[s.signal_type] = {
        strength: s.strength,
        confirmed: s.confirmed,
      };
    });

    // Build timeline with signal snapshots
    const timeline = (events || []).map((e) => ({
      event_type: e.event_type,
      amount: e.amount ? Number(e.amount) : undefined,
      created_at: e.created_at,
      signal_snapshot: e.signal_snapshot || {},
    }));

    // Calculate days on market
    const daysOnMarket = Math.floor(
      (Date.now() - new Date(offer.property.created_at).getTime()) / (1000 * 60 * 60 * 24)
    );

    // Build context for LLM
    const context: CopilotContext = {
      property: {
        id: offer.property.id,
        title: offer.property.title,
        address: offer.property.address,
        price: offer.property.price,
        area_m2: offer.property.area_m2 || undefined,
        property_type: offer.property.property_type,
        created_at: offer.property.created_at,
      },
      current_offer: {
        id: offer.id,
        amount: Number(offer.amount),
        status: offer.status,
        message: offer.message || undefined,
        created_at: offer.created_at,
      },
      offer_timeline: timeline,
      signal_snapshot_current: signalSnapshotCurrent,
      market_context: {
        days_on_market: daysOnMarket,
        avg_price_m2: offer.property.price_per_m2 || undefined,
      },
    };

    // Build prompts
    const market = getMarketConfig();
    const systemPrompt = `You are PriceWaze Negotiation Copilot for the ${market.ai.marketContext}.

Rules:
- Do NOT make decisions for the user.
- Do NOT invent facts or numbers.
- Only use the provided data.
- Explain negotiation dynamics clearly.
- If data is insufficient, say so explicitly.
- Be neutral and analytical.
- Always compare scenarios, don't recommend a single path.

You MUST return valid JSON only. No markdown. No commentary. No extra text.

JSON schema:
{
  "summary": string,
  "key_factors": string[],
  "risks": string[],
  "scenarios": [
    {
      "option": string,
      "rationale": string,
      "pros": string[],
      "cons": string[]
    }
  ],
  "confidence_level": "low" | "medium" | "high"
}`;

    const userPrompt = `Analyze the following negotiation context.

Explain the negotiation by comparing these scenarios:
1. Increasing the offer.
2. Keeping the current offer.
3. Waiting without action.

For each scenario:
- Explain rationale.
- List pros and cons.

Base everything strictly on the provided data.

Context:
${JSON.stringify(context, null, 2)}`;

    // Call DeepSeek
    let rawResponse: string;
    try {
      rawResponse = await deepseekChatJSON(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        {
          model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
          temperature: 0.2,
          maxTokens: 2000,
        }
      );
    } catch (error) {
      console.error('DeepSeek API error:', error);
      // Return fallback
      const fallback = fallbackAnalysis();
      return NextResponse.json(fallback);
    }

    // Parse and validate response
    const parsed = safeJsonParse(rawResponse);
    if (!parsed || !isValidAnalysis(parsed)) {
      console.error('Invalid AI response structure:', rawResponse);
      const fallback = fallbackAnalysis();
      return NextResponse.json(fallback);
    }

    const analysis = parsed as CopilotAnalysis;

    // Save to database (async, don't wait - fire and forget)
    // Wrap in Promise.resolve to ensure proper Promise type
    Promise.resolve(
      supabase
        .from('pricewaze_copilot_analyses')
        .insert({
          offer_id,
          analysis,
          model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
          confidence_level: analysis.confidence_level,
        })
    )
      .then(({ error }) => {
        if (!error) {
          // Log for metrics
          console.log({
            offer_id,
            model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
            confidence: analysis.confidence_level,
          });
        } else {
          console.error('Error saving copilot analysis:', error);
        }
      })
      .catch((err: unknown) => {
        console.error('Error saving copilot analysis:', err);
      });

    return NextResponse.json(analysis);
  } catch (error) {
    console.error('Copilot negotiate error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

