/**
 * CrewAI Client - Integration with PriceWaze CrewAI backend
 *
 * This client provides typed access to the multi-agent AI analysis system.
 */

// Configuration
const CREWAI_BASE_URL = process.env.CREWAI_API_URL || 'http://localhost:8000';

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

  constructor(baseUrl: string = CREWAI_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(error.detail || `API error: ${response.status}`);
    }

    return response.json();
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
