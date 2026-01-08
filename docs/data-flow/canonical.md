# PriceWaze: Data Flow Canónico

> **Versión**: 1.0
> **Última actualización**: 2026-01-08
> **Estado**: Oficial

Este documento define el flujo de datos oficial de PriceWaze. Cualquier implementación que no siga este flujo debe ser corregida o justificada con un ADR.

---

## Principio Rector

```
La base de datos es la verdad.
La lógica vive en /lib.
La IA asesora, nunca decide.
La UI nunca calcula negocio.
La API orquesta, no piensa.
```

---

## Flujo Global (Macro)

```
User Action (UI)
       ↓
Client Validation (light)
       ↓
API Route (/api/*)
       ↓
Server Validation (Zod)
       ↓
Domain Logic (/lib/*)
       ↓
AI Advisory (optional, read-only)
       ↓
Persistence (Supabase)
       ↓
Side Effects (alerts, gamification, signals)
       ↓
Response
       ↓
Zustand Store
       ↓
UI Render
```

**Este es el único camino válido.**

---

## Capas del Sistema

### 1. UI Layer (`src/components/`, `src/app/`)

**Responsabilidades**:
- Renderizar datos
- Capturar input del usuario
- Validación ligera (formato, campos requeridos)
- Mostrar estados (loading, error, success)

**Prohibido**:
- Calcular precios, fairness, o cualquier lógica de negocio
- Llamar directamente a Supabase
- Mutar estado global sin pasar por stores

### 2. State Layer (`src/stores/`)

**Responsabilidades**:
- Mantener estado de UI (selecciones, favoritos, vistas recientes)
- Persistir preferencias locales
- Reflejar respuestas de API

**Prohibido**:
- Contener lógica de negocio
- Calcular derivados complejos
- Ser fuente de verdad para datos del servidor

### 3. API Layer (`src/app/api/`)

**Responsabilidades**:
- Orquestar flujos de datos
- Validar inputs con Zod
- Invocar lógica de dominio
- Manejar autenticación/autorización
- Formatear respuestas

**Prohibido**:
- Contener lógica de negocio inline
- Calcular precios o fairness directamente
- Bypassear `/lib/` por "rapidez"

### 4. Domain Layer (`src/lib/`)

**Responsabilidades**:
- Toda la lógica de negocio
- Cálculos de fairness, pricing, coherencia
- Validación de reglas de dominio
- Transformaciones de datos

**Características**:
- Funciones puras cuando sea posible
- Sin side effects (excepto logging)
- Testeables unitariamente

### 5. AI Layer (`src/lib/ai/`)

**Responsabilidades**:
- Analizar escenarios
- Generar recomendaciones
- Explicar decisiones
- Sugerir wording

**Prohibido**:
- Escribir en base de datos
- Cambiar estados
- Tomar decisiones finales
- Ser invocada directamente desde UI

### 6. Persistence Layer (Supabase)

**Responsabilidades**:
- Almacenar estado persistente
- Mantener historial inmutable
- Ejecutar RLS (Row Level Security)
- Generar signals via triggers

**Características**:
- Es la única fuente de verdad
- Cambios son auditables
- Historial no se reescribe

---

## Data Flow por Feature

### Properties

```
UI (PropertyCard / Map / List)
       ↓
/api/properties
       ↓
Zod validation
       ↓
lib/properties/*
       ↓
Supabase (pricewaze_properties)
       ↓
Signals (price/m², freshness)
       ↓
Response
       ↓
property-store
       ↓
UI
```

**Reglas**:
- UI no normaliza precios
- API no calcula métricas
- Market config se lee en lib

### Offers

```
UI (Create / Counter Offer)
       ↓
/api/offers
       ↓
Zod schema (offer intent)
       ↓
lib/offers/*
       ↓
lib/negotiation-coherence
       ↓
AI pricing advice (read-only)
       ↓
Supabase (pricewaze_offers, offer_chain)
       ↓
Gamification hooks
       ↓
Alerts engine
       ↓
Response
       ↓
UI
```

**Reglas**:
- AI no escribe ofertas
- UI no calcula fairness
- Fairness = función pura

### Negotiations

```
User Action (Accept / Counter / Ask Advice)
       ↓
/api/negotiations
       ↓
Zod (state + intent)
       ↓
lib/negotiation-coherence
       ↓
lib/die (pressure, uncertainty, dynamics)
       ↓
AI Advisory (wording + strategy)
       ↓
Supabase (negotiation_state)
       ↓
Signals (deal risk, timing)
       ↓
Notifications
       ↓
Response
       ↓
comparison-store / UI
```

**Reglas**:
- AI no cambia estados
- UI no simula outcomes
- API no tiene lógica de negociación
- Todo estado pasa por lib

### Alerts & Signals

```
Trigger (cron / event / mutation)
       ↓
lib/alerts/evaluateRule
       ↓
lib/signals/*
       ↓
Supabase (pricewaze_alerts, pricewaze_signals)
       ↓
Notifications / Copilot
       ↓
User
```

**Reglas**:
- Alerts no consultan UI
- Copilot no crea señales
- Signals son hechos, no opiniones

### AI (Aislamiento Total)

```
System asks question
       ↓
lib/ai/*
       ↓
AI Provider (DeepSeek / CrewAI)
       ↓
Structured Response
       ↓
System validates
       ↓
System decides
```

**La IA nunca entra directo al flujo principal. Siempre es un branch asesor.**

---

## Error Flow Oficial

```
Error occurs
       ↓
Classify:
  - UserError (input inválido)
  - DomainError (regla violada)
  - SystemError (infra/DB)
       ↓
Log (semantic, structured)
       ↓
Safe response (no exponer internals)
       ↓
UI feedback (toast/inline)
```

**Nunca**:
- `throw` raw errors al cliente
- `console.log` en producción
- Mensajes crípticos al usuario

---

## Dónde Vive Cada Cosa

| Cosa | Vive en |
|------|---------|
| Reglas de negocio | `/lib` |
| Decisiones de dominio | `/lib` |
| Estado persistente | Supabase |
| Asesoría | AI (read-only) |
| Copy/Wording | AI |
| Presentación | UI |
| Orquestación | API |

---

## Validación de Cumplimiento

Antes de merge, verificar:

- [ ] ¿El flujo sigue el patrón canónico?
- [ ] ¿La lógica de negocio está en `/lib`?
- [ ] ¿La AI solo asesora (no muta)?
- [ ] ¿Los errores están clasificados correctamente?
- [ ] ¿La UI no calcula nada de negocio?

---

## Referencias

- [ADR-001: Supabase over Firebase](../adr/ADR-001-supabase.md)
- [ADR-002: DeepSeek AI Provider](../adr/ADR-002-deepseek.md)
- [ADR-003: CrewAI Multi-Agent](../adr/ADR-003-crewai.md)
- [Feature Contract: Negotiations](../contracts/negotiations.md)
- [Feature Contract: Offers](../contracts/offers.md)
- [Decision Boundaries](../decision-boundaries.md)
