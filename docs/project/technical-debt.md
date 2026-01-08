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

### TD-001: `any` Types in Components

| Atributo | Valor |
|----------|-------|
| **Prioridad** | P2 |
| **Categoria** | Type Safety |
| **Archivos** | 15+ componentes |
| **Esfuerzo** | 4-6 horas |

**Descripcion**: Multiples componentes usan `any` en callbacks y props.

**Ejemplo**:
```typescript
// alerts/page.tsx:146
rules.filter((r: any) => r.active)
```

**Solucion**:
1. Crear interfaces en `src/types/alerts.ts`
2. Reemplazar `any` con tipos especificos
3. Habilitar `noImplicitAny` en tsconfig

**Archivos afectados**:
- `src/app/(dashboard)/alerts/page.tsx`
- `src/components/alerts/MarketAlertsFeed.tsx`
- `src/components/offers/OfferCard.tsx`

---

### TD-002: Unused Imports/Variables

| Atributo | Valor |
|----------|-------|
| **Prioridad** | P3 |
| **Categoria** | Code Quality |
| **Archivos** | 20+ |
| **Esfuerzo** | 2-3 horas |

**Descripcion**: ESLint reporta 199 warnings de variables no usadas.

**Solucion**:
1. Ejecutar `pnpm lint --fix`
2. Review manual de casos edge
3. Agregar a pre-commit hook

---

### TD-003: Inconsistent Error Handling

| Atributo | Valor |
|----------|-------|
| **Prioridad** | P1 |
| **Categoria** | Reliability |
| **Archivos** | API routes |
| **Esfuerzo** | 8-10 horas |

**Descripcion**: API routes manejan errores de formas diferentes.

**Ejemplo actual**:
```typescript
// Inconsistente
return NextResponse.json({ error: 'Failed' }, { status: 500 });
return new Response('Error', { status: 500 });
throw new Error('...');
```

**Solucion**:
1. Ver `docs/standards/error-handling.md`
2. Implementar `apiError()` helper
3. Refactorizar rutas existentes
4. Agregar ErrorBoundary en frontend

---

### TD-004: Database Query N+1

| Atributo | Valor |
|----------|-------|
| **Prioridad** | P1 |
| **Categoria** | Performance |
| **Archivos** | `api/properties/` |
| **Esfuerzo** | 4-6 horas |

**Descripcion**: Algunas queries hacen multiples roundtrips innecesarios.

**Ejemplo**:
```typescript
// N+1 pattern
const properties = await supabase.from('properties').select('*');
for (const p of properties) {
  const zone = await supabase.from('zones').select('*').eq('id', p.zone_id);
}
```

**Solucion**:
1. Usar JOINs: `.select('*, zones(*)')`
2. Batch queries donde no sea posible JOIN
3. Implementar DataLoader pattern si necesario

---

### TD-005: Missing Input Validation

| Atributo | Valor |
|----------|-------|
| **Prioridad** | P0 |
| **Categoria** | Security |
| **Archivos** | 5 API routes |
| **Esfuerzo** | 3-4 horas |

**Descripcion**: Algunas rutas API no validan inputs con Zod.

**Rutas afectadas**:
- `/api/signals/report`
- `/api/notifications`
- `/api/favorites`

**Solucion**:
1. Crear schemas Zod para cada ruta
2. Validar en inicio de handler
3. Retornar errores estructurados

---

### TD-006: Hardcoded Strings

| Atributo | Valor |
|----------|-------|
| **Prioridad** | P2 |
| **Categoria** | Maintainability |
| **Archivos** | Varios componentes |
| **Esfuerzo** | 6-8 horas |

**Descripcion**: Strings de UI hardcoded en lugar de i18n.

**Afectados**:
- Error messages
- Button labels
- Placeholder text
- Tooltips

**Solucion**:
1. Seguir patron de `alerts/page.tsx` (translations object)
2. Extraer strings a archivos de traduccion
3. Crear helper `useTranslations()`

---

### TD-007: Duplicated Supabase Clients

| Atributo | Valor |
|----------|-------|
| **Prioridad** | P3 |
| **Categoria** | Code Duplication |
| **Archivos** | API routes |
| **Esfuerzo** | 2-3 horas |

**Descripcion**: Cada API route crea su propio Supabase client.

**Solucion**:
1. Middleware pattern para injectar client
2. O mantener patron actual (aceptable por Server Components)

---

### TD-008: Missing Loading States

| Atributo | Valor |
|----------|-------|
| **Prioridad** | P2 |
| **Categoria** | UX |
| **Archivos** | Varios |
| **Esfuerzo** | 4-5 horas |

**Descripcion**: Algunos componentes no muestran loading state.

**Componentes afectados**:
- `PropertySignals.tsx`
- `NegotiationTimeline.tsx`
- `VisitRouteMap.tsx`

**Solucion**:
1. Usar React Query `isLoading` state
2. Skeleton components consistentes
3. Suspense boundaries

---

### TD-009: Large Component Files

| Atributo | Valor |
|----------|-------|
| **Prioridad** | P3 |
| **Categoria** | Maintainability |
| **Archivos** | 3 componentes |
| **Esfuerzo** | 6-8 horas |

**Descripcion**: Algunos componentes tienen >500 lineas.

**Archivos**:
- `AlertRuleBuilder.tsx` (~600 lineas)
- `PropertyMap.tsx` (~450 lineas)
- `OfferNegotiationPanel.tsx` (~500 lineas)

**Solucion**:
1. Extraer subcomponentes
2. Custom hooks para logica
3. Seguir patron de Compound Components

---

### TD-010: Test Coverage

| Atributo | Valor |
|----------|-------|
| **Prioridad** | P1 |
| **Categoria** | Quality |
| **Archivos** | Codebase |
| **Esfuerzo** | 20+ horas |

**Descripcion**: Cobertura de tests estimada ~20%.

**Areas sin tests**:
- `lib/ai/` - Logica de AI
- `lib/alerts/` - Evaluacion de reglas
- Mayoria de API routes

**Solucion**:
Ver `docs/standards/testing-strategy.md`

---

## Deuda Resuelta

| ID | Descripcion | Resolucion | Fecha |
|----|-------------|------------|-------|
| TD-011 | Paginas duplicadas alerts/market-alerts | ADR-005 consolidation | 2026-01-08 |
| TD-012 | Sin ADR Log centralizado | docs/adr/ADR-LOG.md | 2026-01-08 |

---

## Metricas

| Metrica | Actual | Target |
|---------|--------|--------|
| P0 Items | 1 | 0 |
| P1 Items | 3 | <2 |
| Total Items | 10 | <15 |
| Lint Errors | 165 | <50 |
| Lint Warnings | 199 | <100 |

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
