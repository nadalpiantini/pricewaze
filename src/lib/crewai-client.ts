/**
 * CrewAI Client - Integration with PriceWaze CrewAI backend
 *
 * This client provides typed access to the multi-agent AI analysis system.
 * Includes robust error handling, timeouts, and graceful degradation.
 */

import { logger } from '@/lib/logger';

// Configuration
const CREWAI_BASE_URL = process.env.CREWAI_API_URL || 'http://localhost:8000';
const DEFAULT_TIMEOUT_MS = 30000; // 30 seconds
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;

// ============================================================================
// ERROR TYPES
// ============================================================================

export class CrewAIError extends Error {
  constructor(
    message: string,
    public readonly code: CrewAIErrorCode,
    public readonly statusCode?: number,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'CrewAIError';
  }
}

export enum CrewAIErrorCode {
  CONNECTION_FAILED = 'CONNECTION_FAILED',
  TIMEOUT = 'TIMEOUT',
  SERVER_ERROR = 'SERVER_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  UNKNOWN = 'UNKNOWN',
}

// Types
export interface PricingAnalysisRequest {
  property_id: string;
  zone_id?: string;
}

export interface BuyerAdviceRequest {
  property_id: string;
  buyer_budget?: number;
}

export interface SellerAdviceRequest {
  property_id: string;
  offer_amount: number;
  offer_message?: string;
}

export interface ContractParty {
  name: string;
  email?: string;
  id_number?: string;
}

export interface ContractGenerationRequest {
  property_id: string;
  buyer: ContractParty;
  seller: ContractParty;
  property_address: string;
  agreed_price: number;
  deposit_percent?: number;
  closing_days?: number;
  special_conditions?: string[];
}

export interface FullAnalysisRequest {
  property_id: string;
  buyer_budget?: number;
  generate_contract?: boolean;
  buyer_name?: string;
  seller_name?: string;
}

export interface TaskOutput {
  task: string;
  output: string | null;
}

export interface SpecialistReport {
  specialist: string;
  task: string;
  output: string | null;
}

export interface PricingAnalysisResponse {
  property_id: string;
  zone_id: string | null;
  analysis_type: string;
  result: string;
  tasks_output: TaskOutput[];
}

export interface NegotiationAdviceResponse {
  property_id: string;
  advice_type: string;
  buyer_budget?: number;
  offer_amount?: number;
  result: string;
  tasks_output: TaskOutput[];
}

export interface ContractResponse {
  property_id: string;
  buyer: string;
  seller: string;
  agreed_price: number;
  deposit_amount: number;
  contract_draft: string;
  full_analysis: string;
  tasks_output: TaskOutput[];
}

export interface FullAnalysisResponse {
  property_id: string;
  analysis_type: string;
  buyer_budget: number | null;
  contract_requested: boolean;
  executive_summary: string;
  specialist_reports: SpecialistReport[];
  agents_used: string[];
}

export interface AsyncJobResponse {
  job_id: string;
  status: string;
  check_url: string;
  estimated_time?: string;
}

export interface JobResult<T> {
  status: 'processing' | 'completed' | 'failed';
  result?: T;
  error?: string;
  started_at?: string;
  completed_at?: string;
}

export interface NegotiationPowerResult {
  property_id: string;
  success: boolean;
  negotiation_power: {
    score: number;
    label: string;
    factors: Array<{
      factor: string;
      value: string | number;
      impact: string;
      weight: number;
      score_adjustment: number;
      explanation: string;
    }>;
    recommendation: string;
  };
}

export interface QuickPricingResult {
  property_id: string;
  quick_assessment: {
    target_price: number;
    target_price_per_m2: number;
    market_avg_price_per_m2: number;
    fairness_label: string;
    fairness_score: number;
    estimated_fair_value: number;
  };
  property_price: number;
  property_area_m2: number;
  comparables_count: number;
}

export interface OfferSuggestions {
  property_id: string;
  listing_price: number;
  offers: {
    aggressive: { amount: number; discount_percent: number; risk: string };
    balanced: { amount: number; discount_percent: number; risk: string };
    conservative: { amount: number; discount_percent: number; risk: string };
  };
  buyer_budget?: number;
  warning?: string;
  note?: string;
}

// API Client class
class CrewAIClient {
  private baseUrl: string;
  private isAvailable: boolean | null = null;
  private lastHealthCheck: number = 0;
  private readonly healthCheckInterval = 60000; // 1 minute

  constructor(baseUrl: string = CREWAI_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Check if CrewAI service is available
   */
  async checkAvailability(): Promise<boolean> {
    const now = Date.now();
    if (this.isAvailable !== null && now - this.lastHealthCheck < this.healthCheckInterval) {
      return this.isAvailable;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${this.baseUrl}/health`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      this.isAvailable = response.ok;
      this.lastHealthCheck = now;
      return this.isAvailable;
    } catch {
      this.isAvailable = false;
      this.lastHealthCheck = now;
      return false;
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    config: { timeoutMs?: number; retries?: number } = {}
  ): Promise<T> {
    const { timeoutMs = DEFAULT_TIMEOUT_MS, retries = MAX_RETRIES } = config;
    const url = `${this.baseUrl}${endpoint}`;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        // Create abort controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            ...options.headers,
          },
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorBody = await response.json().catch(() => ({ detail: 'Unknown error' }));
          const errorMessage = errorBody.detail || `API error: ${response.status}`;

          // Determine error code based on status
          let code = CrewAIErrorCode.UNKNOWN;
          if (response.status === 404) code = CrewAIErrorCode.NOT_FOUND;
          else if (response.status === 400 || response.status === 422) code = CrewAIErrorCode.VALIDATION_ERROR;
          else if (response.status === 503) code = CrewAIErrorCode.SERVICE_UNAVAILABLE;
          else if (response.status >= 500) code = CrewAIErrorCode.SERVER_ERROR;

          // Don't retry client errors (4xx except 429)
          if (response.status >= 400 && response.status < 500 && response.status !== 429) {
            throw new CrewAIError(errorMessage, code, response.status, errorBody);
          }

          lastError = new CrewAIError(errorMessage, code, response.status, errorBody);
        } else {
          // Mark service as available on success
          this.isAvailable = true;
          this.lastHealthCheck = Date.now();
          return response.json();
        }
      } catch (error) {
        if (error instanceof CrewAIError) {
          throw error;
        }

        if (error instanceof Error) {
          if (error.name === 'AbortError') {
            lastError = new CrewAIError(
              `Request timed out after ${timeoutMs}ms`,
              CrewAIErrorCode.TIMEOUT
            );
          } else if (error.message.includes('fetch') || error.message.includes('network')) {
            this.isAvailable = false;
            lastError = new CrewAIError(
              `Failed to connect to CrewAI service at ${this.baseUrl}`,
              CrewAIErrorCode.CONNECTION_FAILED,
              undefined,
              { originalError: error.message }
            );
          } else {
            lastError = new CrewAIError(
              error.message,
              CrewAIErrorCode.UNKNOWN,
              undefined,
              { originalError: error.message }
            );
          }
        }
      }

      // Wait before retry (except on last attempt)
      if (attempt < retries) {
        const delay = RETRY_DELAY_MS * Math.pow(2, attempt); // Exponential backoff
        logger.warn(`CrewAI request failed, retrying in ${delay}ms (attempt ${attempt + 1}/${retries})`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    // All retries exhausted
    throw lastError || new CrewAIError('Request failed after retries', CrewAIErrorCode.UNKNOWN);
  }

  /**
   * Safe request wrapper that returns null on failure instead of throwing
   */
  private async safeRequest<T>(
    endpoint: string,
    options: RequestInit = {},
    config: { timeoutMs?: number; retries?: number } = {}
  ): Promise<T | null> {
    try {
      return await this.request<T>(endpoint, options, config);
    } catch (error) {
      if (error instanceof CrewAIError) {
        logger.warn(`CrewAI ${endpoint} failed: ${error.message} (${error.code})`);
      } else {
        logger.warn(`CrewAI ${endpoint} failed:`, error);
      }
      return null;
    }
  }

  // Health check
  async healthCheck(): Promise<{ status: string; model: string }> {
    return this.request('/health');
  }

  // Pricing Analysis
  async analyzePricing(
    request: PricingAnalysisRequest
  ): Promise<PricingAnalysisResponse> {
    return this.request('/api/v1/pricing/analyze', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async analyzePricingAsync(
    request: PricingAnalysisRequest
  ): Promise<AsyncJobResponse> {
    return this.request('/api/v1/pricing/analyze/async', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async getPricingResult(
    jobId: string
  ): Promise<JobResult<PricingAnalysisResponse>> {
    return this.request(`/api/v1/pricing/analyze/result/${jobId}`);
  }

  async quickPricing(propertyId: string): Promise<QuickPricingResult> {
    return this.request(`/api/v1/pricing/quick/${propertyId}`);
  }

  // Negotiation
  async getBuyerAdvice(
    request: BuyerAdviceRequest
  ): Promise<NegotiationAdviceResponse> {
    return this.request('/api/v1/negotiation/buyer-advice', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async getSellerAdvice(
    request: SellerAdviceRequest
  ): Promise<NegotiationAdviceResponse> {
    return this.request('/api/v1/negotiation/seller-advice', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async calculateNegotiationPower(request: {
    property_id: string;
    days_on_market?: number;
    price_changes?: number;
    offer_count?: number;
    market_trend?: string;
  }): Promise<NegotiationPowerResult> {
    return this.request('/api/v1/negotiation/power-score', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async getOfferSuggestions(
    propertyId: string,
    budget?: number
  ): Promise<OfferSuggestions> {
    const params = budget ? `?budget=${budget}` : '';
    return this.request(`/api/v1/negotiation/offer-suggestions/${propertyId}${params}`);
  }

  // Contracts
  async generateContract(
    request: ContractGenerationRequest
  ): Promise<ContractResponse> {
    return this.request('/api/v1/contracts/generate', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async generateQuickDraft(request: {
    buyer_name: string;
    seller_name: string;
    property_address: string;
    property_description: string;
    agreed_price: number;
    deposit_percent?: number;
    closing_days?: number;
  }): Promise<{ success: boolean; contract: object }> {
    return this.request('/api/v1/contracts/quick-draft', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async validateContractTerms(request: {
    agreed_price: number;
    property_price: number;
    deposit_percent: number;
    closing_days: number;
  }): Promise<{ success: boolean; validation: object }> {
    return this.request('/api/v1/contracts/validate-terms', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  // Full Analysis
  async runFullAnalysis(
    request: FullAnalysisRequest
  ): Promise<FullAnalysisResponse> {
    return this.request('/api/v1/analysis/full', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async runFullAnalysisAsync(
    request: FullAnalysisRequest
  ): Promise<AsyncJobResponse> {
    return this.request('/api/v1/analysis/full/async', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async getFullAnalysisResult(
    jobId: string
  ): Promise<JobResult<FullAnalysisResponse>> {
    return this.request(`/api/v1/analysis/full/result/${jobId}`);
  }

  async getCapabilities(): Promise<object> {
    return this.request('/api/v1/analysis/capabilities');
  }

  // Polling helper for async jobs
  async pollForResult<T>(
    checkFn: () => Promise<JobResult<T>>,
    options: {
      maxAttempts?: number;
      intervalMs?: number;
      onProgress?: (status: string) => void;
    } = {}
  ): Promise<T> {
    const { maxAttempts = 60, intervalMs = 5000, onProgress } = options;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const result = await checkFn();

      if (onProgress) {
        onProgress(result.status);
      }

      if (result.status === 'completed' && result.result) {
        return result.result;
      }

      if (result.status === 'failed') {
        throw new Error(result.error || 'Analysis failed');
      }

      // Wait before next poll
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }

    throw new Error('Analysis timed out');
  }
}

// Export singleton instance
export const crewaiClient = new CrewAIClient();

// Export class for custom instances
export { CrewAIClient };
