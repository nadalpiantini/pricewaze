# PriceWaze Risk Register

## Overview

Este documento cataloga los riesgos identificados del proyecto, su probabilidad, impacto y estrategias de mitigacion.

---

## Risk Matrix

| Impacto / Probabilidad | Bajo | Medio | Alto |
|------------------------|------|-------|------|
| **Alto** | R-003, R-007 | R-001, R-005 | R-002 |
| **Medio** | R-008 | R-004, R-006 | R-009 |
| **Bajo** | R-010 | - | - |

---

## Riesgos Activos

### R-001: DeepSeek API Rate Limits

| Atributo | Valor |
|----------|-------|
| **Categoria** | External Dependency |
| **Probabilidad** | Media (60%) |
| **Impacto** | Alto |
| **Status** | Monitoreando |

**Descripcion**: DeepSeek tiene rate limits que podrian afectar la experiencia en picos de uso.

**Indicadores**:
- 429 errors en logs
- Latencia >3s en AI responses

**Mitigacion**:
1. Implementar request queuing
2. Cache de respuestas comunes (pricing analysis)
3. Fallback a respuestas pre-calculadas
4. Plan: Evaluar tier de API superior

**Owner**: Backend Team
**Revision**: Quincenal

---

### R-002: PostGIS Query Performance

| Atributo | Valor |
|----------|-------|
| **Categoria** | Performance |
| **Probabilidad** | Alta (75%) |
| **Impacto** | Alto |
| **Status** | Mitigacion activa |

**Descripcion**: Queries espaciales pueden ser lentas en zonas con alta densidad de propiedades.

**Indicadores**:
- Query time >500ms
- Timeout en zone aggregations

**Mitigacion**:
1. [x] Indices espaciales (GIST) en `properties.location`
2. [ ] Materialized views para zone stats
3. [ ] Query result caching (Redis/Supabase Edge)
4. [ ] Pagination en resultados de mapa

**Owner**: Database Team
**Revision**: Semanal durante desarrollo activo

---

### R-003: CrewAI Integration Complexity

| Atributo | Valor |
|----------|-------|
| **Categoria** | Technical Debt |
| **Probabilidad** | Baja (30%) |
| **Impacto** | Alto |

**Descripcion**: Bridge Python/TypeScript puede introducir bugs dificiles de debuggear.

**Mitigacion**:
1. Tests exhaustivos en `/api/crewai/*` routes
2. Logging estructurado en ambos lados
3. Circuit breaker pattern para llamadas a Python
4. Documentacion de errores comunes

**Owner**: Full-Stack Team

---

### R-004: Supabase Vendor Lock-in

| Atributo | Valor |
|----------|-------|
| **Categoria** | Strategic |
| **Probabilidad** | Media (50%) |
| **Impacto** | Medio |

**Descripcion**: Dependencia fuerte en Supabase para Auth, DB, Storage, y Realtime.

**Mitigacion**:
1. Abstraccion de clients en `src/lib/supabase/`
2. Schema migrations versionados
3. Backups regulares de datos
4. Documentar alternativas (Neon, Planetscale)

**Owner**: Architecture Team
**Revision**: Trimestral

---

### R-005: Security Vulnerabilities

| Atributo | Valor |
|----------|-------|
| **Categoria** | Security |
| **Probabilidad** | Media (40%) |
| **Impacto** | Alto |

**Descripcion**: RLS policies complejas pueden tener gaps de seguridad.

**Indicadores**:
- Audit logs de accesos anomalos
- Dependabot alerts

**Mitigacion**:
1. [x] RLS policies por tabla
2. [ ] Security audit trimestral
3. [ ] Penetration testing antes de launch
4. [ ] Rate limiting en auth endpoints
5. [ ] Input sanitization (Zod validation)

**Owner**: Security Lead

---

### R-006: i18n Inconsistency

| Atributo | Valor |
|----------|-------|
| **Categoria** | UX |
| **Probabilidad** | Media (50%) |
| **Impacto** | Medio |

**Descripcion**: Sin libreria i18n centralizada, traducciones pueden quedar inconsistentes.

**Mitigacion**:
1. Patron estandar de traducciones (ver alerts/page.tsx)
2. Checklist de i18n en PR reviews
3. Evaluar next-intl o similar para Q2

**Owner**: Frontend Team

---

### R-007: Mobile Responsiveness

| Atributo | Valor |
|----------|-------|
| **Categoria** | UX |
| **Probabilidad** | Baja (25%) |
| **Impacto** | Alto |

**Descripcion**: Componentes complejos (mapas, tablas) pueden funcionar mal en mobile.

**Mitigacion**:
1. [x] Mobile tests suite (130 validaciones)
2. [ ] Breakpoint consistency audit
3. [ ] Touch gestures para mapa

**Owner**: Frontend Team

---

### R-008: Test Coverage Gaps

| Atributo | Valor |
|----------|-------|
| **Categoria** | Quality |
| **Probabilidad** | Baja (20%) |
| **Impacto** | Medio |

**Descripcion**: Cobertura de tests insuficiente puede permitir regresiones.

**Mitigacion**:
1. Target 80% coverage en Q1
2. E2E tests para flujos criticos
3. Pre-commit hooks con tests
4. CI blocking on test failures

**Owner**: QA Team

---

### R-009: AI Hallucination in Contracts

| Atributo | Valor |
|----------|-------|
| **Categoria** | Legal/Compliance |
| **Probabilidad** | Media (45%) |
| **Impacto** | Medio |

**Descripcion**: DeepSeek podria generar clausulas incorrectas en contratos.

**Mitigacion**:
1. Disclaimer legal en UI
2. Human review flag
3. Template-based generation (reduce hallucination)
4. CrewAI LegalAdvisor review

**Owner**: Product + Legal

---

### R-010: Build/Deploy Complexity

| Atributo | Valor |
|----------|-------|
| **Categoria** | DevOps |
| **Probabilidad** | Baja (15%) |
| **Impacto** | Bajo |

**Descripcion**: Configuracion de Next.js + Supabase + CrewAI puede complicar deployments.

**Mitigacion**:
1. Documentacion en CLAUDE.md
2. Docker compose para dev local
3. CI/CD pipelines testeados
4. Rollback procedures

**Owner**: DevOps

---

## Riesgos Cerrados

| ID | Descripcion | Resolucion | Fecha |
|----|-------------|------------|-------|
| R-011 | Module overlap alerts/signals | ADR-005 implementado | 2026-01-08 |

---

## Proceso de Gestion

### Identificacion
- Cualquier miembro puede agregar riesgos
- Review semanal de nuevos riesgos

### Evaluacion
- Probabilidad: Baja (<30%), Media (30-60%), Alta (>60%)
- Impacto: Bajo, Medio, Alto

### Mitigacion
- Asignar owner
- Definir acciones concretas
- Establecer indicadores

### Monitoreo
- Revision semanal de riesgos altos
- Revision quincenal de riesgos medios
- Revision mensual de riesgos bajos

---

*Ultima actualizacion: 2026-01-08*
*Proximo review: 2026-01-15*
