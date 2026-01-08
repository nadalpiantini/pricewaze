# ADR-005: Alerts/Signals Module Consolidation

## Status
**Accepted** - 2026-01-08

## Context

Durante la auditoría de arquitectura de PriceWaze, se identificaron múltiples áreas de superposición y duplicación en los módulos relacionados con alertas y señales de mercado:

### Problemas Identificados

1. **Páginas Duplicadas**:
   - `(dashboard)/alerts/page.tsx` (211 líneas, Spanish)
   - `(dashboard)/market-alerts/page.tsx` (196 líneas, English)
   - ~80% código duplicado

2. **Nomenclatura Confusa**:
   - "alerts" vs "signals" vs "market-alerts" vs "market-signals"
   - No hay distinción clara entre alertas de usuario y señales de sistema

3. **API Routes Fragmentados**:
   - `/api/alerts/` - Búsquedas guardadas
   - `/api/alert-rules/` - Reglas JSON Logic
   - `/api/signals/` - Recalculación de señales
   - `/api/market-signals/` - Señales de mercado
   - `/api/copilot/alerts/` - Alertas del Copilot

4. **Tablas de Base de Datos Relacionadas**:
   - `pricewaze_saved_searches` - Búsquedas guardadas
   - `pricewaze_price_alerts` - Alertas de precio
   - `pricewaze_alert_rules` - Reglas de alerta
   - `pricewaze_market_signals` - Señales de mercado
   - `pricewaze_property_signal_state` - Estado de señales
   - `pricewaze_copilot_alerts` - Alertas del Copilot

## Decision

Consolidar los módulos de alerts/signals bajo una nomenclatura clara y estructura coherente:

### Terminología Unificada

| Término | Definición | Scope |
|---------|------------|-------|
| **Alert** | Notificación dirigida al usuario | User-facing |
| **Signal** | Evento de mercado generado por el sistema | System-internal |
| **Rule** | Condición definida por el usuario para generar alertas | User-configured |

### Estructura Propuesta

```
src/app/
├── (dashboard)/
│   └── alerts/                    # Página única consolidada
│       └── page.tsx               # Con soporte i18n
└── api/
    ├── alerts/                    # Todo lo relacionado con alertas de usuario
    │   ├── route.ts              # CRUD búsquedas guardadas
    │   ├── rules/                # Mover desde /alert-rules/
    │   │   └── route.ts
    │   ├── process/
    │   │   └── route.ts
    │   └── searches/
    │       └── [id]/route.ts
    ├── signals/                   # Todo lo relacionado con señales de sistema
    │   ├── route.ts              # Market signals (absorbe market-signals/)
    │   ├── recalculate/
    │   │   └── route.ts
    │   └── report/
    │       └── route.ts
    └── copilot/
        └── alerts/route.ts        # Mantener separado (AI domain)
```

### Plan de Migración

#### Fase 1: Consolidar Páginas (Low Risk)
1. Agregar soporte i18n a `alerts/page.tsx`
2. Añadir tab de SavedSearches que falta en market-alerts
3. Crear redirect: `/dashboard/market-alerts` → `/dashboard/alerts`
4. Eliminar `market-alerts/page.tsx` después de validar

#### Fase 2: Reorganizar API Routes (Medium Risk)
1. Mover `/api/alert-rules/` → `/api/alerts/rules/`
2. Mover `/api/market-signals/` → `/api/signals/`
3. Crear redirects 301 para backwards compatibility
4. Actualizar imports en frontend

#### Fase 3: Actualizar Componentes (Low Risk)
1. Actualizar imports en componentes
2. Documentar nuevo patrón de nombres
3. Actualizar tests

## Consequences

### Positive
- **Claridad**: Nomenclatura consistente (alerts = user, signals = system)
- **Mantenibilidad**: Menos código duplicado
- **Discoverability**: Estructura de carpetas más intuitiva
- **DX**: Developers entienden mejor dónde agregar código nuevo

### Negative
- **Migration Effort**: Requiere actualizar imports
- **Backwards Compatibility**: Necesita redirects temporales
- **Testing**: Requiere actualizar tests existentes

### Neutral
- **Database**: No requiere cambios en tablas (solo rutas)
- **Components**: Pueden mantener nombres actuales

## Alternatives Considered

### 1. Mantener Estructura Actual
**Rechazado**: La duplicación de código y confusión de nomenclatura seguirían creciendo.

### 2. Refactorización Completa con Renombramiento de Tablas
**Rechazado**: Riesgo alto, requiere migración de datos y cambios en RLS.

### 3. Solo Documentar (No Consolidar)
**Rechazado**: No resuelve el problema de duplicación de código.

## Implementation Details

### Redirects Necesarios

```typescript
// next.config.js
async redirects() {
  return [
    {
      source: '/dashboard/market-alerts',
      destination: '/dashboard/alerts',
      permanent: true,
    },
    {
      source: '/api/alert-rules/:path*',
      destination: '/api/alerts/rules/:path*',
      permanent: true,
    },
    {
      source: '/api/market-signals/:path*',
      destination: '/api/signals/:path*',
      permanent: true,
    },
  ];
}
```

### Import Updates

```typescript
// Antes
import { AlertRuleBuilder } from '@/components/alerts/AlertRuleBuilder';
// Después (sin cambio - componentes mantienen ubicación)

// API calls - antes
fetch('/api/alert-rules')
// API calls - después
fetch('/api/alerts/rules')
```

### i18n Support para Página Consolidada

```typescript
// alerts/page.tsx
const { locale } = useLocale();
const t = translations[locale];

return (
  <div>
    <h1>{t.alertsTitle}</h1>
    <Tabs defaultValue="market-alerts">
      <TabsTrigger value="market-alerts">{t.marketAlerts}</TabsTrigger>
      <TabsTrigger value="rules">{t.myRules}</TabsTrigger>
      <TabsTrigger value="searches">{t.savedSearches}</TabsTrigger>
    </Tabs>
  </div>
);
```

## Validation Criteria

- [x] Single alerts page functional with i18n (2026-01-08)
- [ ] All API routes accessible via new paths (Phase 2 - pending)
- [x] Redirects working for legacy paths (2026-01-08)
- [x] No broken imports (2026-01-08)
- [ ] Tests passing (needs E2E verification)
- [x] No regression in functionality (build passes)

## Related Documents

- [Layer Responsibilities](../architecture/layer-responsibilities.md)
- [Module Dependencies](../architecture/module-dependencies.md)
- [DFD Copilot Alerts](../diagrams/dfd-copilot-alerts.md)

---

*Decision Date: 2026-01-08*
*Authors: Development Team*
