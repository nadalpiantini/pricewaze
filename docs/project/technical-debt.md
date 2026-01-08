# PriceWaze Technical Debt Register

## Overview

Este registro cataloga la deuda tecnica conocida del proyecto, priorizada por impacto y esfuerzo de resolucion.

---

## Priority Matrix

| Prioridad | Impacto | Esfuerzo | Accion |
|-----------|---------|----------|--------|
| P0 | Alto | Bajo | Resolver inmediatamente |
| P1 | Alto | Alto | Planificar en sprint |
| P2 | Medio | Bajo | Resolver cuando convenga |
| P3 | Medio | Alto | Evaluar ROI |
| P4 | Bajo | * | Backlog |

---

## Deuda Activa

### TD-006: Hardcoded Strings (Infrastructure Complete)

| Atributo | Valor |
|----------|-------|
| **Prioridad** | P2 |
| **Categoria** | Maintainability |
| **Estado** | Infraestructura completa, migracion incremental |
| **Esfuerzo restante** | 4-5 horas |

**Progreso**:
- ✅ `src/lib/i18n/` creado con sistema completo de traducciones
- ✅ `useTranslations()` hook implementado
- ✅ 10 namespaces definidos (common, navigation, properties, alerts, offers, pricing, routes, gamification, copilot, errors)
- ✅ `OfferNegotiationView.tsx` migrado como ejemplo
- ⏳ Componentes restantes pueden migrarse incrementalmente

**Archivos creados**:
- `src/lib/i18n/translations.ts` - Traducciones centralizadas ES/EN
- `src/lib/i18n/useTranslations.ts` - Hook para usar traducciones
- `src/lib/i18n/index.ts` - Exports

---

### TD-010: Test Coverage (Infrastructure Complete)

| Atributo | Valor |
|----------|-------|
| **Prioridad** | P2 |
| **Categoria** | Quality |
| **Estado** | Jest configurado, tests de ejemplo implementados, expansion incremental |
| **Esfuerzo restante** | 15-18 horas (para cobertura completa) |

**Progreso**:
- ✅ E2E tests: 4 archivos (auth, routes, integration, signals)
- ✅ Mobile tests: 6 archivos (visits, routes, global, dashboard, offers, properties)
- ✅ Unit tests: Jest instalado y configurado, **58 tests pasando**
- ⏳ Integration tests: Pendiente
- Cobertura estimada: ~35% (E2E + Mobile + Unit foundation)

**Infraestructura completada**:
- `jest.config.js` - Configuracion completa con ts-jest
- `jest.setup.ts` - Setup con testing-library, mocks de Next.js
- `tests/unit/lib/` - Estructura de directorios
- Scripts: `pnpm test`, `pnpm test:watch`, `pnpm test:coverage`

**Tests implementados**:
- `tests/unit/lib/signals.test.ts` - 13 tests (signal processing)
- `tests/unit/lib/evaluateRule.test.ts` - 15 tests (JSON Logic rules)
- `tests/unit/lib/market.test.ts` - 30 tests (market configuration)

**Areas para expansion incremental**:
- `lib/ai/` - Logica de AI (mock DeepSeek API)
- API routes - Integration tests con MSW
- Components - React Testing Library

**Comandos**:
```bash
pnpm test              # Run unit tests
pnpm test:watch        # Watch mode
pnpm test:coverage     # With coverage report
```

**Solucion**:
Ver `docs/standards/testing-strategy.md` para estrategia completa

---

## Deuda Resuelta

| ID | Descripcion | Resolucion | Fecha |
|----|-------------|------------|-------|
| TD-003 | Inconsistent Error Handling en API routes | Creado `src/lib/api/errors.ts` con `apiError()`, `Errors`, `ErrorCodes`. Refactorizadas rutas criticas: offers, visits, copilot/chat, offers/[id] | 2026-01-08 |
| TD-005 | Missing Input Validation en API routes criticas | Zod schemas agregados a copilot/chat, offers, visits | 2026-01-08 |
| TD-004 | Database Query N+1 en conversations | Batch query con `.in()` en lugar de loop individual | 2026-01-08 |
| TD-011 | Paginas duplicadas alerts/market-alerts | ADR-005 consolidation | 2026-01-08 |
| TD-012 | Sin ADR Log centralizado | docs/adr/ADR-LOG.md | 2026-01-08 |
| TD-002 | Unused imports/variables | ESLint fix + underscore prefix para intencionalmente no usadas | 2026-01-08 |
| TD-007 | Duplicated Supabase Clients | False positive - arquitectura correcta (server.ts + client.ts es patron recomendado) | 2026-01-08 |
| TD-001 | `any` Types in Components | Tipos especificos agregados: AlertRule, Conversation, LineStringGeometry. LucideIcons con type assertion documentado | 2026-01-08 |
| TD-009 | Large Component Files | Outdated - archivos ya refactorizados: AlertRuleBuilder (211 lineas), PropertyMap (153 lineas), OfferNegotiationView (151 lineas) | 2026-01-08 |

---

## Metricas

| Metrica | Actual | Target |
|---------|--------|--------|
| P0 Items | 0 | 0 |
| P1 Items | 0 | <2 |
| P2 Items | 2 | <5 |
| Total Items | 2 | <15 |
| Unit Tests | 58 | 200+ |
| Lint Errors | ~25 (scripts only) | <50 |
| Lint Warnings | ~30 (scripts only) | <100 |

---

## Proceso

### Agregar Nueva Deuda
1. Identificar durante desarrollo o review
2. Documentar en este registro
3. Asignar prioridad
4. Crear issue si P0 o P1

### Resolver Deuda
1. Incluir en sprint planning (P0/P1)
2. Resolver en tiempo libre (P2/P3)
3. Actualizar este documento
4. Mover a "Deuda Resuelta"

### Review
- **Semanal**: P0 y P1
- **Quincenal**: Todo el registro
- **Pre-release**: Audit completo

---

*Ultima actualizacion: 2026-01-08*
