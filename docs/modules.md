# Modules & Topics - PriceWaze

> Estructura modular siguiendo metodolog铆a Edward Honour

---

## Module Overview

```
PriceWaze
鈹溾攢鈹 AUTH     # Autenticaci贸n y perfiles
鈹溾攢鈹 PROP     # Propiedades y listados
鈹溾攢鈹 MAP      # Mapas y geolocalizaci贸n
鈹溾攢鈹 PRICE    # An谩lisis de precios AI
鈹溾攢鈹 OFFER    # Sistema de ofertas
鈹溾攢鈹 VISIT    # Visitas y verificaci贸n
鈹溾攢鈹 CONTRACT # Contratos AI
鈹斺攢鈹 CREW     # Multi-agent system
```

---

## AUTH - Autenticaci贸n

### Topics

#### AUTH-001: User Registration
```yaml
topic_id: AUTH-001
name: User Registration
description: Flujo de registro de nuevos usuarios
status: COMPLETED
assumptions:
  - Email como identificador 煤nico
  - Confirmaci贸n por email requerida
  - Supabase Auth como provider
scope:
  in_scope:
    - Registro con email/password
    - Validaci贸n de campos
    - Email de confirmaci贸n
  out_of_scope:
    - OAuth providers (Google, Apple)
    - Phone verification
tasks:
  - AUTH-001-T1: Form de registro con validaci贸n 鉁
  - AUTH-001-T2: Integraci贸n Supabase signUp 鉁
  - AUTH-001-T3: Redirect post-registro 鉁
decisions:
  - AUTH-001-D1: Password requirements (8+ chars) 鉁
files:
  - src/app/(auth)/register/page.tsx
  - src/lib/supabase/client.ts
```

#### AUTH-002: User Login
```yaml
topic_id: AUTH-002
name: User Login
description: Flujo de inicio de sesi贸n
status: COMPLETED
assumptions:
  - Session tokens via Supabase
  - Remember me persistido en localStorage
scope:
  in_scope:
    - Login email/password
    - Redirect a dashboard
    - Error handling
  out_of_scope:
    - 2FA
    - SSO/SAML
tasks:
  - AUTH-002-T1: Form de login 鉁
  - AUTH-002-T2: Integraci贸n Supabase signIn 鉁
  - AUTH-002-T3: Middleware de protecci贸n 鉁
files:
  - src/app/(auth)/login/page.tsx
  - src/middleware.ts
  - src/stores/auth-store.ts
```

---

## PROP - Propiedades

### Topics

#### PROP-001: Property Listing
```yaml
topic_id: PROP-001
name: Property Listing
description: Visualizaci贸n de listado de propiedades
status: COMPLETED
assumptions:
  - Datos en Supabase con PostGIS
  - Paginaci贸n server-side
scope:
  in_scope:
    - Grid/List view
    - Filtros b谩sicos
    - Sorting
  out_of_scope:
    - Infinite scroll
    - Saved searches
tasks:
  - PROP-001-T1: API GET /properties 鉁
  - PROP-001-T2: PropertyCard component 鉁
  - PROP-001-T3: Filtros UI 鉁
  - PROP-001-T4: Paginaci贸n 鉁
files:
  - src/app/(dashboard)/properties/page.tsx
  - src/app/api/properties/route.ts
  - src/components/property/PropertyCard.tsx
```

#### PROP-002: Property Detail
```yaml
topic_id: PROP-002
name: Property Detail
description: P谩gina de detalle de propiedad
status: COMPLETED
assumptions:
  - Gallery con m煤ltiples im谩genes
  - Integraci贸n con m贸dulo PRICE
scope:
  in_scope:
    - Gallery/Carousel
    - Specs completos
    - Ubicaci贸n en mapa
    - Quick actions (favorite, offer, visit)
  out_of_scope:
    - Virtual tour
    - 3D floor plan
files:
  - src/app/(dashboard)/properties/[id]/page.tsx
  - src/app/api/properties/[id]/route.ts
```

#### PROP-003: Property Creation
```yaml
topic_id: PROP-003
name: Property Creation
description: Formulario para listar propiedades
status: COMPLETED
assumptions:
  - Geolocalizaci贸n autom谩tica
  - Asignaci贸n de zona via PostGIS
scope:
  in_scope:
    - Multi-step form
    - Image upload
    - Geocoding
  out_of_scope:
    - Bulk import
    - MLS sync
files:
  - src/components/property/PropertyForm.tsx
  - src/app/api/properties/route.ts (POST)
```

---

## MAP - Mapas

### Topics

#### MAP-001: Interactive Map
```yaml
topic_id: MAP-001
name: Interactive Map
description: Mapa principal con propiedades
status: COMPLETED
assumptions:
  - Mapbox GL como engine
  - Clustering para performance
scope:
  in_scope:
    - Markers por propiedad
    - Clusters din谩micos
    - Popup on click
    - Zone boundaries
  out_of_scope:
    - Street view
    - Satellite toggle
decisions:
  - MAP-001-D1: Mapbox over Google Maps (costo, customizaci贸n)
files:
  - src/components/map/PropertyMap.tsx
  - src/components/map/MapMarker.tsx
```

---

## PRICE - An谩lisis de Precios

### Topics

#### PRICE-001: Fairness Score
```yaml
topic_id: PRICE-001
name: Fairness Score
description: C谩lculo de qu茅 tan justo es un precio
status: COMPLETED
assumptions:
  - DeepSeek como AI provider
  - Comparables de la misma zona
scope:
  in_scope:
    - Score 0-100
    - Justificaci贸n textual
    - Comparables usados
  out_of_scope:
    - Machine learning model propio
    - Historial de accuracy
decisions:
  - PRICE-001-D1: DeepSeek over GPT-4 (10x cheaper)
files:
  - src/lib/ai/pricing.ts
  - src/app/api/ai/pricing/route.ts
```

#### PRICE-002: Offer Suggestions
```yaml
topic_id: PRICE-002
name: Offer Suggestions
description: Sugerencias de monto de oferta
status: COMPLETED
assumptions:
  - 3 tiers: conservador, moderado, agresivo
  - Basado en fairness score y comparables
scope:
  in_scope:
    - 3 montos sugeridos
    - Probabilidad de aceptaci贸n
    - Justificaci贸n por tier
  out_of_scope:
    - Predicci贸n de contraofertas
    - Simulaci贸n de escenarios
files:
  - src/lib/ai/pricing.ts
  - src/components/pricing/OfferSuggestions.tsx
```

---

## OFFER - Sistema de Ofertas

### Topics

#### OFFER-001: Create Offer
```yaml
topic_id: OFFER-001
name: Create Offer
description: Crear una oferta en una propiedad
status: COMPLETED
scope:
  in_scope:
    - Monto y condiciones
    - Fecha de expiraci贸n
    - Mensaje al vendedor
  out_of_scope:
    - Ofertas grupales
    - Subastas
files:
  - src/app/api/offers/route.ts
  - src/components/offer/OfferForm.tsx
```

#### OFFER-002: Counter-Offers
```yaml
topic_id: OFFER-002
name: Counter-Offers
description: Cadena de ofertas y contraofertas
status: COMPLETED
assumptions:
  - Self-referencing en DB (parent_offer_id)
  - Historial completo visible
scope:
  in_scope:
    - Crear contraoferta
    - Ver historial de cadena
    - Estados: pending, accepted, rejected, countered
files:
  - src/app/api/offers/[id]/route.ts
  - src/types/offer.ts
```

---

## VISIT - Visitas

### Topics

#### VISIT-001: Schedule Visit
```yaml
topic_id: VISIT-001
name: Schedule Visit
description: Agendar visita a propiedad
status: COMPLETED
scope:
  in_scope:
    - Selecci贸n de fecha/hora
    - Request al vendedor
    - Confirmaci贸n/rechazo
files:
  - src/app/api/visits/route.ts
  - src/app/(dashboard)/visits/page.tsx
```

#### VISIT-002: GPS Verification
```yaml
topic_id: VISIT-002
name: GPS Verification
description: Verificar visita con geolocalizaci贸n
status: COMPLETED
assumptions:
  - Browser Geolocation API
  - Radius de verificaci贸n: 100m
scope:
  in_scope:
    - Check-in con GPS
    - Validaci贸n de distancia
    - Timestamp de verificaci贸n
  out_of_scope:
    - Foto verification
    - NFC/QR check-in
files:
  - src/app/api/visits/[id]/verify/route.ts
  - src/components/visit/GPSVerification.tsx
```

---

## CONTRACT - Contratos

### Topics

#### CONTRACT-001: AI Contract Generation
```yaml
topic_id: CONTRACT-001
name: AI Contract Generation
description: Generar contrato de compraventa con AI
status: IN_PROGRESS
assumptions:
  - Template base con variables
  - DeepSeek para generaci贸n
  - Disclaimer legal requerido
scope:
  in_scope:
    - Contrato b谩sico de compraventa
    - Datos auto-filled
    - Preview antes de generar
  out_of_scope:
    - Firma digital
    - Notarizaci贸n
    - M煤ltiples jurisdicciones
tasks:
  - CONTRACT-001-T1: Template base 鉁
  - CONTRACT-001-T2: API de generaci贸n 鉁
  - CONTRACT-001-T3: UI de preview 鈿
  - CONTRACT-001-T4: Export PDF 鈿
files:
  - src/lib/ai/contracts.ts
  - src/app/api/ai/contracts/route.ts
```

---

## CREW - Multi-Agent System

### Topics

#### CREW-001: Agent Architecture
```yaml
topic_id: CREW-001
name: Agent Architecture
description: Arquitectura del sistema multi-agente
status: COMPLETED
assumptions:
  - CrewAI framework
  - Python backend separado
  - Comunicaci贸n via API
scope:
  in_scope:
    - 4 agentes especializados
    - 4 crews predefinidos
    - Bridge API desde Next.js
agents:
  - MarketAnalyst: Estad铆sticas de zona, tendencias
  - PricingAnalyst: Valuaci贸n, tiers de oferta
  - NegotiationAdvisor: Estrategia de negociaci贸n
  - LegalAdvisor: Revisi贸n de contratos
crews:
  - PricingCrew: An谩lisis completo de precio
  - NegotiationCrew: Asistencia en negociaci贸n
  - ContractCrew: Generaci贸n/revisi贸n de contratos
  - FullAnalysisCrew: An谩lisis comprehensivo
files:
  - crewai/agents/*.py
  - crewai/crews/*.py
  - src/app/api/crewai/*.ts
```

---

## Dependency Graph

```
AUTH 鈫 PROP 鈫 MAP
              鈹
              v
           PRICE 鈫 OFFER 鈫 CONTRACT
              鈹
              v
           VISIT
              鈹
              v
            CREW (supports all)
```

## Priority Matrix

| Module | Business Value | Technical Risk | Priority |
|--------|---------------|----------------|----------|
| AUTH | High | Low | P0 |
| PROP | High | Low | P0 |
| MAP | High | Medium | P0 |
| PRICE | Critical | Medium | P0 |
| OFFER | Critical | Low | P0 |
| VISIT | Medium | Low | P1 |
| CONTRACT | High | High | P1 |
| CREW | Medium | High | P2 |
