# Data Flow Diagram: Negotiation Flow

## Overview
Este diagrama muestra el flujo completo de negociacion en PriceWaze, desde la oferta inicial hasta el cierre del acuerdo.

---

## Diagrama de Flujo Principal

```mermaid
flowchart TD
    subgraph Buyer["Comprador"]
        A[Ver propiedad] -->|1. Solicitar analisis| B[AI Pricing Analysis]
        B -->|2. Recibir sugerencias| C{Tier de oferta}
        C -->|Conservador| D1[Oferta -15%]
        C -->|Moderado| D2[Oferta -10%]
        C -->|Agresivo| D3[Oferta -5%]
        D1 --> E[Crear Oferta]
        D2 --> E
        D3 --> E
    end

    subgraph API["API + AI Layer"]
        E -->|3. POST /api/offers| F[Offer Handler]
        F -->|4. Fairness Score| G[DeepSeek Analysis]
        G --> H[DIE: Decision Intelligence]
        H -->|5. Risk Assessment| I[NCE: Negotiation Coherence]
        I --> J[Save to DB]
    end

    subgraph Seller["Vendedor"]
        J -->|6. Notificacion| K[Ver oferta recibida]
        K -->|7. Decision| L{Respuesta}
        L -->|Aceptar| M[Acuerdo cerrado]
        L -->|Rechazar| N[Fin negociacion]
        L -->|Contraoferta| O[Nueva oferta]
    end

    subgraph CounterOffer["Contraoferta Flow"]
        O -->|8. Analisis AI| P[DeepSeek Counter Analysis]
        P -->|9. Coherence Check| Q[NCE Validation]
        Q --> R[Save counter_offer]
        R -->|10. Notificar comprador| S[Buyer reviews]
        S --> T{Decision comprador}
        T -->|Aceptar| M
        T -->|Rechazar| N
        T -->|Contraoferta| O
    end

    subgraph Agreement["Cierre"]
        M -->|11. Generar contrato| U[CrewAI ContractCrew]
        U --> V[PDF Agreement]
        V --> W[Notificar ambas partes]
    end
```

---

## Flujo de Oferta Detallado

### 1. Creacion de Oferta

```mermaid
sequenceDiagram
    participant U as Comprador
    participant UI as Offer Form
    participant API as /api/offers
    participant AI as DeepSeek
    participant DIE as Decision Intelligence
    participant DB as Supabase

    U->>UI: Ingresa monto oferta
    UI->>API: POST {property_id, amount, message}
    API->>AI: Calcular fairness_score
    AI-->>API: {score: 0.85, tier: "moderate"}
    API->>DIE: Evaluar riesgos
    DIE-->>API: {pressure_score, wait_risk, dynamics}
    API->>DB: INSERT pricewaze_offers
    DB-->>API: offer_id
    API-->>UI: {offer_id, status: "pending"}
    UI-->>U: "Oferta enviada"
```

### 2. Cadena de Ofertas (Counter-Offers)

```mermaid
flowchart LR
    subgraph OfferChain
        O1[Oferta Original] -->|parent_id: null| O2[Counter 1]
        O2 -->|parent_id: O1| O3[Counter 2]
        O3 -->|parent_id: O2| O4[Counter 3]
        O4 -->|accepted| Final[Acuerdo]
    end

    subgraph Status
        S1[pending]
        S2[countered]
        S3[accepted]
        S4[rejected]
        S5[expired]
    end
```

---

## AI Analysis Pipeline

### Decision Intelligence Engine (DIE)

```mermaid
flowchart TD
    subgraph DIE["Decision Intelligence Engine"]
        A[Property Data] --> B[Pressure Engine]
        A --> C[Wait Risk Engine]
        A --> D[Dynamics Engine]
        A --> E[Uncertainty Engine]

        B --> F[Pressure Score]
        C --> G[Wait Risk Score]
        D --> H[Market Dynamics]
        E --> I[Uncertainty Level]

        F --> J[Personalization Layer]
        G --> J
        H --> J
        I --> J

        J --> K[Final Recommendation]
    end
```

### Negotiation Coherence Engine (NCE)

```mermaid
flowchart LR
    A[Offer Amount] --> B{NCE Validation}
    B -->|Coherent| C[Allow]
    B -->|Incoherent| D[Warning]

    subgraph Checks
        E[Price vs Market]
        F[Counter vs Previous]
        G[Timing Logic]
        H[Pattern Detection]
    end

    E --> B
    F --> B
    G --> B
    H --> B
```

---

## Tablas Involucradas

| Tabla | Rol | Operaciones |
|-------|-----|-------------|
| `pricewaze_offers` | Ofertas y contraofertas | INSERT, UPDATE |
| `pricewaze_properties` | Datos de propiedad | SELECT |
| `pricewaze_property_insights` | Insights AI | INSERT, UPDATE |
| `pricewaze_agreements` | Contratos finales | INSERT |
| `pricewaze_copilot_alerts` | Alertas durante negociacion | INSERT |

---

## Estructura de Oferta

```typescript
interface Offer {
  id: string;
  property_id: string;
  buyer_id: string;
  seller_id: string;
  amount: number;
  message?: string;
  status: 'pending' | 'accepted' | 'rejected' | 'countered' | 'expired';
  parent_offer_id?: string; // Para contraofertas
  fairness_score: number;
  die_analysis: DIEAnalysis;
  nce_validation: NCEResult;
  expires_at: Date;
  created_at: Date;
  updated_at: Date;
}
```

---

## Estados de Negociacion

```mermaid
stateDiagram-v2
    [*] --> Pending: Nueva oferta
    Pending --> Accepted: Vendedor acepta
    Pending --> Rejected: Vendedor rechaza
    Pending --> Countered: Vendedor contraoferta
    Pending --> Expired: Timeout

    Countered --> Pending: Nueva contraoferta
    Countered --> Accepted: Parte acepta
    Countered --> Rejected: Parte rechaza

    Accepted --> Agreement: Generar contrato
    Rejected --> [*]
    Expired --> [*]
    Agreement --> [*]
```

---

## Copilot Alerts durante Negociacion

El Copilot puede generar alertas automaticas durante el flujo:

| Alerta | Trigger | Severidad |
|--------|---------|-----------|
| `emotional_pricing` | Precio muy alto vs mercado | High |
| `suboptimal_offer` | Oferta en tier incorrecto | Medium |
| `bad_negotiation` | Patron de negociacion pobre | High |
| `hidden_risk` | Riesgo oculto detectado | Critical |
| `silent_opportunity` | Oportunidad no aprovechada | Low |

---

## Archivos Relevantes

- `src/app/api/offers/route.ts` - CRUD ofertas
- `src/lib/die/` - Decision Intelligence Engine
- `src/lib/negotiation-coherence/` - NCE
- `src/lib/ai/pricing.ts` - Fairness scoring
- `crewai/crews/negotiation_crew.py` - CrewAI negotiation
- `src/components/offers/` - UI components

---

*Ultima actualizacion: 2026-01-08*
