# Decision Boundaries Map

> **Versión**: 1.0
> **Última actualización**: 2026-01-08
> **Estado**: Oficial

Este documento define quién decide qué en PriceWaze. Es constitucional. Si algo viola esto, es bug, no debate.

---

## Principio Rector

> **La decisión vive donde vive la responsabilidad del error.**
>
> Si una capa no puede asumir el error → no puede decidir.

---

## Capas del Sistema (Orden de Autoridad)

```
1. Database (Truth Layer)      ← Máxima autoridad
2. Domain Logic (/lib)
3. API (Orchestration)
4. AI (Advisory)
5. State (Zustand)
6. UI (Presentation)           ← Mínima autoridad
```

**Mientras más arriba, menos poder de decisión.**

---

## 1. Database — La Verdad Absoluta

### DECIDE

| Qué | Ejemplo |
|-----|---------|
| Estado final de entidades | `negotiation_state = 'closed'` |
| Historial inmutable | Offer chain |
| Qué ocurrió realmente | Timestamps, audit trail |

### NO DECIDE

| Qué | Por qué |
|-----|---------|
| Qué debería pasar | Eso es lógica de dominio |
| Qué es justo | Eso es cálculo |
| Qué recomendar | Eso es AI |

**Regla**: Si la DB dice que algo pasó, pasó.

---

## 2. Domain Logic (/lib) — El Juez

### DECIDE

| Qué | Ejemplo |
|-----|---------|
| Fairness score | `calculateFairness()` |
| Negotiation state | `determineNextState()` |
| Riesgo, presión, coherencia | DIE engines |
| Validación de reglas | Business rules |

### NO DECIDE

| Qué | Por qué |
|-----|---------|
| Cómo se ve | UI concern |
| Cómo se explica | AI concern |
| Qué copy usar | AI concern |

**Regla**: Toda decisión dura pasa por `/lib`.

---

## 3. API — El Director de Orquesta

### DECIDE

| Qué | Ejemplo |
|-----|---------|
| Qué flujo ejecutar | Route handlers |
| Qué dominio invocar | Service calls |
| Qué respuesta devolver | Response formatting |
| Autenticación/Autorización | Middleware |

### NO DECIDE

| Qué | Por qué |
|-----|---------|
| Reglas de negocio | Eso es `/lib` |
| Cálculos | Eso es `/lib` |
| Resultados finales | Eso es `/lib` |

**Regla**: API coordina. Nunca piensa.

---

## 4. AI — El Asesor (No el Jefe)

### DECIDE

**Nada.**

### PUEDE

| Qué | Ejemplo |
|-----|---------|
| Analizar escenarios | "Si esperas, el riesgo..." |
| Proponer estrategias | "Recomiendo contraoferta" |
| Explicar consecuencias | "Aceptar significa..." |
| Sugerir wording | Copy para UI |

### NO PUEDE

| Qué | Por qué |
|-----|---------|
| Cambiar estados | Solo `/lib` muta |
| Persistir datos | Solo `/lib` escribe |
| Tomar decisiones finales | Usuario decide |

**Regla de oro**: AI = input no confiable, siempre validado.

---

## 5. State (Zustand) — La Memoria Temporal

### DECIDE

| Qué | Ejemplo |
|-----|---------|
| Qué está seleccionado | `selectedPropertyId` |
| Qué está abierto/cerrado | `sidebarOpen` |
| Qué se muestra primero | `sortOrder` |

### NO DECIDE

| Qué | Por qué |
|-----|---------|
| Resultados | Eso es server state |
| Cálculos | Eso es `/lib` |
| Verdad del sistema | Eso es DB |

**Regla**: El store refleja, no define.

---

## 6. UI — El Narrador

### DECIDE

| Qué | Ejemplo |
|-----|---------|
| Cómo se presenta | Layout, styling |
| Qué componentes usar | Component tree |
| Feedback visual | Loading, error states |
| Interacciones locales | Hover, focus |

### NO DECIDE

| Qué | Por qué |
|-----|---------|
| Precios | Eso es `/lib` |
| Fairness | Eso es `/lib` |
| Estados | Eso es DB |
| Reglas | Eso es `/lib` |

**Regla**: UI nunca toma decisiones de negocio. Nunca.

---

## Mapa de Decisiones Clave

| Decisión | Dueño | NO puede decidir |
|----------|-------|------------------|
| Precio justo | `/lib/ai/pricing` | UI |
| Estado negociación | `/lib/negotiation-coherence` | API |
| Accept / Reject | `/lib` (user action) | AI |
| Copy explicativo | AI | DB |
| Historial | DB | Nadie más |
| Qué se muestra | UI | Cálculos |
| Qué flujo corre | API | Lógica |
| Recomendación | AI | `/lib` |
| Verdad final | DB | Todo lo demás |

---

## Manejo de Conflictos

Si dos capas discrepan, esta es la jerarquía de resolución:

```
1. DB gana siempre
2. Luego /lib
3. Luego API
4. AI pierde siempre en conflicto
5. UI nunca entra en la pelea
```

---

## Anti-patterns Ilegales

| Anti-pattern | Por qué es ilegal |
|--------------|-------------------|
| UI calculando fairness | Bypasses validation |
| API "ajustando un numerito" | Fragmenta lógica |
| AI escribiendo en DB | Pierde control |
| Store guardando estados de negocio | Conflicto con server |
| Copilot ejecutando acciones | AI no tiene autoridad |

**Si ves uno de estos: detén el merge.**

---

## Validación Pre-Merge

- [ ] ¿Cada decisión está en su capa correcta?
- [ ] ¿AI solo asesora?
- [ ] ¿UI no calcula nada de negocio?
- [ ] ¿Toda lógica está en `/lib`?
- [ ] ¿DB es la única fuente de verdad?

---

## Referencias

- [Data Flow Canónico](./data-flow/canonical.md)
- [Feature Contract: Negotiations](./contracts/negotiations.md)
- [Feature Contract: Offers](./contracts/offers.md)
- [AI Boundaries](./ai/ai-boundaries.md)
