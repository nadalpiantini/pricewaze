# AI Boundaries

> **Versión**: 1.0
> **Última actualización**: 2026-01-08
> **Estado**: Oficial

Este documento define los límites de lo que la IA puede y no puede hacer en PriceWaze.

---

## Principio Fundamental

```
La IA asesora.
El sistema decide.
La base de datos es la verdad.
```

---

## El Rol de la IA en PriceWaze

La IA en PriceWaze es un **asesor experto**, no un **tomador de decisiones**.

Piensa en ella como un consultor senior que:
- Analiza data
- Sugiere estrategias
- Explica implicaciones
- Redacta comunicaciones

Pero **nunca** firma contratos, transfiere dinero, o toma decisiones vinculantes.

---

## Lo que la IA PUEDE Hacer

### 1. Análisis y Evaluación

| Capacidad | Ejemplo | Ubicación |
|-----------|---------|-----------|
| Evaluar fairness | "Esta oferta está 8% bajo mercado" | `lib/ai/pricing.ts` |
| Analizar presión temporal | "Urgencia alta por días en mercado" | `lib/die/pressure-engine.ts` |
| Estimar riesgo | "Riesgo de pérdida de deal: alto" | `lib/die/uncertainty-engine.ts` |
| Comparar con mercado | "Propiedades similares: $X-$Y" | `lib/ai/pricing.ts` |

### 2. Recomendaciones

| Capacidad | Ejemplo | Uso |
|-----------|---------|-----|
| Sugerir contraoferta | "Rango recomendado: $X-$Y" | Copilot panel |
| Proponer estrategia | "Esperar 48h puede mejorar posición" | Negotiation advice |
| Indicar timing | "Momento óptimo para ofertar" | Alerts |

### 3. Generación de Contenido

| Capacidad | Ejemplo | Restricción |
|-----------|---------|-------------|
| Redactar mensajes | "Sugerencia de respuesta..." | Usuario edita antes de enviar |
| Explicar decisiones | "Esto significa que..." | Solo informativo |
| Crear resúmenes | "Estado actual de negociación" | Read-only |

### 4. Procesamiento Multi-Agente (CrewAI)

| Crew | Propósito | Output |
|------|-----------|--------|
| `PricingCrew` | Análisis de valoración | Report con rangos |
| `NegotiationCrew` | Estrategia de negociación | Recomendaciones |
| `ContractCrew` | Revisión legal | Sugerencias de cambio |
| `FullAnalysisCrew` | Análisis integral | Dashboard completo |

---

## Lo que la IA NO PUEDE Hacer

### 🚫 Acciones Prohibidas

| Acción | Por qué está prohibida |
|--------|------------------------|
| Escribir en base de datos | Pierde trazabilidad y control |
| Cambiar estados de negociación | Solo `/lib` puede mutar estados |
| Aceptar/rechazar ofertas | Solo el usuario decide |
| Enviar notificaciones directamente | Solo el sistema las envía |
| Ejecutar pagos o transacciones | Requiere autorización humana |
| Crear ofertas sin input del usuario | El usuario siempre inicia |

### 🚫 Decisiones Prohibidas

| Decisión | Quién la toma realmente |
|----------|-------------------------|
| Si una oferta es válida | Domain logic (`/lib`) |
| Si cerrar un deal | Usuario + validación de sistema |
| Qué datos persistir | API + Domain logic |
| Cuándo alertar al usuario | Rules engine (`/lib/alerts`) |

---

## Flujo de Interacción con IA

```
Usuario solicita consejo
        ↓
Sistema prepara contexto
        ↓
AI analiza (read-only)
        ↓
AI genera respuesta estructurada
        ↓
Sistema valida respuesta
        ↓
Sistema presenta al usuario
        ↓
Usuario decide acción
        ↓
Sistema ejecuta (no AI)
```

**La IA nunca está en el camino de ejecución.**

---

## Fallback Policy

### Qué pasa si la IA falla

| Escenario | Comportamiento |
|-----------|----------------|
| API timeout | Continuar sin asesoría AI |
| Respuesta inválida | Descartar, usar defaults |
| Rate limit | Queue y retry |
| Contenido inapropiado | Filter y log |

### Principio de Degradación Graceful

```typescript
async function getAIAdvice(context: Context): Promise<Advice | null> {
  try {
    const advice = await aiClient.analyze(context);
    return validateAdvice(advice) ? advice : null;
  } catch (error) {
    logger.warn('AI advice unavailable:', error);
    return null; // Sistema continúa sin AI
  }
}
```

**El sistema nunca se bloquea esperando a la IA.**

---

## Validación de Output de IA

Toda respuesta de IA pasa por validación:

```typescript
interface AIResponse {
  recommendation: string;
  confidence: number;     // 0-1
  reasoning: string;
  suggestedActions: Action[];
}

function validateAIResponse(response: unknown): AIResponse | null {
  const parsed = AIResponseSchema.safeParse(response);
  if (!parsed.success) {
    logger.warn('Invalid AI response:', parsed.error);
    return null;
  }
  return parsed.data;
}
```

---

## Providers de IA

### DeepSeek (Principal)

| Uso | Endpoint |
|-----|----------|
| Pricing analysis | `/api/ai/pricing` |
| Negotiation advice | `/api/ai/advice` |
| Contract generation | `/api/ai/contracts` |
| Decision intelligence | `/api/ai/decision-intelligence` |

### CrewAI (Multi-Agent)

| Crew | Cuándo usar |
|------|-------------|
| `PricingCrew` | Análisis profundo de valoración |
| `NegotiationCrew` | Estrategia multi-round |
| `ContractCrew` | Review legal detallado |
| `FullAnalysisCrew` | Due diligence completo |

---

## Monitoreo de IA

### Métricas a Trackear

| Métrica | Alerta si |
|---------|-----------|
| Latencia de respuesta | > 5s |
| Tasa de fallback | > 10% |
| Validación fallida | > 5% |
| Token usage | > budget diario |

### Logging Requerido

```typescript
logger.info('AI request', {
  type: 'pricing_analysis',
  property_id,
  duration_ms,
  tokens_used,
  confidence_score
});
```

---

## Checklist de Seguridad

Antes de integrar cualquier feature con IA:

- [ ] ¿La IA solo asesora, no decide?
- [ ] ¿Hay fallback si la IA falla?
- [ ] ¿El output está validado con schema?
- [ ] ¿El usuario puede ignorar la recomendación?
- [ ] ¿Los prompts no exponen datos sensibles?
- [ ] ¿Hay rate limiting?
- [ ] ¿Hay logging de uso?

---

## Referencias

- [Data Flow Canónico](../data-flow/canonical.md)
- [Decision Boundaries](../decision-boundaries.md)
- [ADR-002: DeepSeek AI Provider](../adr/ADR-002-deepseek.md)
- [ADR-003: CrewAI Multi-Agent](../adr/ADR-003-crewai.md)
