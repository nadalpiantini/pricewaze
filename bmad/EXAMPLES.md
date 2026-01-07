# 📚 Ejemplos de Uso - BMAD Orchestrator

## Ejemplo 1: Implementar Comparación de Propiedades

### Paso 1: Setup (solo primera vez)
```bash
pnpm run bmad:setup
```

### Paso 2: Iniciar Sprint
```bash
pnpm run bmad:start comparison
# O directamente:
./bmad/scripts/quick_start.sh comparison
```

### Paso 3: Implementar según Plan
Seguir las tareas en `PLAN_IMPLEMENTACION.md` sección 1.1:

1. **Crear migración SQL**:
```sql
-- supabase/migrations/YYYYMMDD_create_comparisons.sql
CREATE TABLE pricewaze_comparisons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  property_ids UUID[] NOT NULL CHECK (array_length(property_ids, 1) <= 3),
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

2. **Crear API route**:
```typescript
// src/app/api/comparisons/route.ts
// ... código según plan
```

3. **Crear componente**:
```typescript
// src/components/properties/PropertyComparison.tsx
// ... código según plan
```

### Paso 4: Validar
```bash
python3 bmad/scripts/orchestrator.py --phase validate
```

### Paso 5: Ver Progreso
```bash
pnpm run bmad:status
```

---

## Ejemplo 2: Solo Validación

```bash
# Ejecutar solo fase de validación
python3 bmad/scripts/orchestrator.py --phase validate
```

Esto ejecutará:
- ✅ TypeScript type check
- ✅ ESLint
- ✅ Build verification
- ✅ Tests

---

## Ejemplo 3: Ver Progreso de Fase Completa

```bash
# Ver resumen de Fase 1
python3 bmad/scripts/feature_tracker.py --phase "Fase 1: MVP Plus"
```

Output esperado:
```
📋 Resumen de Fase 1: MVP Plus:
   Progress: 45.2%
   Completed: 1
   In Progress: 2
```

---

## Ejemplo 4: Monitorear Feature Específica

```bash
# Ver status detallado
python3 bmad/scripts/feature_tracker.py --status comparison
```

Output esperado:
```
📊 Status de comparison:
   Progress: 75.0%
   Status: in_progress
   Tasks: 6/8
   Iterations: 3
   Avg Score: 9.2/10
```

---

## Ejemplo 5: Usar desde GitHub Actions

1. Ir a GitHub > Actions > BMAD Orchestrator
2. Click "Run workflow"
3. Seleccionar:
   - Feature: `comparison`
   - Phase: `full` (o específica)
   - Auto-commit: `false` (o `true` si quieres auto-commit)
4. Click "Run workflow"

El workflow:
- ✅ Ejecutará el orquestador
- ✅ Generará reportes
- ✅ Subirá logs como artifacts
- ✅ (Opcional) Hará commit automático

---

## Ejemplo 6: Workflow Completo con Fallback

```bash
# 1. Iniciar sprint
./bmad/scripts/quick_start.sh alerts

# 2. Si falla validación, ejecutar fallback
python3 bmad/scripts/orchestrator.py --phase fallback

# 3. Revisar errores en logs
cat bmad/logs/orchestrator_$(date +%Y%m%d).log

# 4. Corregir errores según logs

# 5. Re-validar
python3 bmad/scripts/orchestrator.py --phase validate

# 6. Continuar ciclo completo
python3 bmad/scripts/orchestrator.py --feature alerts
```

---

## Ejemplo 7: Integración con Plan de Implementación

### Escenario: Implementar Alertas Inteligentes

1. **Revisar Plan**: `PLAN_IMPLEMENTACION.md` sección 1.2
2. **Iniciar Tracking**:
   ```bash
   python3 bmad/scripts/feature_tracker.py --start alerts
   ```
3. **Implementar Backend**:
   - Crear tabla `pricewaze_saved_searches`
   - Crear API routes
   - Crear triggers
4. **Validar Backend**:
   ```bash
   python3 bmad/scripts/orchestrator.py --phase validate
   ```
5. **Implementar Frontend**:
   - Crear componentes
   - Integrar con stores
6. **Validar Frontend**:
   ```bash
   python3 bmad/scripts/orchestrator.py --phase validate
   ```
7. **Completar Sprint**:
   ```bash
   python3 bmad/scripts/orchestrator.py --feature alerts
   ```
8. **Ver Reporte**:
   ```bash
   pnpm run bmad:status
   ```

---

## Ejemplo 8: Debugging

### Ver logs en tiempo real
```bash
tail -f bmad/logs/orchestrator_$(date +%Y%m%d).log
```

### Ver último reporte
```bash
ls -lt bmad/reports/ | head -1
cat bmad/reports/report_*_*.json | jq .
```

### Ver tracking actual
```bash
cat bmad/tracking/implementation.json | jq .
```

---

## Ejemplo 9: Múltiples Features en Paralelo

```bash
# Terminal 1: Feature 1
./bmad/scripts/quick_start.sh comparison

# Terminal 2: Feature 2 (después de completar Feature 1)
./bmad/scripts/quick_start.sh alerts
```

**Nota**: El sistema rastrea cada feature independientemente.

---

## Ejemplo 10: Actualizar Score Manualmente

```bash
# Si completaste tareas manualmente y quieres actualizar tracking
python3 bmad/scripts/feature_tracker.py --update comparison --score 9.5
```

---

## 🎯 Tips y Mejores Prácticas

1. **Siempre iniciar tracking antes de implementar**
   ```bash
   python3 bmad/scripts/feature_tracker.py --start <feature>
   ```

2. **Validar frecuentemente durante desarrollo**
   ```bash
   python3 bmad/scripts/orchestrator.py --phase validate
   ```

3. **Revisar logs si algo falla**
   ```bash
   cat bmad/logs/orchestrator_$(date +%Y%m%d).log
   ```

4. **Generar reportes antes de commits importantes**
   ```bash
   pnpm run bmad:status
   ```

5. **Usar GitHub Actions para validación automática**
   - Configurar workflow para ejecutar en PRs
   - Ver reportes en artifacts

---

## 🔗 Referencias

- `PLAN_IMPLEMENTACION.md`: Plan detallado
- `bmad/README.md`: Documentación completa
- `bmad/INTEGRATION.md`: Guía de integración
- `bmad.toml`: Configuración

