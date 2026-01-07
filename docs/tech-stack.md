# Tech Stack - PriceWaze

> Documentaci贸n formal del stack tecnol贸gico siguiendo metodolog铆a Edward Honour

## Frontend

| Categor铆a | Tecnolog铆a | Versi贸n | Justificaci贸n |
|-----------|------------|---------|---------------|
| Framework | Next.js | 16.1 | App Router, RSC, optimizaci贸n autom谩tica |
| UI Library | React | 19 | Concurrent features, hooks avanzados |
| Language | TypeScript | 5.x | Type safety, mejor DX |
| Styling | Tailwind CSS | 4.0 | Utility-first, design tokens |
| Components | Radix UI + Shadcn | Latest | Accesibilidad, customizable |
| Animations | Framer Motion | 12.x | Animaciones declarativas |

## State Management

| Categor铆a | Tecnolog铆a | Uso |
|-----------|------------|-----|
| Global State | Zustand | 5.x | Stores persistidos (auth, property, ui) |
| Server State | TanStack Query | 5.x | Cache, mutations, revalidaci贸n |
| Form State | React Hook Form | 7.x | Validaci贸n con Zod |

## Backend

| Categor铆a | Tecnolog铆a | Versi贸n | Justificaci贸n |
|-----------|------------|---------|---------------|
| API Routes | Next.js | 16.1 | Serverless, edge-ready |
| Database | Supabase (PostgreSQL) | - | Auth integrado, PostGIS, RLS |
| AI Provider | DeepSeek | - | Costo-efectivo, via OpenAI SDK |
| Multi-Agent | CrewAI | Python | Workflows complejos de an谩lisis |

## Database Schema

**Prefix**: `pricewaze_` (proyecto compartido `sujeto10`)

| Tabla | Prop贸sito |
|-------|-----------|
| `pricewaze_profiles` | Perfiles de usuario (extends auth.users) |
| `pricewaze_properties` | Listados con PostGIS location |
| `pricewaze_zones` | Zonas geogr谩ficas con boundaries |
| `pricewaze_offers` | Cadena de ofertas (self-referencing) |
| `pricewaze_visits` | Visitas GPS-verificadas |
| `pricewaze_agreements` | Contratos generados por AI |

**Features**:
- PostGIS `ST_Contains` para asignaci贸n autom谩tica de zonas
- Triggers para historial de precios
- RLS policies comprehensivas

## Maps & Geolocation

| Categor铆a | Tecnolog铆a | Uso |
|-----------|------------|-----|
| Map Engine | Mapbox GL | 3.17 | Renderizado, interacci贸n |
| React Binding | react-map-gl | 8.1 | Componentes declarativos |
| Geospatial | PostGIS | - | Queries espaciales en Supabase |

## AI Integration

### DeepSeek (Tiempo Real)
```
/src/lib/ai/
  鈹溾攢鈹 pricing.ts    # Fairness scoring, offer suggestions
  鈹斺攢鈹 contracts.ts  # Generaci贸n de contratos
```

### CrewAI (An谩lisis Complejos)
```
/crewai/
  鈹溾攢鈹 agents/       # MarketAnalyst, PricingAnalyst, NegotiationAdvisor, LegalAdvisor
  鈹溾攢鈹 crews/        # PricingCrew, NegotiationCrew, ContractCrew, FullAnalysisCrew
  鈹斺攢鈹 tasks/        # Tareas especializadas por dominio
```

## Infrastructure

| Categor铆a | Tecnolog铆a | Configuraci贸n |
|-----------|------------|---------------|
| Hosting | Vercel | Edge Functions, ISR |
| Database | Supabase Cloud | Proyecto `sujeto10` |
| CI/CD | Vercel Git Integration | Auto-deploy on push |
| DNS | Vercel | - |

## Development Tools

| Tool | Prop贸sito |
|------|-----------|
| pnpm | Package manager |
| ESLint | Linting |
| tsx | Script runner |
| Ruff | Python linting (CrewAI) |
| pytest | Python testing |

## Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=

# AI
DEEPSEEK_API_KEY=
DEEPSEEK_BASE_URL=
DEEPSEEK_MODEL=

# Maps
NEXT_PUBLIC_MAPBOX_TOKEN=
```

## ADR References

- [ADR-001: Elecci贸n de Supabase sobre Firebase](./adr/ADR-001-supabase-over-firebase.md)
- [ADR-002: DeepSeek como AI Provider](./adr/ADR-002-deepseek-ai-provider.md)
- [ADR-003: CrewAI para Multi-Agent](./adr/ADR-003-crewai-multiagent.md)
- [ADR-004: Zustand sobre Redux](./adr/ADR-004-zustand-state.md)
