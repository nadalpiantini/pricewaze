# Feature Flags System

## Overview

PriceWaze utiliza un sistema de feature flags de dos niveles:

1. **Environment-based (Client)**: Flags estaticos via `NEXT_PUBLIC_*` variables
2. **Database-based (Server)**: Flags dinamicos con rollout gradual

---

## Arquitectura

```
┌────────────────────────────────────────────────────────────────┐
│                     Feature Flags System                        │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌─────────────────┐          ┌─────────────────────────────┐  │
│  │  Client-side    │          │  Server-side                │  │
│  │  (Static)       │          │  (Dynamic)                  │  │
│  │                 │          │                             │  │
│  │  feature-       │          │  feature-flags-server.ts    │  │
│  │  flags.ts       │          │  feature-flags-db.ts        │  │
│  │                 │          │                             │  │
│  │  ↓ Source       │          │  ↓ Source                   │  │
│  │  .env.local     │          │  pricewaze_feature_flags    │  │
│  │  (build-time)   │          │  (runtime, DB)              │  │
│  └─────────────────┘          └─────────────────────────────┘  │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

## Client-Side Flags

### Archivo: `src/lib/feature-flags.ts`

```typescript
export const featureFlags = {
  copilot: process.env.NEXT_PUBLIC_FEATURE_COPILOT !== 'false',
  push: process.env.NEXT_PUBLIC_FEATURE_PUSH !== 'false',
  paywall: process.env.NEXT_PUBLIC_FEATURE_PAYWALL !== 'false',
  advancedTimeline: process.env.NEXT_PUBLIC_FEATURE_ADVANCED_TIMELINE !== 'false',
  advancedAlerts: process.env.NEXT_PUBLIC_FEATURE_ADVANCED_ALERTS !== 'false',
} as const;

export function isFeatureEnabled(feature: keyof typeof featureFlags): boolean {
  return featureFlags[feature];
}
```

### Flags Disponibles

| Flag | Variable | Default | Descripcion |
|------|----------|---------|-------------|
| `copilot` | `NEXT_PUBLIC_FEATURE_COPILOT` | `true` | AI negotiation assistant |
| `push` | `NEXT_PUBLIC_FEATURE_PUSH` | `true` | Web push notifications |
| `paywall` | `NEXT_PUBLIC_FEATURE_PAYWALL` | `true` | Pro subscription paywall |
| `advancedTimeline` | `NEXT_PUBLIC_FEATURE_ADVANCED_TIMELINE` | `true` | Deep timeline view (Pro) |
| `advancedAlerts` | `NEXT_PUBLIC_FEATURE_ADVANCED_ALERTS` | `true` | Advanced alert rules (Pro) |

### Uso en Componentes

```typescript
import { isFeatureEnabled } from '@/lib/feature-flags';

function MyComponent() {
  if (!isFeatureEnabled('copilot')) {
    return null;
  }

  return <CopilotPanel />;
}
```

### Configuracion en .env.local

```bash
# Desactivar Copilot
NEXT_PUBLIC_FEATURE_COPILOT=false

# Desactivar Paywall (desarrollo)
NEXT_PUBLIC_FEATURE_PAYWALL=false
```

---

## Server-Side Flags (Database)

### Archivo: `src/lib/feature-flags-server.ts`

```typescript
// Obtener flag de DB
export async function getFeatureFlag(key: string): Promise<FeatureFlag | null>

// Check con rollout gradual (deterministic por seed)
export async function isFeatureEnabled(flagKey: string, seedId: string): Promise<boolean>
```

### Tabla: `pricewaze_feature_flags`

```sql
CREATE TABLE pricewaze_feature_flags (
  key TEXT PRIMARY KEY,
  enabled BOOLEAN DEFAULT true,
  rollout_percent INTEGER DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### Funcion RPC: `is_feature_enabled`

```sql
CREATE FUNCTION is_feature_enabled(p_flag_key TEXT, p_seed_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  flag_record RECORD;
  hash_value INTEGER;
BEGIN
  SELECT * INTO flag_record
  FROM pricewaze_feature_flags
  WHERE key = p_flag_key;

  IF NOT FOUND OR NOT flag_record.enabled THEN
    RETURN FALSE;
  END IF;

  IF flag_record.rollout_percent >= 100 THEN
    RETURN TRUE;
  END IF;

  -- Deterministic hash based on seed
  hash_value := abs(hashtext(p_seed_id || p_flag_key)) % 100;
  RETURN hash_value < flag_record.rollout_percent;
END;
$$ LANGUAGE plpgsql;
```

### Uso en API Routes

```typescript
import { isFeatureEnabled } from '@/lib/feature-flags-server';

export async function GET(request: NextRequest) {
  const userId = /* get from session */;

  // Check con rollout gradual
  const coherenceEnabled = await isFeatureEnabled('negotiation_coherence', userId);

  if (!coherenceEnabled) {
    return NextResponse.json({ error: 'Feature not available' }, { status: 403 });
  }

  // ... rest of handler
}
```

---

## Rollout Gradual

### Configuracion

Para activar un feature para X% de usuarios:

```sql
UPDATE pricewaze_feature_flags
SET rollout_percent = 25
WHERE key = 'negotiation_coherence';
```

### Comportamiento

- `rollout_percent = 0`: Feature desactivado para todos
- `rollout_percent = 50`: Feature activo para ~50% de usuarios
- `rollout_percent = 100`: Feature activo para todos

### Determinismo

El hash es determinista basado en `(userId + flagKey)`:
- Mismo usuario siempre ve el mismo estado
- No cambia entre requests
- Reproducible para debugging

---

## Patrones de Uso

### 1. Feature Toggle Simple (Client)

```typescript
// En componente
import { isFeatureEnabled } from '@/lib/feature-flags';

{isFeatureEnabled('advancedAlerts') && <AdvancedAlertConfig />}
```

### 2. Feature Toggle con Fallback (Client)

```typescript
import { isFeatureEnabled } from '@/lib/feature-flags';

function AlertConfig() {
  if (isFeatureEnabled('advancedAlerts')) {
    return <AdvancedAlertConfig />;
  }
  return <BasicAlertConfig />;
}
```

### 3. API Route con Feature Check (Server)

```typescript
import { isFeatureEnabled } from '@/lib/feature-flags-server';

export async function POST(req: NextRequest) {
  const { user } = await getSession();

  if (!await isFeatureEnabled('new_feature', user.id)) {
    return NextResponse.json(
      { error: 'Feature not available for your account' },
      { status: 403 }
    );
  }

  // ... implementation
}
```

### 4. Feature con Pro Subscription

```typescript
import { isFeatureEnabled } from '@/lib/feature-flags';
import { useSubscription } from '@/hooks/useSubscription';

function PremiumFeature() {
  const { isPro } = useSubscription();

  // Ambos deben ser true
  if (!isFeatureEnabled('advancedTimeline') || !isPro) {
    return <Paywall feature="timeline" />;
  }

  return <AdvancedTimeline />;
}
```

---

## Ciclo de Vida

### 1. Nuevo Feature

```bash
# 1. Agregar variable de entorno
NEXT_PUBLIC_FEATURE_NEW_FEATURE=false

# 2. Agregar a feature-flags.ts
newFeature: process.env.NEXT_PUBLIC_FEATURE_NEW_FEATURE !== 'false',

# 3. Implementar feature con check
if (isFeatureEnabled('newFeature')) { ... }

# 4. Activar en desarrollo
NEXT_PUBLIC_FEATURE_NEW_FEATURE=true
```

### 2. Rollout Gradual (Server)

```sql
-- 1. Crear flag en DB
INSERT INTO pricewaze_feature_flags (key, enabled, rollout_percent)
VALUES ('new_server_feature', true, 10);

-- 2. Incrementar rollout
UPDATE pricewaze_feature_flags SET rollout_percent = 25 WHERE key = 'new_server_feature';
UPDATE pricewaze_feature_flags SET rollout_percent = 50 WHERE key = 'new_server_feature';
UPDATE pricewaze_feature_flags SET rollout_percent = 100 WHERE key = 'new_server_feature';
```

### 3. Deprecar Feature Flag

```bash
# 1. Verificar 100% rollout por 2+ sprints
# 2. Remover checks del codigo
# 3. Remover de feature-flags.ts
# 4. Remover variable de entorno
# 5. DELETE FROM pricewaze_feature_flags WHERE key = 'old_feature';
```

---

## Debugging

### Ver Todos los Flags (Client)

```typescript
import { getAllFeatureFlags } from '@/lib/feature-flags';

console.log(getAllFeatureFlags());
// { copilot: true, push: true, paywall: false, ... }
```

### Verificar Flag de Usuario (Server)

```typescript
// En API route de debug
const isEnabled = await isFeatureEnabled('feature_name', userId);
console.log(`Feature 'feature_name' for user ${userId}: ${isEnabled}`);
```

### Query DB Directamente

```sql
SELECT * FROM pricewaze_feature_flags;
SELECT is_feature_enabled('feature_name', 'user-uuid');
```

---

## Componentes que Usan Feature Flags

| Componente | Flag | Tipo |
|------------|------|------|
| `CopilotPanel.tsx` | `copilot` | Client |
| `Paywall.tsx` | `paywall` | Client |
| `NegotiationCoherencePanel.tsx` | `negotiation_coherence` | Server |
| `/api/copilot/*` | `copilot` | Client |
| `/api/negotiation/coherence/*` | `negotiation_coherence` | Server |

---

## Buenas Practicas

1. **Nombrado**: `camelCase` para client, `snake_case` para server
2. **Default**: Siempre `true` (opt-out, not opt-in)
3. **Cleanup**: Remover flags despues de 100% rollout estable
4. **Testing**: Mock flags en tests
5. **Documentacion**: Agregar a esta tabla cuando se crea nuevo flag

---

*Ultima actualizacion: 2026-01-08*
