# ADR-002: DeepSeek como AI Provider Principal

## Status
**Accepted** - 2025-01-06

## Context
PriceWaze requiere capacidades de AI para:
- An谩lisis de precios y fairness scoring
- Sugerencias de ofertas basadas en mercado
- Generaci贸n de contratos
- Asistencia en negociaci贸n

El presupuesto de MVP es limitado ($50/mes m谩ximo para API AI).

## Decision
Usar **DeepSeek API** como provider principal de AI, accedido via OpenAI SDK compatible.

## Consequences

### Positivas
- **Costo**: ~$0.14/1M tokens input, ~$0.28/1M output (10-50x m谩s barato que GPT-4)
- **Calidad**: Comparable a GPT-4 para tareas de razonamiento
- **Compatibilidad**: API compatible con OpenAI SDK, migraci贸n trivial
- **Sin rate limits agresivos**: Ideal para MVP con tr谩fico impredecible
- **Latencia aceptable**: 2-5s para respuestas complejas

### Negativas
- **Proveedor menos conocido**: Menor documentaci贸n y comunidad
- **Uptime**: Sin SLA enterprise documentado
- **Multimodal limitado**: No procesa im谩genes (si se necesita)

### Riesgos
- **Dependencia de proveedor chino**: Consideraciones de compliance
- **Mitigaci贸n**: Fallback a OpenAI implementado en c贸digo, abstracci贸n de provider

## Alternatives Considered

### 1. OpenAI GPT-4
- **Pros**: L铆der del mercado, mejor documentaci贸n, multimodal
- **Cons**: $30/1M input, $60/1M output - 50x m谩s caro
- **Rejected**: Presupuesto de MVP no lo permite

### 2. Anthropic Claude
- **Pros**: Excelente razonamiento, context window grande
- **Cons**: Pricing similar a GPT-4, API menos madura
- **Rejected**: Costo prohibitivo para MVP

### 3. OpenAI GPT-3.5-turbo
- **Pros**: Barato ($0.50/1M tokens), r谩pido
- **Cons**: Calidad inferior para an谩lisis complejos
- **Rejected**: Fairness scoring requiere razonamiento avanzado

### 4. Local LLM (Ollama)
- **Pros**: Sin costo de API, privacidad total
- **Cons**: Requiere infraestructura, latencia alta, calidad variable
- **Rejected**: Complejidad operacional no justificada en MVP

## Implementation Details

```typescript
// src/lib/ai/client.ts
import OpenAI from 'openai';

export const ai = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: process.env.DEEPSEEK_BASE_URL, // https://api.deepseek.com
});

// Fallback pattern
async function callAI(prompt: string) {
  try {
    return await ai.chat.completions.create({
      model: process.env.DEEPSEEK_MODEL,
      messages: [{ role: 'user', content: prompt }],
    });
  } catch (error) {
    // Fallback to OpenAI if configured
    if (process.env.OPENAI_API_KEY) {
      const fallback = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      return await fallback.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
      });
    }
    throw error;
  }
}
```

## Decision Owner
Tech Lead

## Date
2025-01-06
