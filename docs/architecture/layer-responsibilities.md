# Layer Responsibilities

## Overview

Este documento define las responsabilidades de cada capa en la arquitectura de PriceWaze, asegurando separación de concerns y mantenibilidad.

---

## Architecture Layers

```
┌─────────────────────────────────────────────────────────────┐
│                      PRESENTATION LAYER                      │
│  src/app/(dashboard)/*  |  src/components/*  |  src/stores/* │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      APPLICATION LAYER                       │
│         src/app/api/*  |  src/hooks/*  |  src/lib/*         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      DATA ACCESS LAYER                       │
│      src/lib/supabase/*  |  Database Functions (RPC)        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      EXTERNAL SERVICES                       │
│       Supabase  |  DeepSeek AI  |  CrewAI  |  Mapbox        │
└─────────────────────────────────────────────────────────────┘
```

---

## 1. Presentation Layer

### `/src/app/(dashboard)/*` - Page Components
**Responsabilidad**: Renderizado de vistas y coordinación de componentes

| DO | DON'T |
|----|-------|
| Componer componentes UI | Lógica de negocio compleja |
| Manejar estado de UI local | Llamadas directas a Supabase |
| Coordinar navegación | Transformación de datos |
| Consumir hooks y stores | Validación de negocio |

```typescript
// ✅ CORRECTO: Composición de componentes
export default function AlertsPage() {
  const { userId } = useAuth();
  return (
    <Tabs>
      <MarketAlertsFeed userId={userId} />
      <SavedSearches />
    </Tabs>
  );
}

// ❌ INCORRECTO: Lógica de negocio en página
export default function AlertsPage() {
  const { data } = await supabase.from('pricewaze_alerts').select('*');
  const filteredAlerts = data.filter(a => calculateScore(a) > 0.5);
  // Business logic should be in API/hooks
}
```

### `/src/components/*` - Reusable Components
**Responsabilidad**: UI pura y encapsulada

| DO | DON'T |
|----|-------|
| Props-driven rendering | Fetch data directamente |
| Emitir eventos via callbacks | Modificar state global |
| Styling con Tailwind | Lógica de autenticación |
| Accessibility (ARIA) | Validación de negocio |

**Categorías**:
- `ui/` - Primitivos (Button, Card, Input) - shadcn/ui
- `[domain]/` - Componentes de dominio (alerts/, offers/, properties/)
- `layout/` - Layout components (Sidebar, Header)
- `shared/` - Cross-cutting (ErrorBoundary, LoadingSpinner)

### `/src/stores/*` - State Management (Zustand)
**Responsabilidad**: Estado global cliente-side

| DO | DON'T |
|----|-------|
| Estado de sesión UI | Cache de datos server |
| Preferencias de usuario | Lógica de negocio |
| Estado de navegación | Llamadas API |
| Persistencia local | Validación de datos |

**Stores existentes**:
- `auth-store` - Sesión, token, user
- `property-store` - Favoritos, recently viewed
- `ui-store` - Sidebar, mobile state
- `onboarding-store` - Progreso onboarding

---

## 2. Application Layer

### `/src/app/api/*` - API Routes
**Responsabilidad**: Orquestación de lógica de negocio

| DO | DON'T |
|----|-------|
| Autenticación/autorización | Rendering HTML |
| Validación con Zod | Estado de UI |
| Llamar lib functions | Queries complejas inline |
| Error handling estándar | Lógica de presentación |

**Patrón estándar**:
```typescript
export async function POST(request: NextRequest) {
  // 1. Authentication
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError('AUTH_001', 401);

  // 2. Validation
  const body = await request.json();
  const result = schema.safeParse(body);
  if (!result.success) return apiError('VAL_001', 400, result.error);

  // 3. Business Logic (delegate to lib)
  const data = await businessFunction(result.data);

  // 4. Response
  return NextResponse.json(data, { status: 201 });
}
```

### `/src/hooks/*` - React Hooks
**Responsabilidad**: Encapsular lógica React reutilizable

| DO | DON'T |
|----|-------|
| Data fetching (React Query) | Lógica de negocio pura |
| Suscripciones/real-time | Transformaciones complejas |
| Side effects | Llamadas directas a DB |
| Composición de estado | Validación de negocio |

```typescript
// ✅ CORRECTO: Hook de data fetching
export function useAlertRules(userId: string) {
  return useQuery({
    queryKey: ['alert-rules', userId],
    queryFn: () => fetch('/api/alert-rules').then(r => r.json()),
  });
}
```

### `/src/lib/*` - Business Logic
**Responsabilidad**: Lógica de negocio pura y reutilizable

| DO | DON'T |
|----|-------|
| Cálculos de negocio | Estado de React |
| Validaciones | UI rendering |
| Transformaciones | HTTP handling |
| Integraciones externas | Autenticación |

**Estructura actual**:
```
lib/
├── ai/                    # DeepSeek integration
│   ├── pricing.ts         # Fairness scoring, offer suggestions
│   └── contracts.ts       # Contract generation
├── alerts/                # Alert system
│   ├── evaluateRule.ts    # JSON Logic evaluation
│   └── generateSignals.ts # Market signal generation
├── decision-panel/        # DIE (Decision Intelligence)
├── negotiation-coherence/ # NCE (Negotiation Coherence)
├── supabase/              # Database clients
├── utils/                 # Utilities (cn, formatters)
└── logger.ts              # Logging
```

---

## 3. Data Access Layer

### `/src/lib/supabase/*` - Database Clients
**Responsabilidad**: Conexión y queries a Supabase

| DO | DON'T |
|----|-------|
| Client creation | Business logic |
| Auth helpers | Data transformation |
| Type-safe queries | Presentation |
| Connection management | Error messages UI |

**Clientes disponibles**:
- `server.ts` - Server-side client (API routes)
- `client.ts` - Client-side client (hooks, components)
- `supabaseAdmin` - Service role client (background jobs)

### Database Functions (RPC)
**Responsabilidad**: Lógica de datos compleja en PostgreSQL

| DO | DON'T |
|----|-------|
| Queries complejas | Business logic |
| Aggregations | External API calls |
| Triggers | UI concerns |
| Row Level Security | Application state |

**Functions existentes**:
- `pricewaze_evaluate_all_alerts` - Evaluate Copilot alerts
- `pricewaze_recalculate_signal_state` - Signal decay calculation
- `pricewaze_assign_zone` - PostGIS zone assignment

---

## 4. External Services Layer

### DeepSeek AI
- **Location**: `lib/ai/`
- **Responsabilidad**: AI-powered analysis (pricing, contracts, advice)
- **Pattern**: OpenAI SDK compatible, fallback logic

### CrewAI (Python)
- **Location**: `/crewai/`
- **Responsabilidad**: Multi-agent analysis workflows
- **Integration**: API routes in `/api/crewai/`

### Supabase
- **Responsabilidad**: Database, Auth, Storage, Realtime
- **Pattern**: Server/client clients con RLS

### Mapbox
- **Responsabilidad**: Map rendering, geocoding
- **Pattern**: react-map-gl components

---

## Module Ownership Matrix

| Domain | Pages | Components | API | Lib | Store |
|--------|-------|------------|-----|-----|-------|
| **Auth** | (auth)/* | - | - | supabase | auth-store |
| **Properties** | properties/* | properties/ | properties/ | - | property-store |
| **Offers** | offers/* | offers/ | offers/ | ai/pricing | - |
| **Negotiations** | negotiations/* | negotiations/ | negotiations/ | negotiation-coherence | - |
| **Alerts** | alerts/* | alerts/ | alerts/, alert-rules/ | alerts/ | - |
| **Signals** | - | signals/ | signals/, market-signals/ | alerts/generateSignals | - |
| **Copilot** | - | copilot/ | copilot/ | ai/ | - |
| **Visits** | visits/* | visits/ | visits/, routes/ | - | - |
| **Gamification** | - | gamification/ | gamification/ | - | - |

---

## Anti-Patterns to Avoid

### 1. Fat Components
```typescript
// ❌ Component doing too much
function PropertyCard({ id }) {
  const { data } = await supabase.from('properties').select('*');
  const score = calculateFairness(data.price);
  // ... 200 lines of logic
}

// ✅ Delegate to hooks and lib
function PropertyCard({ property }) {
  const { fairnessScore } = usePropertyAnalysis(property.id);
  return <Card>...</Card>;
}
```

### 2. API Route with Presentation Logic
```typescript
// ❌ API returning HTML/formatted strings
return NextResponse.json({
  message: `<strong>Price dropped!</strong>`,
  html: renderToString(<Alert />),
});

// ✅ Return data, let client render
return NextResponse.json({
  type: 'price_drop',
  amount: 5000,
  percentage: 5.2,
});
```

### 3. Direct Supabase in Components
```typescript
// ❌ Direct DB access in component
function AlertList() {
  const { data } = await supabase.from('pricewaze_alerts').select('*');
}

// ✅ Use API routes or hooks
function AlertList() {
  const { data } = useAlerts();
}
```

---

*Ultima actualizacion: 2026-01-08*
