/**
 * Prompt Metrics System
 * 
 * Tracks metrics for prompt performance and A/B testing
 */

export type ConfidenceLevel = 'low' | 'medium' | 'high';
export type UserAction = 'followed_analysis' | 'ignored' | 'overrode' | 'asked_why' | 'follow_up';

export interface PromptMetrics {
  prompt_name: string;
  prompt_version: string;
  user_id: string;
  confidence_level?: ConfidenceLevel;
  latency_ms: number;
  null_fields?: string[];
  json_parse_error?: boolean;
  user_action?: UserAction;
  decision_alignment_score?: number; // -1, 0, or 1
  context?: {
    property_id?: string;
    offer_id?: string;
    market?: string;
  };
  timestamp: string;
}

/**
 * Calculate Decision Alignment Score (DAS)
 * 
 * +1: User followed the analysis
 * 0: User ignored
 * -1: User did the opposite
 */
export function calculateDAS(action: UserAction): number {
  switch (action) {
    case 'followed_analysis':
      return 1;
    case 'ignored':
      return 0;
    case 'overrode':
      return -1;
    default:
      return 0;
  }
}

/**
 * Log prompt metrics
 * 
 * This would integrate with your analytics system
 */
export async function logPromptMetrics(metrics: PromptMetrics): Promise<void> {
  // In production, this would send to your analytics backend
  // For now, we'll log to console and could store in Supabase
  
  const das = metrics.decision_alignment_score ?? 
    (metrics.user_action ? calculateDAS(metrics.user_action) : undefined);

  const logEntry = {
    ...metrics,
    decision_alignment_score: das,
  };

  // Log to console (in production, send to analytics)
  console.log('[Prompt Metrics]', JSON.stringify(logEntry, null, 2));

  // TODO: Send to Supabase table `pricewaze_prompt_metrics`
  // await supabase.from('pricewaze_prompt_metrics').insert(logEntry);
}

/**
 * Aggregate metrics for a prompt version
 */
export interface AggregatedMetrics {
  prompt_name: string;
  version: string;
  total_calls: number;
  avg_latency_ms: number;
  avg_confidence: number;
  null_field_ratio: number;
  json_error_rate: number;
  avg_das: number;
  override_rate: number;
  follow_up_rate: number;
}

/**
 * Calculate aggregated metrics from raw metrics
 */
export function aggregateMetrics(
  metrics: PromptMetrics[]
): AggregatedMetrics | null {
  if (metrics.length === 0) {
    return null;
  }

  const first = metrics[0];
  const total = metrics.length;

  const latencies = metrics.map(m => m.latency_ms).filter(Boolean);
  const confidences = metrics
    .map(m => {
      if (m.confidence_level === 'high') return 3;
      if (m.confidence_level === 'medium') return 2;
      if (m.confidence_level === 'low') return 1;
      return null;
    })
    .filter((v): v is 1 | 2 | 3 => v !== null);

  const nullFields = metrics.filter(m => 
    m.null_fields && m.null_fields.length > 0
  ).length;

  const jsonErrors = metrics.filter(m => m.json_parse_error).length;
  const dasScores = metrics
    .map(m => m.decision_alignment_score)
    .filter((v): v is number => v !== null && v !== undefined);

  const overrides = metrics.filter(m => m.user_action === 'overrode').length;
  const followUps = metrics.filter(m => m.user_action === 'follow_up').length;

  return {
    prompt_name: first.prompt_name,
    version: first.prompt_version,
    total_calls: total,
    avg_latency_ms: latencies.length > 0 
      ? latencies.reduce((a, b) => a + b, 0) / latencies.length 
      : 0,
    avg_confidence: confidences.length > 0
      ? confidences.reduce((a, b) => a + b, 0) / confidences.length
      : 0,
    null_field_ratio: nullFields / total,
    json_error_rate: jsonErrors / total,
    avg_das: dasScores.length > 0
      ? dasScores.reduce((a, b) => a + b, 0) / dasScores.length
      : 0,
    override_rate: overrides / total,
    follow_up_rate: followUps / total,
  };
}

