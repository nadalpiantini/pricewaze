# CrewAI ↔ TypeScript Integration Guide

**Version**: 1.0.0
**Last Updated**: 2026-01-08
**Status**: Production-Ready

---

## Overview

PriceWaze uses a hybrid architecture where the Next.js frontend communicates with a Python-based CrewAI backend for complex multi-agent AI analysis. This document details the integration patterns, data contracts, and production considerations.

```
┌─────────────────────────────────────────────────────────────────┐
│                     Next.js Frontend                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │  React Client   │  │   API Routes    │  │  crewai-client  │  │
│  │   Components    │──│  /api/crewai/*  │──│      .ts        │  │
│  └─────────────────┘  └─────────────────┘  └────────┬────────┘  │
└────────────────────────────────────────────────────│────────────┘
                                                     │ HTTP/REST
                                                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                    CrewAI Backend (Python)                       │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │   FastAPI       │  │     Crews       │  │     Agents      │  │
│  │   Endpoints     │──│  Orchestration  │──│   Specialists   │  │
│  └─────────────────┘  └─────────────────┘  └────────┬────────┘  │
│                                                     │            │
│  ┌─────────────────┐  ┌─────────────────┐           │            │
│  │    Database     │  │    DeepSeek     │◄──────────┘            │
│  │     Tools       │  │       LLM       │                        │
│  └─────────────────┘  └─────────────────┘                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## Architecture Components

### TypeScript Layer

| Component | Path | Purpose |
|-----------|------|---------|
| `crewai-client.ts` | `src/lib/crewai-client.ts` | Type-safe HTTP client for CrewAI API |
| Pricing Route | `src/app/api/crewai/pricing/route.ts` | Proxy for pricing analysis |
| Negotiation Route | `src/app/api/crewai/negotiation/route.ts` | Proxy for negotiation advice |
| Contracts Route | `src/app/api/crewai/contracts/route.ts` | Proxy for contract generation |
| Analysis Route | `src/app/api/crewai/analysis/route.ts` | Proxy for full multi-agent analysis |

### Python Layer

| Component | Path | Purpose |
|-----------|------|---------|
| `market_analyst.py` | `crewai/agents/` | Zone and market research |
| `pricing_analyst.py` | `crewai/agents/` | Property valuation |
| `negotiation_advisor.py` | `crewai/agents/` | Offer strategies |
| `legal_advisor.py` | `crewai/agents/` | Contract drafting |
| `coordinator.py` | `crewai/agents/` | Multi-agent orchestration |
| `pricing_crew.py` | `crewai/crews/` | Pricing workflow |
| `negotiation_crew.py` | `crewai/crews/` | Negotiation workflow |
| `contract_crew.py` | `crewai/crews/` | Contract workflow |
| `full_analysis_crew.py` | `crewai/crews/` | Complete analysis |

---

## Data Contracts

### Request Types (TypeScript → Python)

```typescript
// Pricing Analysis
interface PricingAnalysisRequest {
  property_id: string;    // UUID
  zone_id?: string;       // Optional zone UUID
  async?: boolean;        // Enable async processing
}

// Buyer Advice
interface BuyerAdviceRequest {
  property_id: string;
  buyer_budget?: number;  // Max budget in USD
}

// Seller Advice
interface SellerAdviceRequest {
  property_id: string;
  offer_amount: number;   // Received offer amount
  offer_message?: string; // Buyer's message
}

// Contract Generation
interface ContractGenerationRequest {
  property_id: string;
  buyer: ContractParty;
  seller: ContractParty;
  property_address: string;
  agreed_price: number;
  deposit_percent?: number;   // Default: 10
  closing_days?: number;      // Default: 30
  special_conditions?: string[];
}

interface ContractParty {
  name: string;
  email?: string;
  id_number?: string;
}

// Full Analysis
interface FullAnalysisRequest {
  property_id: string;
  buyer_budget?: number;
  generate_contract?: boolean;
  buyer_name?: string;
  seller_name?: string;
}
```

### Response Types (Python → TypeScript)

```typescript
// Pricing Analysis Response
interface PricingAnalysisResponse {
  property_id: string;
  zone_id: string | null;
  analysis_type: "pricing";
  result: string;            // Formatted analysis text
  tasks_output: TaskOutput[];
}

interface TaskOutput {
  task: string;              // Task description (truncated)
  output: string | null;     // Agent output
}

// Negotiation Advice Response
interface NegotiationAdviceResponse {
  property_id: string;
  advice_type: "buyer" | "seller";
  buyer_budget?: number;
  offer_amount?: number;
  result: string;
  tasks_output: TaskOutput[];
}

// Contract Response
interface ContractResponse {
  property_id: string;
  buyer: string;
  seller: string;
  agreed_price: number;
  deposit_amount: number;
  contract_draft: string;    // Full contract text
  full_analysis: string;
  tasks_output: TaskOutput[];
}

// Full Analysis Response
interface FullAnalysisResponse {
  property_id: string;
  analysis_type: "full";
  buyer_budget: number | null;
  contract_requested: boolean;
  executive_summary: string;
  specialist_reports: SpecialistReport[];
  agents_used: string[];
}

interface SpecialistReport {
  specialist: string;        // Agent name
  task: string;              // Task performed
  output: string | null;     // Report content
}

// Async Job Types
interface AsyncJobResponse {
  job_id: string;
  status: "processing";
  check_url: string;
  estimated_time?: string;
}

interface JobResult<T> {
  status: "processing" | "completed" | "failed";
  result?: T;
  error?: string;
  started_at?: string;
  completed_at?: string;
}
```

### Quick Endpoints

```typescript
// Quick Pricing (synchronous, fast)
interface QuickPricingResult {
  property_id: string;
  quick_assessment: {
    target_price: number;
    target_price_per_m2: number;
    market_avg_price_per_m2: number;
    fairness_label: "underpriced" | "fair" | "overpriced" | "significantly_overpriced";
    fairness_score: number;       // 0-100
    estimated_fair_value: number;
  };
  property_price: number;
  property_area_m2: number;
  comparables_count: number;
}

// Offer Suggestions
interface OfferSuggestions {
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

// Negotiation Power
interface NegotiationPowerResult {
  property_id: string;
  success: boolean;
  negotiation_power: {
    score: number;        // 0-100
    label: string;
    factors: NegotiationFactor[];
    recommendation: string;
  };
}

interface NegotiationFactor {
  factor: string;
  value: string | number;
  impact: "positive" | "negative" | "neutral";
  weight: number;
  score_adjustment: number;
  explanation: string;
}
```

---

## API Endpoints

### Base URLs

| Environment | URL |
|-------------|-----|
| Development | `http://localhost:8000` |
| Production | Set via `CREWAI_API_URL` env var |

### Endpoint Reference

| Method | Path | Purpose | Sync/Async |
|--------|------|---------|------------|
| `POST` | `/api/v1/pricing/analyze` | Full pricing analysis | Sync |
| `POST` | `/api/v1/pricing/analyze/async` | Async pricing analysis | Async |
| `GET` | `/api/v1/pricing/analyze/result/{job_id}` | Get async result | - |
| `GET` | `/api/v1/pricing/quick/{property_id}` | Quick assessment | Sync |
| `POST` | `/api/v1/negotiation/buyer-advice` | Buyer strategy | Sync |
| `POST` | `/api/v1/negotiation/seller-advice` | Seller strategy | Sync |
| `POST` | `/api/v1/negotiation/power-score` | Power calculation | Sync |
| `GET` | `/api/v1/negotiation/offer-suggestions/{id}` | Offer tiers | Sync |
| `POST` | `/api/v1/contracts/generate` | Full contract | Sync |
| `POST` | `/api/v1/contracts/quick-draft` | Quick draft | Sync |
| `POST` | `/api/v1/contracts/validate-terms` | Term validation | Sync |
| `POST` | `/api/v1/analysis/full` | Multi-agent analysis | Sync |
| `POST` | `/api/v1/analysis/full/async` | Async full analysis | Async |
| `GET` | `/api/v1/analysis/full/result/{job_id}` | Get async result | - |
| `GET` | `/api/v1/analysis/capabilities` | System capabilities | Sync |
| `GET` | `/health` | Health check | Sync |

---

## Client Usage

### Import and Instance

```typescript
import { crewaiClient } from '@/lib/crewai-client';

// Or create custom instance
import { CrewAIClient } from '@/lib/crewai-client';
const customClient = new CrewAIClient('https://custom-url.com');
```

### Synchronous Operations

```typescript
// Quick pricing (fastest)
const quick = await crewaiClient.quickPricing(propertyId);
console.log(quick.quick_assessment.fairness_label);

// Full pricing analysis
const pricing = await crewaiClient.analyzePricing({
  property_id: propertyId,
  zone_id: optionalZoneId,
});

// Negotiation advice
const buyerAdvice = await crewaiClient.getBuyerAdvice({
  property_id: propertyId,
  buyer_budget: 200000,
});

// Offer suggestions
const offers = await crewaiClient.getOfferSuggestions(propertyId, 180000);
```

### Asynchronous Operations

```typescript
// Start async analysis
const job = await crewaiClient.analyzePricingAsync({
  property_id: propertyId,
});
console.log(`Job started: ${job.job_id}`);

// Poll for result with helper
const result = await crewaiClient.pollForResult(
  () => crewaiClient.getPricingResult(job.job_id),
  {
    maxAttempts: 60,
    intervalMs: 5000,
    onProgress: (status) => console.log(`Status: ${status}`),
  }
);
```

### Error Handling

```typescript
try {
  const result = await crewaiClient.analyzePricing({ property_id: id });
} catch (error) {
  if (error instanceof Error) {
    // Handle specific errors
    if (error.message.includes('property not found')) {
      // Property doesn't exist
    } else if (error.message.includes('timeout')) {
      // Analysis took too long
    } else {
      // Generic error handling
      console.error('CrewAI error:', error.message);
    }
  }
}
```

---

## Frontend Integration Pattern

### React Query Integration

```typescript
import { useQuery, useMutation } from '@tanstack/react-query';
import { crewaiClient } from '@/lib/crewai-client';

// Quick pricing query
export function useQuickPricing(propertyId: string) {
  return useQuery({
    queryKey: ['crewai', 'quick-pricing', propertyId],
    queryFn: () => crewaiClient.quickPricing(propertyId),
    enabled: !!propertyId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Full analysis mutation
export function useFullAnalysis() {
  return useMutation({
    mutationFn: (request: FullAnalysisRequest) =>
      crewaiClient.runFullAnalysis(request),
  });
}
```

### Proxy Route Pattern

```typescript
// src/app/api/crewai/pricing/route.ts
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.property_id) {
      return NextResponse.json(
        { error: 'property_id is required' },
        { status: 400 }
      );
    }

    // Route to async or sync based on request
    if (body.async) {
      const result = await crewaiClient.analyzePricingAsync(body);
      return NextResponse.json(result);
    }

    const result = await crewaiClient.analyzePricing(body);
    return NextResponse.json(result);
  } catch (error) {
    console.error('CrewAI pricing error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Analysis failed' },
      { status: 500 }
    );
  }
}
```

---

## Configuration

### Environment Variables

```env
# TypeScript (Next.js)
CREWAI_API_URL=http://localhost:8000

# Python (CrewAI)
DEEPSEEK_API_KEY=your-key
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-key

# CrewAI Settings
CREW_VERBOSE=true
CREW_MEMORY=true
CREW_MAX_RPM=10
API_HOST=0.0.0.0
API_PORT=8000
API_DEBUG=false
```

### Python Settings (pydantic)

```python
# crewai/config/settings.py
class Settings(BaseSettings):
    # DeepSeek AI
    deepseek_api_key: str
    deepseek_base_url: str = "https://api.deepseek.com"
    deepseek_model: str = "deepseek-chat"

    # Supabase
    supabase_url: str
    supabase_service_role_key: str

    # CrewAI
    crew_verbose: bool = True
    crew_memory: bool = True
    crew_max_rpm: int = 10

    # API
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    api_debug: bool = False
```

---

## Production Considerations

### Rate Limiting

The CrewAI backend enforces `crew_max_rpm` (requests per minute) at the LLM level:
- Default: 10 RPM
- Recommendation: Adjust based on DeepSeek API tier
- Implement client-side queuing for burst traffic

### Timeouts

| Operation | Recommended Timeout |
|-----------|-------------------|
| Quick pricing | 10s |
| Pricing analysis | 60s |
| Negotiation advice | 45s |
| Contract generation | 90s |
| Full analysis | 180s |

### Async Processing

For operations >30s, use async endpoints:
1. Start job → receive `job_id`
2. Poll `/result/{job_id}` until `completed`
3. Handle `failed` status with retry logic

### Health Monitoring

```typescript
// Check backend health
const health = await crewaiClient.healthCheck();
// Returns: { status: "healthy", model: "deepseek-chat" }
```

### Error Categories

| Error Type | Handling |
|------------|----------|
| `property not found` | Validate property exists before calling |
| `zone not found` | Fall back to property zone auto-detection |
| `API timeout` | Switch to async mode or retry |
| `LLM rate limit` | Implement exponential backoff |
| `Invalid response` | Log and return fallback/cached data |

---

## Crew Workflows

### Pricing Analysis Crew

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Market    │    │   Property  │    │   Offer     │
│  Research   │───▶│  Valuation  │───▶│ Suggestions │
│             │    │             │    │             │
│ zone stats  │    │ fair value  │    │ 3 tiers     │
│ comparables │    │ score       │    │ rationales  │
└─────────────┘    └─────────────┘    └─────────────┘
      │                  │                  │
      └────────────┬─────┴──────────────────┘
                   ▼
           [PRICING RESULT]
```

### Full Analysis Crew

```
     ┌─────────────┐
     │  MARKET     │
     │  ANALYST    │
     └──────┬──────┘
            │
     ┌──────▼──────┐
     │  PRICING    │
     │  ANALYST    │
     └──────┬──────┘
            │
┌───────────┴───────────┐
│           │           │
▼           ▼           ▼
┌───────┐ ┌───────┐ ┌───────┐
│NEGOT. │ │LEGAL  │ │COORD. │
│ADVISOR│ │ADVISOR│ │       │
└───┬───┘ └───┬───┘ └───┬───┘
    │         │         │
    └─────────┴────┬────┘
                   ▼
          [EXECUTIVE SUMMARY]
```

---

## Testing

### TypeScript Tests

```typescript
// Mock the client for unit tests
jest.mock('@/lib/crewai-client', () => ({
  crewaiClient: {
    quickPricing: jest.fn().mockResolvedValue({
      property_id: 'test-id',
      quick_assessment: {
        fairness_score: 75,
        fairness_label: 'fair',
      },
    }),
  },
}));
```

### Python Tests

```bash
cd crewai
pytest tests/ -v
pytest tests/test_pricing_crew.py -v  # Specific crew
```

### Integration Tests

```bash
# Start CrewAI backend
cd crewai && python run.py

# Run E2E tests
pnpm test:e2e --grep "crewai"
```

---

## Related Documentation

- [AI Systems Integration](./ai-systems-integration.md) - DeepSeek + Copilot overview
- [ADR-003: CrewAI Multi-Agent](../adr/ADR-003-crewai-multi-agent.md) - Architecture decision
- [CrewAI README](../../crewai/README.md) - Python backend docs
- [Error Handling Standards](../standards/error-handling.md) - Error patterns

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-01-08 | Initial documentation |
