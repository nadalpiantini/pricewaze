# Data Flow Diagram: Copilot Alerts System

## Overview
Este diagrama muestra el flujo del sistema de alertas inteligentes del Copilot v1, incluyendo deteccion automatica, evaluacion y notificacion.

---

## Diagrama de Flujo Principal

```mermaid
flowchart TD
    subgraph Triggers["Eventos Trigger"]
        A[Property Viewed] -->|1| E[Alert Evaluation]
        B[Offer Created] -->|2| E
        C[Price Changed] -->|3| E
        D[Counter Offer] -->|4| E
    end

    subgraph Detection["Detection Functions (PostgreSQL)"]
        E --> F[pricewaze_detect_emotional_pricing]
        E --> G[pricewaze_detect_timing_issue]
        E --> H[pricewaze_detect_zone_inflection]
        E --> I[pricewaze_detect_suboptimal_offer]
        E --> J[pricewaze_detect_hidden_risk]
        E --> K[pricewaze_detect_silent_opportunity]
        E --> L[pricewaze_detect_bad_negotiation]
    end

    subgraph Processing["Alert Processing"]
        F --> M{Alert Generated?}
        G --> M
        H --> M
        I --> M
        J --> M
        K --> M
        L --> M

        M -->|Si| N[INSERT pricewaze_copilot_alerts]
        M -->|No| O[No action]

        N --> P[Trigger notification]
    end

    subgraph Delivery["Alert Delivery"]
        P --> Q[WebSocket / Polling]
        Q --> R[Frontend useCopilotAlerts]
        R --> S[Alert UI Component]
        S --> T[User Action]
    end

    subgraph UserActions["User Actions"]
        T -->|View Details| U[Modal/Panel]
        T -->|Dismiss| V[Mark as read]
        T -->|Act| W[Navigate to action]
    end
```

---

## Funciones de Deteccion

### 1. Emotional Pricing Detection

```mermaid
flowchart LR
    A[Property Price] --> B{Compare to Zone Average}
    B -->|> 20% above| C[ALERT: Emotional Pricing]
    B -->|Normal range| D[No alert]

    C --> E[severity: high]
    C --> F[type: emotional_pricing]
```

### 2. Timing Issue Detection

```mermaid
flowchart LR
    A[Market Signals] --> B{Analyze Timing}
    B -->|Rising market + low urgency| C[ALERT: Timing Issue]
    B -->|Falling market + high urgency| C
    B -->|Normal| D[No alert]

    C --> E[severity: medium]
```

### 3. Zone Inflection Detection

```mermaid
flowchart LR
    A[Zone Price History] --> B{Trend Analysis}
    B -->|Significant change detected| C[ALERT: Zone Inflection]
    B -->|Stable| D[No alert]

    C --> E[type: zone_inflection]
    C --> F[Include trend data]
```

### 4. Suboptimal Offer Detection

```mermaid
flowchart LR
    A[Offer Amount] --> B{Compare to AI Tiers}
    B -->|Below conservative| C[ALERT: Too Aggressive]
    B -->|Above market| D[ALERT: Overpaying]
    B -->|Optimal range| E[No alert]
```

### 5. Hidden Risk Detection

```mermaid
flowchart LR
    A[Property + Market Data] --> B{Risk Analysis}
    B -->|High days on market| C[Risk: Slow sale]
    B -->|Price drops history| D[Risk: Unstable price]
    B -->|Zone decline| E[Risk: Area declining]

    C --> F[ALERT: Hidden Risk]
    D --> F
    E --> F
```

### 6. Silent Opportunity Detection

```mermaid
flowchart LR
    A[Property Metrics] --> B{Opportunity Analysis}
    B -->|Underpriced vs zone| C[ALERT: Silent Opportunity]
    B -->|Rising zone + stable price| C
    B -->|Normal| D[No alert]
```

### 7. Bad Negotiation Detection

```mermaid
flowchart LR
    A[Offer Chain] --> B{Pattern Analysis}
    B -->|Increasing offers without progress| C[ALERT: Bad Negotiation]
    B -->|Seller not moving| C
    B -->|Normal progression| D[No alert]
```

---

## Flujo de Datos en Base de Datos

```mermaid
erDiagram
    pricewaze_properties ||--o{ pricewaze_copilot_alerts : generates
    pricewaze_offers ||--o{ pricewaze_copilot_alerts : generates
    pricewaze_profiles ||--o{ pricewaze_copilot_alerts : receives
    pricewaze_user_twin ||--|| pricewaze_profiles : configures

    pricewaze_copilot_alerts {
        uuid id PK
        uuid user_id FK
        uuid property_id FK
        string alert_type
        string severity
        jsonb context
        boolean is_read
        timestamp created_at
    }
```

---

## API Endpoints

### GET /api/copilot/alerts
```typescript
// Response
{
  alerts: CopilotAlert[];
  unread_count: number;
  last_checked: string;
}
```

### POST /api/copilot/property-viewed
```typescript
// Request
{ property_id: string }

// Response - Triggers alert evaluation
{ alerts: CopilotAlert[] }
```

### PATCH /api/copilot/alerts/[id]
```typescript
// Request
{ is_read: true }

// Response
{ success: boolean }
```

---

## Frontend Integration

### useCopilotAlerts Hook

```mermaid
flowchart LR
    A[Component Mount] --> B[useQuery: fetch alerts]
    B --> C[React Query Cache]
    C --> D[Render Alert Badge]

    E[Property Viewed Event] --> F[POST property-viewed]
    F --> G[Invalidate Query]
    G --> B

    H[User marks read] --> I[PATCH alert]
    I --> J[Optimistic Update]
    J --> C
```

### Alert UI States

```mermaid
stateDiagram-v2
    [*] --> Unread: New alert
    Unread --> Read: User views
    Read --> Dismissed: User dismisses
    Unread --> ActionTaken: User acts
    ActionTaken --> [*]
    Dismissed --> [*]
```

---

## Tablas Involucradas

| Tabla | Rol |
|-------|-----|
| `pricewaze_copilot_alerts` | Almacena alertas generadas |
| `pricewaze_user_twin` | Configuracion de preferencias |
| `pricewaze_properties` | Datos para analisis |
| `pricewaze_offers` | Ofertas para analisis |
| `pricewaze_property_signals` | Senales de mercado |

---

## Alert Types y Severities

| Type | Severity | Description |
|------|----------|-------------|
| `emotional_pricing` | high | Precio inflado por emociones |
| `timing_issue` | medium | Mal momento para actuar |
| `zone_inflection` | medium | Cambio de tendencia en zona |
| `suboptimal_offer` | medium | Oferta fuera de rango optimo |
| `hidden_risk` | high | Riesgo oculto detectado |
| `silent_opportunity` | low | Oportunidad no evidente |
| `bad_negotiation` | high | Patron de negociacion pobre |

---

## Archivos Relevantes

- `src/app/api/copilot/alerts/route.ts` - API endpoints
- `src/app/api/copilot/property-viewed/route.ts` - Trigger evaluation
- `src/hooks/useCopilotAlerts.ts` - React hook
- `src/components/copilot/` - UI components
- `src/lib/die/copilot-explanations.ts` - Explanation generation
- `supabase/migrations/` - Detection functions SQL

---

## Performance Considerations

1. **Caching**: React Query con staleTime de 30s
2. **Batch Processing**: Multiples detections en una transaccion
3. **Indexing**: Indices en user_id, property_id, is_read
4. **Polling**: Fallback cada 60s si no hay WebSocket

---

*Ultima actualizacion: 2026-01-08*
