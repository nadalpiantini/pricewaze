# Feature Development Checklist

> Template siguiendo metodologia Edward Honour para desarrollo de nuevas funcionalidades

---

## Identificacion

| Campo | Valor |
|-------|-------|
| **Feature ID** | [MODULE]-[THEME]-[NUMBER] (ej: AUTH-001) |
| **Nombre** | [Nombre descriptivo del feature] |
| **Theme** | [Objetivo de usuario que resuelve] |
| **Module** | [AUTH/PROP/MAP/PRICE/OFFER/VISIT/CONTRACT/CREW/ALERTS/COPILOT] |
| **Desarrollador** | [Nombre] |
| **Fecha Inicio** | [YYYY-MM-DD] |

---

## Pre-Desarrollo

### Analisis
- [ ] Requisitos funcionales documentados
- [ ] Requisitos no funcionales identificados (perf, security, a11y)
- [ ] Mockups/wireframes revisados (si aplica)
- [ ] Dependencias identificadas (otros features, APIs externas)
- [ ] Impacto en modulos existentes evaluado

### Diseno
- [ ] Flujo de datos definido (ver `docs/data-flow/canonical.md`)
- [ ] Limites de responsabilidad claros (API vs UI vs AI)
- [ ] Contratos de API definidos (request/response shapes)
- [ ] Schema de base de datos revisado (si hay cambios)
- [ ] Feature flag creado (si necesario)

### Planificacion
- [ ] Tasks atomicas identificadas (ver `docs/bmad/module-themes-tasks.md`)
- [ ] Estimacion de esfuerzo realizada
- [ ] Branch creado: `feature/[module]-[descripcion]`

---

## Desarrollo

### Backend (API Routes)
- [ ] Ruta API creada en `/api/[module]/`
- [ ] Validacion con Zod implementada
- [ ] Autenticacion verificada (`await createClient()`)
- [ ] RLS policies revisadas en Supabase
- [ ] Error handling siguiendo `docs/standards/error-handling.md`
- [ ] Tipos TypeScript correctos (no `any`)

### Frontend (Componentes)
- [ ] Componentes siguiendo patrones de `docs/standards/component-patterns.md`
- [ ] Estados de loading implementados
- [ ] Error boundaries aplicados
- [ ] Responsive design verificado
- [ ] `data-testid` agregados para E2E

### AI Integration (si aplica)
- [ ] Limites de AI respetados (ver `docs/ai/ai-boundaries.md`)
- [ ] Fallback cuando AI no disponible
- [ ] Prompts documentados
- [ ] Rate limiting considerado

### CrewAI (si aplica)
- [ ] Crew/Agent definido en `crewai/`
- [ ] Endpoint API en `/api/crewai/`
- [ ] Integracion documentada en `docs/integrations/`

---

## Calidad

### Testing
- [ ] Unit tests escritos (Jest)
- [ ] Tests E2E escritos (Playwright)
- [ ] Happy path cubierto
- [ ] Edge cases cubiertos
- [ ] Tests pasando localmente

### Codigo
- [ ] `pnpm build` pasa sin errores
- [ ] `pnpm lint` pasa sin errores
- [ ] No hay warnings de TypeScript nuevos
- [ ] Imports usando alias `@/*`
- [ ] No console.logs en produccion

### Documentacion
- [ ] JSDOC en funciones publicas
- [ ] README actualizado (si cambios significativos)
- [ ] ADR creado (si decision arquitectonica)
- [ ] `docs/bmad/module-themes-tasks.md` actualizado

---

## Pre-Merge

### Review
- [ ] PR creado con descripcion clara
- [ ] Cambios de DB documentados (migraciones)
- [ ] Screenshots/videos incluidos (si UI)
- [ ] Reviewer asignado
- [ ] CI pipeline pasando

### Verificacion Final
- [ ] Feature flag configurado correctamente
- [ ] Variables de entorno documentadas
- [ ] Rollback plan definido
- [ ] Impacto en otros features verificado

---

## Post-Merge

- [ ] Feature flag activado (si estaba desactivado)
- [ ] Monitoring verificado
- [ ] Documentacion de release actualizada
- [ ] Stakeholders notificados
- [ ] Task marcada como completada en tracking

---

## Notas

[Espacio para notas adicionales, decisiones tomadas, blockers encontrados]

---

*Template version: 1.0 | Ultima actualizacion: 2026-01-08*
