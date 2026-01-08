# Prompts System - Production Ready

Sistema completo de gestión de prompts con A/B testing, métricas, few-shot dinámico y versionado.

## 🏗️ Arquitectura

```
src/lib/prompts/
├── skeleton.ts          # Prompt Skeleton reutilizable
├── ab-testing.ts        # A/B testing con sticky assignment
├── registry-loader.ts   # Carga desde registry.json
├── metrics.ts           # Sistema de métricas y DAS
├── few-shot.ts          # Few-shot dinámico
├── prompt-executor.ts   # Ejecutor unificado
└── index.ts            # Exports

src/prompts/
├── registry.json        # Source of truth (JSON)
└── prompts-registry.ts  # TypeScript types
```

## 🚀 Uso Rápido

### 1. Usar Prompt Executor (Recomendado)

```typescript
import { executePrompt } from '@/lib/prompts/prompt-executor';
import { buildAnalyzePricingV2Prompt } from '@/prompts/pricing/analyzePricing.v2';

const result = await executePrompt({
  promptName: 'analyzePricing',
  userId: 'user123',
  context: {
    zonePropertyCount: 5,
    priceVariance: 25,
    property_id: 'prop123',
  },
  buildPromptFn: (version) => buildAnalyzePricingV2Prompt(input),
});

// result.prompt - Prompt listo para usar
// result.version - Versión seleccionada
// result.metadata - temperature, max_tokens, model
```

### 2. A/B Testing

```typescript
import { executePrompt } from '@/lib/prompts/prompt-executor';
import type { ABTestConfig } from '@/lib/prompts/ab-testing';

const abConfigs: ABTestConfig[] = [
  {
    promptName: 'analyzePricing',
    variants: ['v2', 'v2.1'],
    trafficSplit: { v2: 50, v2.1: 50 },
    stickyAssignment: true,
  },
];

const result = await executePrompt({
  promptName: 'analyzePricing',
  userId: 'user123',
  abTestConfigs: abConfigs,
  buildPromptFn: (version) => buildAnalyzePricingV2Prompt(input),
});
```

### 3. Few-Shot Dinámico

Se inyecta automáticamente cuando:
- `zonePropertyCount < 3` → `lowData` examples
- `priceVariance > 40%` → `highVariance` examples
- `negotiationRounds >= 3` → `multipleCounters` examples

### 4. Métricas

```typescript
import { logPromptMetrics } from '@/lib/prompts/metrics';

await logPromptMetrics({
  prompt_name: 'analyzePricing',
  prompt_version: 'v2.1',
  user_id: 'user123',
  confidence_level: 'high',
  latency_ms: 820,
  null_fields: [],
  user_action: 'followed_analysis',
  decision_alignment_score: 1,
  timestamp: new Date().toISOString(),
});
```

## 📊 Métricas Clave

- **Decision Alignment Score (DAS)**: +1 (followed), 0 (ignored), -1 (overrode)
- **Confidence Level**: low/medium/high
- **Null Field Ratio**: % de campos null (incertidumbre)
- **JSON Error Rate**: % de errores de parsing
- **Override Rate**: % de usuarios que ignoran el análisis

## 🔧 Configuración

### Registry JSON

Edita `src/prompts/registry.json` para:
- Cambiar versiones activas
- Agregar nuevas versiones
- Configurar temperature/max_tokens por versión

### A/B Testing

```typescript
const config: ABTestConfig = {
  promptName: 'analyzePricing',
  variants: ['v2', 'v2.1'],
  trafficSplit: { v2: 50, v2.1: 50 }, // 50/50 split
  stickyAssignment: true, // Same user → same variant
};
```

## 🎯 Próximos Pasos

1. **Dashboard de Métricas**: Visualizar `AggregatedMetrics`
2. **Auto-Tuning**: Ajustar prompts basado en métricas
3. **Market-Specific Overlays**: Prompts por mercado

