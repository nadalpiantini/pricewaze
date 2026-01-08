# Technical Debt Registry

Este documento cataloga la deuda técnica identificada en PriceWaze, priorizada por impacto y esfuerzo.

---

## Resumen

| Prioridad | Cantidad | Sprint Allocation |
|-----------|----------|-------------------|
| 🔴 Alta | 3 | 15% del sprint |
| 🟡 Media | 5 | 10% del sprint |
| 🟢 Baja | 4 | 5% del sprint |

---

## 🔴 Prioridad Alta

### TD-001: Middleware Deprecation Warning
**Ubicación**: `src/middleware.ts`
**Descripción**: Next.js 16 deprecated "middleware" convention, requiere migración a "proxy"
**Impacto**: Build warnings, futura incompatibilidad
**Esfuerzo**: 2-4 horas
**Estado**: Pendiente

### TD-002: Overlapping Alert Modules
**Ubicación**: `src/app/api/alerts/`, `src/app/api/market-alerts/`
**Descripción**: Funcionalidad duplicada entre módulos de alertas (ver ADR-005)
**Impacto**: Mantenibilidad, confusión de desarrolladores
**Esfuerzo**: 1-2 días
**Estado**: Planificado (Strangler Fig pattern)
**Referencia**: [ADR-005](./adr/ADR-005-module-consolidation.md)

### TD-003: metadataBase Warning
**Ubicación**: `src/app/layout.tsx` y páginas
**Descripción**: metadataBase property no configurada para Open Graph
**Impacto**: SEO, social sharing
**Esfuerzo**: 30 minutos
**Estado**: Pendiente

---

## 🟡 Prioridad Media

### TD-004: Console.log en Producción
**Ubicación**: Varios archivos API
**Descripción**: Logs de debug que deberían usar logger estructurado
**Impacto**: Performance, seguridad de información
**Esfuerzo**: 2-3 horas
**Estado**: Pendiente

### TD-005: Error Handling Inconsistente
**Ubicación**: `/api/*`
**Descripción**: Diferentes formatos de error response entre endpoints
**Impacto**: DX, consistencia de cliente
**Esfuerzo**: 4-6 horas
**Estado**: Pendiente

### TD-006: Type Assertions (as any)
**Ubicación**: Varios archivos
**Descripción**: Uso de `as any` que bypasea type safety
**Impacto**: Type safety, bugs potenciales
**Esfuerzo**: 2-4 horas
**Estado**: Pendiente
**Comando**: `grep -r "as any" src/`

### TD-007: Hardcoded Strings
**Ubicación**: Componentes UI
**Descripción**: Strings de UI hardcodeados en lugar de i18n
**Impacto**: Internacionalización futura
**Esfuerzo**: 1-2 días (cuando se implemente i18n)
**Estado**: Diferido

### TD-008: Missing Loading States
**Ubicación**: Varios componentes
**Descripción**: Algunos componentes no manejan estado de carga
**Impacto**: UX, perceived performance
**Esfuerzo**: 2-3 horas
**Estado**: Pendiente

---

## 🟢 Prioridad Baja

### TD-009: Unused Dependencies
**Ubicación**: `package.json`
**Descripción**: Posibles dependencias no utilizadas
**Impacto**: Bundle size, seguridad
**Esfuerzo**: 1 hora
**Estado**: Pendiente
**Comando**: `npx depcheck`

### TD-010: Test Coverage Gaps
**Ubicación**: `/tests/`
**Descripción**: Módulos sin cobertura E2E (DIE, Gamification)
**Impacto**: Confidence en deploys
**Esfuerzo**: 4-8 horas
**Estado**: Pendiente

### TD-011: Playwright Test Flakiness
**Ubicación**: `/tests/e2e/`
**Descripción**: Algunos tests tienen race conditions ocasionales
**Impacto**: CI reliability
**Esfuerzo**: 2-3 horas
**Estado**: Monitoreo

### TD-012: Database Migration Consolidation
**Ubicación**: `/supabase/migrations/`
**Descripción**: 20+ migrations que podrían consolidarse
**Impacto**: Deployment time, clarity
**Esfuerzo**: 4 horas (requiere ambiente staging)
**Estado**: Diferido

---

## Proceso de Gestión

### Agregar Nueva Deuda
1. Crear entrada con formato `TD-XXX`
2. Clasificar prioridad (Alta/Media/Baja)
3. Estimar esfuerzo
4. Asignar estado inicial

### Estados
- **Pendiente**: Identificado, no planificado
- **Planificado**: Asignado a sprint futuro
- **En Progreso**: Trabajo activo
- **Completado**: Resuelto y verificado
- **Diferido**: Pospuesto intencionalmente
- **Monitoreo**: Observando, no requiere acción inmediata

### Sprint Allocation
- 10-15% del tiempo de cada sprint dedicado a reducir deuda técnica
- Priorizar items que bloquean features o causan bugs recurrentes

---

## Métricas

| Métrica | Valor Actual | Target |
|---------|--------------|--------|
| Items Alta Prioridad | 3 | 0 |
| Items Totales | 12 | <10 |
| Ratio Creación/Resolución | N/A | <1.0 |

---

## Historial

| Fecha | Acción | Item |
|-------|--------|------|
| 2026-01-08 | Creación inicial | TD-001 a TD-012 |

---

*Última actualización: 2026-01-08*
