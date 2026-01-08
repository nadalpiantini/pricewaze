/**
 * Negotiation Coherence Engine - Calculation Logic
 * Deterministic, explainable, Waze-style recalculation
 */

import type {
  NegotiationEvent,
  AlignmentState,
  RhythmState,
  FrictionLevel,
  MarketPressure,
  FrictionType,
  DominantFriction,
  ResponseTrend,
  ConcessionPattern,
  VisitActivity,
  CompetingOffers,
  SignalPressure,
  VelocityState,
  FocusArea,
  NegotiationOption,
} from '@/types/negotiation-coherence';

interface MarketContext {
  visit_activity: VisitActivity;
  competing_offers: CompetingOffers;
  signal_pressure: SignalPressure;
  velocity_state: VelocityState;
}

interface PreviousSnapshot {
  alignment_state: AlignmentState;
  rhythm_state: RhythmState;
  friction_level: FrictionLevel;
  market_pressure: MarketPressure;
}

interface CalculationInput {
  currentEvent: NegotiationEvent;
  previousEvents: NegotiationEvent[];
  marketContext: MarketContext;
  previousSnapshot: PreviousSnapshot | null;
}

interface CalculationResult {
  alignment_state: AlignmentState;
  rhythm_state: RhythmState;
  friction_level: FrictionLevel;
  market_pressure: MarketPressure;
  coherence_score: number;
  friction: {
    price_friction: FrictionType;
    timeline_friction: FrictionType;
    terms_friction: FrictionType;
    dominant_friction: DominantFriction;
  };
  rhythm: {
    avg_response_time_hours: number | null;
    response_trend: ResponseTrend | null;
    concession_pattern: ConcessionPattern | null;
  };
  focus_area: FocusArea;
  insight: {
    summary: string;
    options: NegotiationOption[];
  };
  should_alert: {
    rhythm_slowing: boolean;
    alignment_deteriorating: boolean;
    pressure_increasing: boolean;
  };
}

const SMALL_PRICE_THRESHOLD = 0.02; // 2% change is "small"

/**
 * Calculate friction levels
 */
function calculateFriction(
  currentEvent: NegotiationEvent,
  previousEvents: NegotiationEvent[]
): {
  price_friction: FrictionType;
  timeline_friction: FrictionType;
  terms_friction: FrictionType;
  dominant_friction: DominantFriction;
} {
  const priceEvents = Array.isArray(previousEvents) 
    ? previousEvents.filter(e => e.price !== null)
    : [];
  const previousPriceEvent = priceEvents.length > 0 ? priceEvents.slice(-1)[0] : undefined;

  let price_friction: FrictionType = 'none';
  if (currentEvent.price !== null && previousPriceEvent && previousPriceEvent.price !== null) {
    const priceDelta = Math.abs(currentEvent.price - previousPriceEvent.price);
    const pricePercent = previousPriceEvent.price > 0
      ? priceDelta / previousPriceEvent.price
      : 0;

    if (priceDelta === 0) {
      price_friction = 'high';
    } else if (pricePercent < SMALL_PRICE_THRESHOLD) {
      price_friction = 'medium';
    } else {
      price_friction = 'low';
    }
  }

  // Timeline friction: if closing_date unchanged or moved away from preference
  let timeline_friction: FrictionType = 'low';
  if (currentEvent.closing_date && previousEvents.length > 0) {
    const prevEvent = previousEvents[previousEvents.length - 1];
    if (prevEvent.closing_date === currentEvent.closing_date) {
      timeline_friction = 'medium';
    }
  }

  // Terms friction: if contingencies added
  let terms_friction: FrictionType = 'low';
  if (currentEvent.contingencies && currentEvent.contingencies.length > 0) {
    const prevEvent = previousEvents[previousEvents.length - 1];
    if (prevEvent.contingencies) {
      const newContingencies = currentEvent.contingencies.filter(
        c => !prevEvent.contingencies!.includes(c)
      );
      if (newContingencies.length > 0) {
        terms_friction = 'high';
      }
    }
  }

  // Dominant friction
  const frictions = [
    { type: 'price' as const, level: price_friction },
    { type: 'timeline' as const, level: timeline_friction },
    { type: 'terms' as const, level: terms_friction },
  ];

  const highFrictions = frictions.filter(f => f.level === 'high');
  const mediumFrictions = frictions.filter(f => f.level === 'medium');

  let dominant_friction: DominantFriction;
  if (highFrictions.length > 1) {
    dominant_friction = 'mixed';
  } else if (highFrictions.length === 1) {
    dominant_friction = highFrictions[0].type;
  } else if (mediumFrictions.length > 0) {
    dominant_friction = mediumFrictions[0].type;
  } else {
    dominant_friction = 'price'; // default
  }

  return {
    price_friction,
    timeline_friction,
    terms_friction,
    dominant_friction,
  };
}

/**
 * Calculate rhythm state
 */
function calculateRhythm(
  currentEvent: NegotiationEvent,
  previousEvents: NegotiationEvent[]
): {
  avg_response_time_hours: number | null;
  response_trend: ResponseTrend | null;
  concession_pattern: ConcessionPattern | null;
} {
  if (previousEvents.length < 2) {
    return {
      avg_response_time_hours: null,
      response_trend: null,
      concession_pattern: null,
    };
  }

  // Calculate response times
  const responseTimes: number[] = [];
  for (let i = 1; i < previousEvents.length; i++) {
    const timeDiff = new Date(previousEvents[i].created_at).getTime() -
      new Date(previousEvents[i - 1].created_at).getTime();
    responseTimes.push(timeDiff / (1000 * 60 * 60)); // hours
  }

  const currentTimeDiff = new Date(currentEvent.created_at).getTime() -
    new Date(previousEvents[previousEvents.length - 1].created_at).getTime();
  const currentResponseTime = currentTimeDiff / (1000 * 60 * 60);

  const avgResponseTime = responseTimes.length > 0
    ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
    : null;

  let response_trend: ResponseTrend | null = null;
  if (avgResponseTime !== null && Array.isArray(responseTimes) && responseTimes.length >= 2) {
    const recentSlice = responseTimes.slice(-3);
    const recentAvg = recentSlice.length > 0 
      ? recentSlice.reduce((a, b) => a + b, 0) / Math.min(3, responseTimes.length)
      : 0;
    if (currentResponseTime < recentAvg * 0.8) {
      response_trend = 'faster';
    } else if (currentResponseTime > recentAvg * 1.2) {
      response_trend = 'slower';
    } else {
      response_trend = 'stable';
    }
  }

  // Concession pattern
  const priceEventsArray = Array.isArray(previousEvents)
    ? previousEvents.filter(e => e.price !== null)
    : [];
  const priceEvents = priceEventsArray.slice(-3);
  let concession_pattern: ConcessionPattern | null = null;

  if (priceEvents.length >= 2) {
    const deltas: number[] = [];
    for (let i = 1; i < priceEvents.length; i++) {
      const prevPrice = priceEvents[i - 1].price;
      const currPrice = priceEvents[i].price;
      if (prevPrice !== null && currPrice !== null) {
        deltas.push(Math.abs(currPrice - prevPrice));
      }
    }

    if (deltas.length >= 2) {
      const isDecreasing = deltas.every((d, i) => i === 0 || d <= deltas[i - 1] * 0.9);
      const isConsistent = deltas.every((d, i) => i === 0 || Math.abs(d - deltas[0]) / deltas[0] < 0.2);

      if (isDecreasing && deltas[deltas.length - 1] < deltas[0] * 0.5) {
        concession_pattern = 'stalled';
      } else if (isConsistent) {
        concession_pattern = 'consistent';
      } else {
        concession_pattern = 'erratic';
      }
    }
  }

  return {
    avg_response_time_hours: avgResponseTime,
    response_trend,
    concession_pattern,
  };
}

/**
 * Calculate alignment state
 */
function calculateAlignment(
  friction: ReturnType<typeof calculateFriction>,
  rhythm: ReturnType<typeof calculateRhythm>,
  previousSnapshot: PreviousSnapshot | null
): AlignmentState {
  const dominantFrictionLevel = friction.dominant_friction === 'price'
    ? friction.price_friction
    : friction.dominant_friction === 'timeline'
    ? friction.timeline_friction
    : friction.terms_friction;

  const frictionImproved = previousSnapshot
    ? (previousSnapshot.friction_level === 'high' && dominantFrictionLevel !== 'high') ||
      (previousSnapshot.friction_level === 'medium' && dominantFrictionLevel === 'low')
    : false;

  const patternConsistent = rhythm.concession_pattern === 'consistent';

  if (frictionImproved && patternConsistent) {
    return 'improving';
  } else if (dominantFrictionLevel === 'high' || rhythm.concession_pattern === 'stalled') {
    return 'deteriorating';
  } else {
    return 'stable';
  }
}

/**
 * Calculate market pressure
 */
function calculateMarketPressure(marketContext: MarketContext): MarketPressure {
  if (marketContext.competing_offers === 'many' || marketContext.visit_activity === 'high') {
    return 'increasing';
  } else if (marketContext.competing_offers === 'some' || marketContext.visit_activity === 'medium') {
    return 'medium';
  } else {
    return 'low';
  }
}

/**
 * Calculate rhythm state from response times
 */
function calculateRhythmState(
  rhythm: ReturnType<typeof calculateRhythm>
): RhythmState {
  if (!rhythm.response_trend) {
    return 'normal';
  }

  if (rhythm.response_trend === 'faster') {
    return 'fast';
  } else if (rhythm.response_trend === 'slower') {
    return 'slowing';
  } else {
    return 'normal';
  }
}

/**
 * Generate insight summary and options
 */
function generateInsight(
  alignment: AlignmentState,
  rhythm: RhythmState,
  _friction: ReturnType<typeof calculateFriction>,
  _marketPressure: MarketPressure
): {
  summary: string;
  options: NegotiationOption[];
} {
  let summary = '';
  const options: NegotiationOption[] = [];

  if (alignment === 'deteriorating' && rhythm === 'slowing') {
    summary = 'Negotiation is losing alignment as responses slow, indicating growing friction.';
    options.push(
      {
        label: 'Shift focus to price',
        pros: ['May restore alignment faster'],
        cons: ['Reduces remaining margin'],
      },
      {
        label: 'Adjust non-price terms',
        pros: ['Preserves price discipline'],
        cons: ['Less effective under current pressure'],
      }
    );
  } else if (alignment === 'stable' && rhythm === 'slowing') {
    summary = 'Progress has slowed. Misalignment may increase without a change in approach.';
    options.push(
      {
        label: 'Improve price slightly',
        pros: ['Addresses seller sensitivity'],
        cons: ['Reduces margin'],
      },
      {
        label: 'Pause briefly',
        pros: ['Allows market signals to clarify'],
        cons: ['Risk increases if pressure continues'],
      }
    );
  } else if (alignment === 'improving') {
    summary = 'Negotiation is progressing smoothly. Current adjustments are improving alignment.';
    options.push(
      {
        label: 'Continue current approach',
        pros: ['Momentum is positive'],
        cons: ['May need adjustment if conditions change'],
      }
    );
  } else {
    summary = 'Negotiation status is stable. Monitor market signals for changes.';
  }

  return { summary, options };
}

/**
 * Main calculation function
 */
export function calculateNCEState(input: CalculationInput): CalculationResult {
  const { currentEvent, previousEvents, marketContext, previousSnapshot } = input;

  // Calculate friction
  const friction = calculateFriction(currentEvent, previousEvents);

  // Calculate rhythm
  const rhythm = calculateRhythm(currentEvent, previousEvents);

  // Calculate alignment
  const alignment_state = calculateAlignment(friction, rhythm, previousSnapshot);

  // Calculate market pressure
  const market_pressure = calculateMarketPressure(marketContext);

  // Calculate rhythm state
  const rhythm_state = calculateRhythmState(rhythm);

  // Determine friction level
  const friction_level: FrictionLevel =
    friction.dominant_friction === 'price' && friction.price_friction === 'high'
      ? 'high'
      : friction.dominant_friction === 'price' && friction.price_friction === 'medium'
      ? 'medium'
      : friction.dominant_friction === 'timeline' && friction.timeline_friction === 'high'
      ? 'high'
      : friction.dominant_friction === 'terms' && friction.terms_friction === 'high'
      ? 'high'
      : 'low';

  // Coherence score (internal, not shown)
  const coherence_score =
    (alignment_state === 'improving' ? 0.7 : alignment_state === 'stable' ? 0.5 : 0.3) +
    (rhythm_state === 'fast' ? 0.2 : rhythm_state === 'normal' ? 0.1 : 0) -
    (friction_level === 'high' ? 0.3 : friction_level === 'medium' ? 0.15 : 0) -
    (market_pressure === 'increasing' ? 0.2 : market_pressure === 'medium' ? 0.1 : 0);

  // Focus area
  const focus_area: FocusArea = friction.dominant_friction === 'price'
    ? 'price'
    : friction.dominant_friction === 'timeline'
    ? 'timeline'
    : 'terms';

  // Generate insight
  const insight = generateInsight(alignment_state, rhythm_state, friction, market_pressure);

  // Alert conditions
  const should_alert = {
    rhythm_slowing: rhythm_state === 'slowing' && previousSnapshot?.rhythm_state !== 'slowing',
    alignment_deteriorating:
      alignment_state === 'deteriorating' && previousSnapshot?.alignment_state !== 'deteriorating',
    pressure_increasing:
      market_pressure === 'increasing' &&
      alignment_state !== 'improving' &&
      previousSnapshot?.market_pressure !== 'increasing',
  };

  return {
    alignment_state,
    rhythm_state,
    friction_level,
    market_pressure,
    coherence_score,
    friction,
    rhythm,
    focus_area,
    insight,
    should_alert,
  };
}

