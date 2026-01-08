# CrewAI Production Architecture Gaps Analysis

**Date**: 2026-01-08
**Analyzed By**: Claude Code
**CrewAI Version**: Current implementation

---

## Executive Summary

The current CrewAI implementation provides solid foundational functionality but lacks several production-hardening features recommended by CrewAI best practices. This document identifies gaps and provides prioritized recommendations.

### Risk Assessment

| Gap | Severity | Impact | Effort |
|-----|----------|--------|--------|
| No Task Guardrails | HIGH | Data quality issues | Medium |
| No Structured Output | HIGH | Parsing failures | Medium |
| Limited Error Handling | MEDIUM | Silent failures | Low |
| No Event Callbacks | MEDIUM | No observability | Medium |
| Basic Rate Limiting | LOW | API throttling | Low |

---

## 1. Task Guardrails (Missing)

### Current State
No guardrails are implemented. Agent outputs are passed directly without validation.

### Recommended Implementation

```python
# Example guardrail for pricing validation
from crewai import Task
from pydantic import BaseModel, Field, validator

class PricingOutputGuard(BaseModel):
    """Guardrail for pricing analysis output."""
    fairness_score: int = Field(ge=0, le=100)
    fairness_label: str = Field(pattern="^(underpriced|fair|overpriced|significantly_overpriced)$")
    estimated_fair_value: float = Field(ge=0)
    confidence_level: str = Field(pattern="^(low|medium|high)$")

    @validator('estimated_fair_value')
    def value_must_be_reasonable(cls, v, values):
        # Fair value shouldn't be 0 unless there's an issue
        if v == 0:
            raise ValueError('Estimated fair value cannot be 0')
        return v

# Usage in task definition
task = Task(
    description="...",
    expected_output="...",
    agent=pricing_analyst,
    guardrail=PricingOutputGuard,  # Add this
)
```

### Priority: HIGH
- Prevents invalid LLM outputs from propagating
- Ensures data quality for downstream processing
- Enables automatic retries on validation failure

---

## 2. Structured Output (Missing)

### Current State
Tasks return unstructured strings that must be parsed manually:
```python
result = crew.kickoff()
# result.raw is a string - parsing required
```

### Recommended Implementation

```python
from crewai import Task
from pydantic import BaseModel
from typing import List, Optional

class MarketAnalysisOutput(BaseModel):
    zone_name: str
    avg_price_per_m2: float
    median_price_per_m2: float
    property_count: int
    market_health_score: int
    market_trend: str  # hot/warm/cool/cold
    key_insights: List[str]

class PricingAnalysisOutput(BaseModel):
    property_id: str
    fairness_score: int
    fairness_label: str
    estimated_fair_value: Optional[float]
    price_deviation_percent: float
    suggested_offers: dict
    confidence_level: str
    negotiation_factors: List[dict]

# Task with structured output
market_task = Task(
    description="...",
    expected_output="...",
    agent=market_analyst,
    output_pydantic=MarketAnalysisOutput,  # Add this
)
```

### Benefits
- Type-safe responses in TypeScript frontend
- Automatic JSON serialization
- Built-in validation
- Better error messages

### Priority: HIGH

---

## 3. Event Callbacks (Missing)

### Current State
No visibility into crew execution. Debugging requires verbose logs.

### Recommended Implementation

```python
from crewai import Crew
from typing import Callable

class CrewMetrics:
    """Track crew execution metrics."""
    def __init__(self):
        self.task_starts = []
        self.task_completions = []
        self.errors = []
        self.total_tokens = 0

    def on_task_start(self, task, agent):
        self.task_starts.append({
            'task': task.description[:50],
            'agent': agent.role,
            'timestamp': datetime.now().isoformat()
        })

    def on_task_complete(self, task, output):
        self.task_completions.append({
            'task': task.description[:50],
            'output_length': len(str(output)),
            'timestamp': datetime.now().isoformat()
        })

    def on_error(self, error, task=None):
        self.errors.append({
            'error': str(error),
            'task': task.description[:50] if task else None,
            'timestamp': datetime.now().isoformat()
        })

# Usage
metrics = CrewMetrics()
crew = Crew(
    agents=[...],
    tasks=[...],
    callbacks={
        'on_task_start': metrics.on_task_start,
        'on_task_complete': metrics.on_task_complete,
        'on_error': metrics.on_error,
    }
)
```

### Priority: MEDIUM
- Essential for production monitoring
- Enables debugging without verbose mode
- Supports metrics/alerting integration

---

## 4. Error Handling & Retries (Partial)

### Current State
Basic try/catch in API routes. No automatic retries or circuit breakers.

### Recommended Implementation

```python
from tenacity import retry, stop_after_attempt, wait_exponential
from functools import wraps

def with_retry(max_attempts=3, base_delay=1):
    """Decorator for retrying crew operations."""
    def decorator(func):
        @wraps(func)
        @retry(
            stop=stop_after_attempt(max_attempts),
            wait=wait_exponential(multiplier=base_delay, min=1, max=60),
            reraise=True
        )
        async def wrapper(*args, **kwargs):
            return await func(*args, **kwargs)
        return wrapper
    return decorator

# Usage in route
@router.post("/analyze")
@with_retry(max_attempts=3)
async def analyze_pricing(request: PricingRequest):
    crew = PricingAnalysisCrew()
    return crew.run(request.property_id)
```

### Current Gap in API Routes
```python
# Current: Simple try/catch
try:
    result = crew.run(...)
    return result
except Exception as e:
    raise HTTPException(status_code=500, detail=str(e))

# Recommended: Categorized error handling
try:
    result = crew.run(...)
    return result
except LLMRateLimitError:
    raise HTTPException(status_code=429, detail="Rate limited")
except LLMTimeoutError:
    raise HTTPException(status_code=504, detail="Analysis timeout")
except ValidationError as e:
    raise HTTPException(status_code=422, detail=e.errors())
except Exception as e:
    logger.error(f"Unexpected error: {e}")
    raise HTTPException(status_code=500, detail="Internal error")
```

### Priority: MEDIUM

---

## 5. Rate Limiting (Basic)

### Current State
- `crew_max_rpm: int = 10` in settings
- Applied at CrewAI/LLM level
- No API-level rate limiting

### Recommended Improvements

```python
# Add FastAPI rate limiting
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@router.post("/analyze")
@limiter.limit("10/minute")
async def analyze_pricing(request: Request, body: PricingRequest):
    ...
```

### Priority: LOW (current implementation sufficient for moderate traffic)

---

## 6. Async Task Support (Partial)

### Current State
- Async endpoints exist (`/async`)
- Uses simple in-memory job tracking
- No persistent job storage

### Recommended Improvements

```python
# Current: In-memory job storage (lost on restart)
jobs = {}

# Recommended: Redis or database persistence
from redis import Redis

redis = Redis.from_url(settings.redis_url)

async def store_job(job_id: str, status: str, result: dict = None):
    redis.hset(f"job:{job_id}", mapping={
        "status": status,
        "result": json.dumps(result) if result else None,
        "updated_at": datetime.now().isoformat()
    })
    redis.expire(f"job:{job_id}", 3600)  # 1 hour TTL
```

### Priority: LOW (only needed for high-volume async operations)

---

## 7. Memory & Context Management (Basic)

### Current State
- `crew_memory: bool = True` enabled
- No long-term memory persistence
- No context windowing for large analyses

### Considerations
- Memory works per-session only
- Consider adding conversation/property history for better context
- May need memory pruning for long-running crews

### Priority: LOW

---

## Implementation Roadmap

### Phase 1: Critical (Week 1)
1. Add Pydantic models for structured outputs
2. Implement task guardrails for pricing outputs
3. Add categorized error handling

### Phase 2: Monitoring (Week 2)
1. Implement event callbacks
2. Add metrics collection
3. Create monitoring dashboard

### Phase 3: Resilience (Week 3)
1. Add retry logic with backoff
2. Implement circuit breakers
3. Add API-level rate limiting

### Phase 4: Scale (Future)
1. Persistent job storage (Redis)
2. Horizontal scaling support
3. Memory optimization

---

## Quick Wins (Immediate Implementation)

### 1. Add Structured Output Models
Create `crewai/models/outputs.py`:
```python
from pydantic import BaseModel, Field
from typing import List, Optional

class PricingTaskOutput(BaseModel):
    fairness_score: int = Field(ge=0, le=100)
    fairness_label: str
    estimated_fair_value: Optional[float]
    confidence_level: str
    suggested_offers: dict
```

### 2. Add Basic Error Logging
Update API routes with structured logging:
```python
import logging
logger = logging.getLogger("crewai.api")

@router.post("/analyze")
async def analyze(request: PricingRequest):
    logger.info(f"Starting analysis for property {request.property_id}")
    try:
        result = crew.run(...)
        logger.info(f"Analysis complete for {request.property_id}")
        return result
    except Exception as e:
        logger.error(f"Analysis failed for {request.property_id}: {e}")
        raise
```

### 3. Health Check Enhancement
Add dependency checks:
```python
@app.get("/health")
async def health_check():
    # Check LLM connectivity
    llm_healthy = await check_llm_connection()
    # Check database connectivity
    db_healthy = await check_supabase_connection()

    status = "healthy" if all([llm_healthy, db_healthy]) else "degraded"
    return {
        "status": status,
        "checks": {
            "llm": llm_healthy,
            "database": db_healthy,
        }
    }
```

---

## References

- [CrewAI Production Architecture](https://docs.crewai.com/en/concepts/production-architecture)
- [CrewAI Task Guardrails](https://docs.crewai.com/en/concepts/guardrails)
- [Structured Outputs](https://docs.crewai.com/en/concepts/structured-outputs)
- [PriceWaze Error Handling Standards](../standards/error-handling.md)
