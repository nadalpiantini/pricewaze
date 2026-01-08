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
pnpm build        # Production build (also runs TypeScript typecheck)
pnpm lint         # Run ESLint
pnpm seed         # Seed database with test data
pnpm seed:clear   # Clear seeded data
```

### Testing
```bash
# E2E tests (requires dev server or uses webServer config)
pnpm test:e2e              # Run all E2E tests
pnpm test:e2e:ui           # Interactive UI mode
pnpm test:e2e:debug        # Debug mode

# Mobile responsive tests (5 devices, 130 validations)
pnpm test:mobile           # Run mobile design tests
pnpm test:mobile:ui        # Interactive UI mode

# Run single test file
npx playwright test tests/e2e/auth.spec.ts

# Run tests matching pattern
npx playwright test --grep "login"
```

**E2E Test Setup**: Tests require confirmed test users. Set `TEST_USER_EMAIL` and `TEST_USER_PASSWORD` in `.env.local` for pre-seeded users, or tests will attempt to create users via `/api/test/users`.

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
- `pricewaze_scraper_history` - Web scraper run tracking and monitoring

Database features automatic zone assignment via PostGIS `ST_Contains`, price history tracking via triggers, trust score calculation for data quality, and comprehensive RLS policies.

### Route Groups
- `(auth)/*` - Login/register pages (redirect to dashboard if authenticated)
- `(dashboard)/*` - Protected routes with sidebar layout
- `landing/` - Public marketing page
- `onboarding/` - User onboarding flow

### API Structure
```
/api/properties/            # CRUD for properties
/api/offers/               # Offer management with fairness scoring
/api/visits/               # Visit scheduling and GPS verification
/api/routes/               # Visit route optimization
/api/zones/                # Geographic zone data
/api/ai/pricing/           # AI pricing analysis (DeepSeek)
/api/ai/advice/            # Negotiation advice
/api/ai/contracts/         # Contract generation
/api/ai/decision-intelligence/  # Property decision panels
/api/copilot/              # AI Copilot (alerts, chat, negotiation)
/api/crewai/               # Multi-agent analysis endpoints
/api/gamification/         # Points, badges, achievements
/api/notifications/        # Push notifications
/api/alerts/               # Market alerts and saved searches
/api/signals/              # Market signals processing
/api/scraper/              # Web scraper orchestration (Apify)
/api/scraper/[runId]/      # Scraper run status and control
/api/ingest/               # Property data ingestion pipeline
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

### Web Scraping System
Located in `/src/lib/scraper/`, provides automated property data collection:
- **ApifyClient** - Wrapper for Apify cloud scraping platform
- **ScraperService** - Orchestrates scraping, transformation, and ingestion
- **Configs** - Per-portal configuration with transformers (SuperCasas, Corotos)

**Supported Portals** (Dominican Republic):
- `supercasas` - supercasas.com (residential focus)
- `corotos` - corotos.com.do (marketplace with real estate)

**Data Flow**: Apify Actor → Raw Items → Transformer → Normalized Properties → Ingest API → Database

**Trust Score System**: Properties are assigned a trust score (0-1) based on source type and data completeness:
- `opendata`: 1.00 (government sources)
- `api`: 0.95 (verified API partners)
- `scraper`: 0.85 (web scraping)
- `user`: 0.70 (user submissions)
- Bonuses for images, coordinates, area, description

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

### Test Data Attributes
Use `data-testid` for E2E test selectors:
```typescript
// Form inputs
data-testid="email-input"
data-testid="password-input"
data-testid="login-button"

// Navigation
data-testid="user-menu"
data-testid="sidebar-nav"

// Property cards/lists
data-testid="property-card"
data-testid="property-list"
```

## Environment Variables

Required in `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`
- `DEEPSEEK_API_KEY` / `DEEPSEEK_BASE_URL` / `DEEPSEEK_MODEL`
- `NEXT_PUBLIC_MAPBOX_TOKEN`

For Web Scraping (Apify integration):
- `APIFY_API_TOKEN` - Apify platform API token
- `APIFY_ACTOR_SUPERCASAS` - Actor ID for SuperCasas.com scraper
- `APIFY_ACTOR_COROTOS` - Actor ID for Corotos.com.do scraper
- `SCRAPER_SERVICE_KEY` - Internal API key for scraper→ingest calls

For E2E testing (optional but recommended):

- `TEST_USER_EMAIL` / `TEST_USER_PASSWORD` - Pre-confirmed test user credentials
- `PLAYWRIGHT_TEST_BASE_URL` - Base URL for tests (default: `http://localhost:3000`)

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
