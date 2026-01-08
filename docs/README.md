# PriceWaze Documentation

> Documentacion tecnica siguiendo metodologia Edward Honour para desarrollo SaaS con AI

## Estructura de Documentos

```
docs/
├── README.md                    # Este archivo
├── tech-stack.md                # Stack tecnologico completo
├── design-notes.md              # Arquitectura y diseno UI/UX
├── requirements.md              # Requisitos funcionales y no funcionales
├── modules.md                   # Modulos, topics y estructura
├── decision-boundaries.md       # Quien decide que
├── data-flow/                   # Flujos de datos canonicos
│   └── canonical.md             # Flujo global oficial
├── contracts/                   # Feature Contracts
│   ├── negotiations.md          # Contrato critico
│   ├── offers.md
│   └── alerts-signals.md
├── ai/                          # AI Boundaries
│   └── ai-boundaries.md         # Limites de la IA
├── adr/                         # Architecture Decision Records
│   ├── ADR-000-template.md      # Template para nuevos ADRs
│   ├── ADR-001-supabase-over-firebase.md
│   ├── ADR-002-deepseek-ai-provider.md
│   ├── ADR-003-crewai-multiagent.md
│   ├── ADR-004-zustand-state.md
│   ├── ADR-005-module-consolidation.md   # Consolidacion alerts/signals
│   └── ADR-LOG.md               # Indice centralizado de ADRs
├── diagrams/                    # Data Flow Diagrams (Mermaid)
│   ├── dfd-user-registration.md
│   ├── dfd-negotiation-flow.md
│   └── dfd-copilot-alerts.md
├── standards/                   # Estandares de desarrollo
│   ├── error-handling.md        # Convenciones de manejo de errores
│   ├── testing-strategy.md      # Estrategia de testing
│   ├── component-patterns.md    # Patrones de componentes React
│   └── feature-flags.md         # Sistema de feature flags
├── project/                     # Gestion de proyecto
│   ├── risk-register.md         # Registro de riesgos
│   └── technical-debt.md        # Registro de deuda tecnica
├── roadmap/                     # Roadmap del producto
│   └── Q1-2026.md               # Roadmap primer trimestre 2026
├── architecture/                # Documentacion de arquitectura
│   ├── layer-responsibilities.md # Responsabilidades por capa
│   └── module-dependencies.md   # Mapa de dependencias
├── integrations/                # Integraciones de sistemas
│   └── ai-systems-integration.md # Copilot <-> CrewAI <-> DeepSeek
├── bmad/                        # Edward Honour Framework
│   └── module-themes-tasks.md   # Mapeo Module -> Theme -> Task
└── templates/                   # Checklists de desarrollo
    ├── feature-checklist.md     # Checklist para nuevos features
    └── bugfix-checklist.md      # Checklist para bugfixes
```

## Quick Links

### Core Documentation
| Documento | Proposito |
|-----------|-----------|
| [tech-stack.md](./tech-stack.md) | Que tecnologias usamos y por que |
| [design-notes.md](./design-notes.md) | Como esta estructurada la app |
| [requirements.md](./requirements.md) | Que debe hacer la app |
| [modules.md](./modules.md) | Como esta organizado el codigo |

### Architecture (Blindaje Estructural)
| Documento | Proposito | Criticidad |
|-----------|-----------|------------|
| [data-flow/canonical.md](./data-flow/canonical.md) | Flujo de datos oficial | CRITICO |
| [decision-boundaries.md](./decision-boundaries.md) | Quien decide que | CRITICO |
| [ai/ai-boundaries.md](./ai/ai-boundaries.md) | Limites de la IA | ALTO |
| [architecture/layer-responsibilities.md](./architecture/layer-responsibilities.md) | Responsabilidades por capa | ALTO |
| [architecture/module-dependencies.md](./architecture/module-dependencies.md) | Mapa de dependencias | MEDIO |

### Standards (Estandares de Desarrollo)
| Documento | Proposito |
|-----------|-----------|
| [standards/error-handling.md](./standards/error-handling.md) | Convenciones de manejo de errores API/UI |
| [standards/testing-strategy.md](./standards/testing-strategy.md) | Jest, Playwright, coverage targets |
| [standards/component-patterns.md](./standards/component-patterns.md) | Atomic Design, Compound Components |
| [standards/feature-flags.md](./standards/feature-flags.md) | Sistema de feature flags client/server |

### Project Management
| Documento | Proposito |
|-----------|-----------|
| [roadmap/Q1-2026.md](./roadmap/Q1-2026.md) | Roadmap y milestones Q1 2026 |
| [project/risk-register.md](./project/risk-register.md) | Registro y mitigacion de riesgos |
| [project/technical-debt.md](./project/technical-debt.md) | Catalogo de deuda tecnica |

### Edward Honour Framework (BMAD)
| Documento | Proposito |
|-----------|-----------|
| [bmad/module-themes-tasks.md](./bmad/module-themes-tasks.md) | Mapeo Module -> Theme -> Task completo |
| [templates/feature-checklist.md](./templates/feature-checklist.md) | Checklist para desarrollo de features |
| [templates/bugfix-checklist.md](./templates/bugfix-checklist.md) | Checklist para correccion de bugs |

### Feature Contracts
| Contrato | Modulo | Criticidad |
|----------|--------|------------|
| [negotiations.md](./contracts/negotiations.md) | Negociaciones | MAXIMO |
| [offers.md](./contracts/offers.md) | Ofertas | ALTO |
| [alerts-signals.md](./contracts/alerts-signals.md) | Alertas y Signals | MEDIO |

### Integrations
| Documento | Sistemas |
|-----------|----------|
| [integrations/ai-systems-integration.md](./integrations/ai-systems-integration.md) | Copilot, CrewAI, DeepSeek |
| [integrations/crewai-typescript-integration.md](./integrations/crewai-typescript-integration.md) | CrewAI Python ↔ TypeScript |

### Production Architecture
| Documento | Proposito |
|-----------|-----------|
| [architecture/crewai-production-gaps.md](./architecture/crewai-production-gaps.md) | Analisis de gaps de produccion CrewAI |

### Data Flow Diagrams
| Diagrama | Descripcion |
|----------|-------------|
| [diagrams/dfd-user-registration.md](./diagrams/dfd-user-registration.md) | Registro y autenticacion |
| [diagrams/dfd-negotiation-flow.md](./diagrams/dfd-negotiation-flow.md) | Flujo de negociacion |
| [diagrams/dfd-copilot-alerts.md](./diagrams/dfd-copilot-alerts.md) | Sistema de alertas Copilot |

### Architecture Decision Records (ADRs)
| ADR | Titulo | Estado |
|-----|--------|--------|
| [ADR-000](./adr/ADR-000-template.md) | Template | - |
| [ADR-001](./adr/ADR-001-supabase-over-firebase.md) | Supabase sobre Firebase | Accepted |
| [ADR-002](./adr/ADR-002-deepseek-ai-provider.md) | DeepSeek como AI Provider | Accepted |
| [ADR-003](./adr/ADR-003-crewai-multiagent.md) | CrewAI para Multi-Agente | Accepted |
| [ADR-004](./adr/ADR-004-zustand-state.md) | Zustand para State Management | Accepted |
| [ADR-005](./adr/ADR-005-module-consolidation.md) | Consolidacion Modulos Alerts/Signals | Accepted |

Ver [ADR-LOG.md](./adr/ADR-LOG.md) para el indice completo.

## Metodologia Edward Honour

Este proyecto sigue el blueprint de 4 fases:

### Fase 1: Definicion ✓
- Product Summary definido
- Target Users identificados
- Platforms seleccionadas
- Constraints documentadas
- MVP scope establecido

### Fase 2: Estructura ✓
- 8 modulos definidos (AUTH, PROP, MAP, PRICE, OFFER, VISIT, CONTRACT, CREW)
- Topics con scope in/out documentado
- Tasks identificadas por topic
- Dependencies mapeadas

### Fase 3: Decisions ✓
- 5 ADRs documentados (ver [ADR-LOG](./adr/ADR-LOG.md))
- Alternatives considered
- Consequences evaluadas
- Decision owners asignados

### Fase 4: Build - In Progress
- Build prompts: Ver `modules.md` para status por topic
- Test cases: Ver [testing-strategy.md](./standards/testing-strategy.md)
- Acceptance criteria: En `requirements.md`

## Estado Actual

| Modulo | Status | Completado |
|--------|--------|------------|
| AUTH | ✓ Done | 100% |
| PROP | ✓ Done | 100% |
| MAP | ✓ Done | 100% |
| PRICE | ✓ Done | 100% |
| OFFER | ✓ Done | 100% |
| VISIT | ✓ Done | 100% |
| CONTRACT | WIP | 60% |
| CREW | ✓ Done | 100% |
| ALERTS | ✓ Done | 100% |

## Proximos Pasos

1. **CONTRACT-001-T3**: UI de preview de contrato
2. **CONTRACT-001-T4**: Export PDF
3. **Testing**: Implementar test suite completo
4. **i18n**: Multi-idioma (ES/EN) - Parcialmente implementado
5. **Production hardening**: Error boundaries, monitoring
6. **API Route Consolidation**: Fase 2 de ADR-005

## Contribuir a Docs

Al hacer cambios significativos:

1. **Nuevo feature**: Actualizar `requirements.md` y `modules.md`
2. **Decision arquitectonica**: Crear nuevo ADR en `adr/` y actualizar `ADR-LOG.md`
3. **Cambio de stack**: Actualizar `tech-stack.md`
4. **Cambio de UI/UX**: Actualizar `design-notes.md`
5. **Nuevo estandar**: Agregar en `standards/`
6. **Nueva integracion**: Documentar en `integrations/`

## Referencias

- [Metodologia Edward Honour](https://aimasters.io)
- [Supabase Docs](https://supabase.com/docs)
- [Next.js Docs](https://nextjs.org/docs)
- [CrewAI Docs](https://docs.crewai.com)
- [DeepSeek API](https://platform.deepseek.com)

---

*Ultima actualizacion: 2026-01-08*
