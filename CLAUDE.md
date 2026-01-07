# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PriceWaze (marketed as "PriceMap") is a real estate intelligence platform that provides AI-powered pricing analysis, offer recommendations, and negotiation assistance for property buyers and sellers. The platform is designed to be market-agnostic and scalable to any geographic region.

## Tech Stack

- **Frontend**: Next.js 16.1 (App Router), React 19, TypeScript, Tailwind CSS 4
- **UI Components**: Radix UI primitives, Shadcn/ui pattern
- **State Management**: Zustand (persisted stores)
- **Data Fetching**: TanStack React Query
- **Maps**: Mapbox GL + react-map-gl
- **Backend**: Next.js API Routes, Supabase (shared `sujeto10` project)
- **AI**: DeepSeek API via OpenAI SDK
- **Multi-Agent System**: CrewAI (Python) for complex analysis workflows

## Commands

```bash
pnpm dev          # Start development server
pnpm build        # Production build
pnpm lint         # Run ESLint
pnpm seed         # Seed database with test data
pnpm seed:clear   # Clear seeded data
```

### CrewAI (Python backend)
```bash
cd crewai
pip install -e ".[dev]"    # Install with dev dependencies
pytest tests/              # Run tests
ruff check .               # Lint Python code
```

## Architecture

### Database Schema
All tables use `pricewaze_` prefix in the shared Supabase project. Key tables:
- `pricewaze_profiles` - User profiles (extends auth.users)
- `pricewaze_properties` - Property listings with PostGIS location
- `pricewaze_zones` - Geographic zones with PostGIS boundaries
- `pricewaze_offers` - Offer chain with counter-offers (self-referencing)
- `pricewaze_visits` - GPS-verified property visits
- `pricewaze_agreements` - AI-generated contracts

Database features automatic zone assignment via PostGIS `ST_Contains`, price history tracking via triggers, and comprehensive RLS policies.

### Route Groups
- `(auth)/*` - Login/register pages (redirect to dashboard if authenticated)
- `(dashboard)/*` - Protected routes with sidebar layout
- `landing/` - Public marketing page
- `onboarding/` - User onboarding flow

### API Structure
```
/api/properties/        # CRUD for properties
/api/offers/           # Offer management
/api/visits/           # Visit scheduling and verification
/api/ai/pricing/       # AI pricing analysis (DeepSeek)
/api/ai/advice/        # Negotiation advice
/api/ai/contracts/     # Contract generation
```

### State Stores (Zustand)
- `auth-store` - User session, authentication state
- `property-store` - Favorites, recently viewed (persisted)
- `ui-store` - Sidebar state, mobile detection
- `onboarding-store` - Onboarding progress

### AI Integration
The `/src/lib/ai/` directory contains DeepSeek integration for:
- `pricing.ts` - Fairness scoring, offer suggestions, zone analysis
- `contracts.ts` - AI-generated purchase agreements

All AI functions include fallback logic when API is unavailable.

### CrewAI Multi-Agent System
Located in `/crewai/`, provides advanced analysis via specialized agents:
- **MarketAnalyst** - Zone statistics, market trends
- **PricingAnalyst** - Property valuation, offer tiers
- **NegotiationAdvisor** - Counter-offer strategy
- **LegalAdvisor** - Contract review, compliance
- **Coordinator** - Orchestrates agent workflows

Crews: `PricingCrew`, `NegotiationCrew`, `ContractCrew`, `FullAnalysisCrew`

## Key Patterns

### Supabase Server Client
Always use `await createClient()` from `@/lib/supabase/server` in API routes:
```typescript
const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();
```

### Protected API Routes
```typescript
if (!user) {
  return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
}
```

### Zod Validation
All API inputs are validated with Zod schemas before processing.

### Type Imports
Use `@/*` path alias for all imports (maps to `./src/*`).

## Environment Variables

Required in `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`
- `DEEPSEEK_API_KEY` / `DEEPSEEK_BASE_URL` / `DEEPSEEK_MODEL`
- `NEXT_PUBLIC_MAPBOX_TOKEN`

## Multi-Market Configuration

The platform supports multiple markets via the `NEXT_PUBLIC_MARKET_CODE` environment variable:

**Supported Markets**: `DO` (Dominican Republic), `US`, `MX` (Mexico), `ES` (Spain), `CO` (Colombia), `global` (default)

**Configuration Files**:
- `src/config/market.ts` - TypeScript market configuration (currency, map, legal, AI context, SEO)
- `crewai/config/market.py` - Python market configuration for CrewAI agents

**Usage**:
```typescript
import { getMarketConfig, formatPrice } from '@/config/market';

const market = getMarketConfig();
console.log(market.name); // "Dominican Republic" or "United States" etc.
console.log(formatPrice(100000, market)); // "$100,000" or "RD$100,000" etc.
```

Set `NEXT_PUBLIC_MARKET_CODE=DO` in `.env.local` to target Dominican Republic, or leave unset for global market.
