# 🔗 Integración BMAD con Plan de Implementación

Este documento explica cómo usar el sistema BMAD para ejecutar el plan de implementación de funcionalidades.

## 📋 Flujo de Trabajo Recomendado

### 1. Seleccionar Funcionalidad del Plan

Revisar `PLAN_IMPLEMENTACION.md` y seleccionar una funcionalidad de la fase actual:

**Fase 1: MVP Plus**
- `comparison` - Sistema de Comparación de Propiedades
- `alerts` - Sistema de Alertas Inteligentes
- `gallery` - Galería Mejorada con Tours Virtuales
- `reviews` - Sistema de Reviews y Ratings

**Fase 2: Growth Features**
- `chat` - Chat en Tiempo Real
- `valuation` - Estimación Automática de Valor
- `heatmap` - Heatmaps de Precios en Mapa
- `crm` - Sistema de Leads y CRM Básico

**Fase 3: Scale Features**
- `insights` - Market Insights Dashboard
- `api` - API REST Pública

### 2. Iniciar Sprint BMAD

```bash
# Opción 1: Script rápido
./bmad/scripts/quick_start.sh comparison

# Opción 2: Manual
python3 bmad/scripts/feature_tracker.py --start comparison
python3 bmad/scripts/orchestrator.py --feature comparison
```

### 3. Seguir el Plan de Implementación

El orquestador ejecutará las fases automáticamente, pero debes implementar según el plan:

1. **Backend**: Crear tablas, API routes, validaciones
2. **Frontend**: Crear componentes, páginas, integraciones
3. **Database**: Migraciones, seeds, RLS policies
4. **Testing**: Tests unitarios, E2E, integración

### 4. Monitorear Progreso

```bash
# Ver status de feature actual
python3 bmad/scripts/feature_tracker.py --status comparison

# Ver reporte completo
python3 bmad/scripts/feature_tracker.py --report

# Ver resumen de fase
python3 bmad/scripts/feature_tracker.py --phase "Fase 1: MVP Plus"
```

### 5. Validación Automática

El sistema ejecutará automáticamente:
- ✅ TypeScript type checking
- ✅ ESLint
- ✅ Build verification
- ✅ Tests (pytest)
- ✅ CI/CD pipeline

### 6. Commit y Deploy

Cuando el score >= 9.5:
- ✅ Auto-commit (si está habilitado)
- ✅ Push a branch
- ✅ CI/CD se ejecuta automáticamente
- ✅ Deploy a Vercel (si está en main)

## 🔄 Mapeo de Tareas del Plan a BMAD

### Ejemplo: Comparación de Propiedades

**Del Plan:**
```
Backend:
- [ ] Crear tabla pricewaze_comparisons
- [ ] Crear RLS policies
- [ ] Crear API route /api/comparisons

Frontend:
- [ ] Crear componente PropertyComparison.tsx
- [ ] Crear página /comparison
- [ ] Integrar con property-store.ts
```

**En BMAD:**
```bash
# 1. Iniciar tracking
python3 bmad/scripts/feature_tracker.py --start comparison

# 2. Implementar tareas del plan manualmente
# (crear archivos, escribir código)

# 3. Marcar tareas completadas
python3 bmad/scripts/feature_tracker.py --complete comparison "Crear tabla"

# 4. Ejecutar validación
python3 bmad/scripts/orchestrator.py --phase validate

# 5. Si pasa, continuar con siguiente tarea
# 6. Si falla, revisar errores y corregir
```

## 📊 Tracking de Tareas

El sistema rastrea automáticamente:
- ✅ Tareas completadas
- ⏳ Tareas pendientes
- 📈 Progreso porcentual
- 🔄 Iteraciones
- 📊 Scores promedio

## 🎯 Criterios de Éxito

Una funcionalidad se considera completa cuando:
- ✅ Todas las tareas del plan están completadas
- ✅ Score promedio >= 9.0
- ✅ Tests pasando
- ✅ CI/CD verde
- ✅ Type safe
- ✅ Sin errores de lint

## 🚨 Manejo de Errores

Si una fase falla:

1. **Revisar logs**: `bmad/logs/orchestrator_YYYYMMDD.log`
2. **Ver errores específicos**: `bmad/reports/report_*_*.json`
3. **Ejecutar fallback**: `python3 bmad/scripts/orchestrator.py --phase fallback`
4. **Corregir errores** según el plan
5. **Re-ejecutar validación**: `python3 bmad/scripts/orchestrator.py --phase validate`

## 📝 Ejemplo Completo

### Implementar "Comparación de Propiedades"

```bash
# 1. Iniciar sprint
./bmad/scripts/quick_start.sh comparison

# 2. Implementar según plan (manual):
# - Crear migración SQL
# - Crear API routes
# - Crear componentes React
# - Escribir tests

# 3. Validar
python3 bmad/scripts/orchestrator.py --phase validate

# 4. Si pasa, continuar
# 5. Si falla, corregir y re-validar

# 6. Al completar todas las tareas:
python3 bmad/scripts/orchestrator.py --feature comparison

# 7. Ver reporte final
python3 bmad/scripts/feature_tracker.py --report
```

## 🔗 Integración con GitHub Actions

El workflow `.github/workflows/bmad-orchestrator.yml` permite:

- Ejecutar BMAD desde GitHub Actions
- Ver reportes en artifacts
- Auto-commit en éxito (opcional)

**Uso:**
1. Ir a GitHub > Actions > BMAD Orchestrator
2. Click "Run workflow"
3. Seleccionar feature y fase
4. Ejecutar

## 📚 Referencias

- `PLAN_IMPLEMENTACION.md`: Plan detallado de funcionalidades
- `bmad/README.md`: Documentación del sistema BMAD
- `bmad.toml`: Configuración del sistema

---

**Nota**: El sistema BMAD orquesta y valida, pero la implementación real del código debe seguir el plan manualmente.

