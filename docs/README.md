# PriceWaze Documentation

> Documentaci贸n t茅cnica siguiendo metodolog铆a Edward Honour para desarrollo SaaS con AI

## 馃摐 Estructura de Documentos

```
docs/
鈹溾攢鈹 README.md           # Este archivo
鈹溾攢鈹 tech-stack.md       # Stack tecnol贸gico completo
鈹溾攢鈹 design-notes.md     # Arquitectura y dise帽o UI/UX
鈹溾攢鈹 requirements.md     # Requisitos funcionales y no funcionales
鈹溾攢鈹 modules.md          # M贸dulos, topics y estructura
鈹斺攢鈹 adr/                # Architecture Decision Records
    鈹溾攢鈹 ADR-001-supabase-over-firebase.md
    鈹溾攢鈹 ADR-002-deepseek-ai-provider.md
    鈹溾攢鈹 ADR-003-crewai-multiagent.md
    鈹斺攢鈹 ADR-004-zustand-state.md
```

## 馃殌 Quick Links

| Documento | Prop贸sito |
|-----------|-----------|
| [tech-stack.md](./tech-stack.md) | Qu茅 tecnolog铆as usamos y por qu茅 |
| [design-notes.md](./design-notes.md) | C贸mo est谩 estructurada la app |
| [requirements.md](./requirements.md) | Qu茅 debe hacer la app |
| [modules.md](./modules.md) | C贸mo est谩 organizado el c贸digo |

## 馃搵 Metodolog铆a Edward Honour

Este proyecto sigue el blueprint de 4 fases:

### Fase 1: Definici贸n 鉁
- Product Summary definido
- Target Users identificados
- Platforms seleccionadas
- Constraints documentadas
- MVP scope establecido

### Fase 2: Estructura 鉁
- 8 m贸dulos definidos (AUTH, PROP, MAP, PRICE, OFFER, VISIT, CONTRACT, CREW)
- Topics con scope in/out documentado
- Tasks identificadas por topic
- Dependencies mapeadas

### Fase 3: Decisions 鉁
- 4 ADRs documentados
- Alternatives considered
- Consequences evaluadas
- Decision owners asignados

### Fase 4: Build 馃敶 In Progress
- Build prompts: Ver `modules.md` para status por topic
- Test cases: Pendiente
- Acceptance criteria: En `requirements.md`

## 馃弫 Estado Actual

| M贸dulo | Status | Completado |
|--------|--------|------------|
| AUTH | 鉁 Done | 100% |
| PROP | 鉁 Done | 100% |
| MAP | 鉁 Done | 100% |
| PRICE | 鉁 Done | 100% |
| OFFER | 鉁 Done | 100% |
| VISIT | 鉁 Done | 100% |
| CONTRACT | 馃敶 WIP | 60% |
| CREW | 鉁 Done | 100% |

## 馃 Pr贸ximos Pasos

1. **CONTRACT-001-T3**: UI de preview de contrato
2. **CONTRACT-001-T4**: Export PDF
3. **Testing**: Implementar test suite
4. **i18n**: Multi-idioma (ES/EN)
5. **Production hardening**: Error boundaries, monitoring

## 馃摑 Contribuir a Docs

Al hacer cambios significativos:

1. **Nuevo feature**: Actualizar `requirements.md` y `modules.md`
2. **Decisi贸n arquitect贸nica**: Crear nuevo ADR en `adr/`
3. **Cambio de stack**: Actualizar `tech-stack.md`
4. **Cambio de UI/UX**: Actualizar `design-notes.md`

## 馃搳 Referencias

- [Metodolog铆a Edward Honour](https://aimasters.io)
- [Supabase Docs](https://supabase.com/docs)
- [Next.js Docs](https://nextjs.org/docs)
- [CrewAI Docs](https://docs.crewai.com)
- [DeepSeek API](https://platform.deepseek.com)
