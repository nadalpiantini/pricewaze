# ⚔️ BMAD Orchestrated Full Cycle 3.0

Sistema de orquestación de desarrollo basado en agentes (Serena, Taskmaster, Superpowers) con integración LangGraph.

## 📋 Descripción

BMAD 3.0 es un framework de desarrollo orquestado que:
- **Automatiza** el ciclo completo de desarrollo
- **Valida** cada fase antes de continuar
- **Rastrea** el progreso de funcionalidades
- **Integra** con CI/CD existente
- **Genera** reportes y logs completos

## 🚀 Inicio Rápido

### 1. Iniciar un Sprint para una Funcionalidad

```bash
# Iniciar sprint para comparación de propiedades
python bmad/scripts/orchestrator.py --feature comparison

# O ejecutar ciclo completo
python bmad/scripts/orchestrator.py --feature comparison
```

### 2. Ejecutar una Fase Específica

```bash
# Solo desarrollo
python bmad/scripts/orchestrator.py --phase dev

# Solo validación
python bmad/scripts/orchestrator.py --phase validate

# Solo revisión
python bmad/scripts/orchestrator.py --phase review
```

### 3. Rastrear Progreso

```bash
# Iniciar tracking de feature
python bmad/scripts/feature_tracker.py --start comparison

# Ver status
python bmad/scripts/feature_tracker.py --status comparison

# Generar reporte completo
python bmad/scripts/feature_tracker.py --report

# Ver resumen de fase
python bmad/scripts/feature_tracker.py --phase "Fase 1: MVP Plus"
```

## 📁 Estructura

```
bmad/
├── README.md                    # Este archivo
├── logs/                        # Logs de ejecución
│   ├── orchestrator_YYYYMMDD.log
│   └── sprint_*_*.json
├── reports/                     # Reportes de autoevaluación
│   └── report_*_*.json
├── tracking/                    # Tracking de implementación
│   └── implementation.json
├── learning/                    # Base de conocimiento incremental
└── scripts/
    ├── orchestrator.py          # Orquestador principal
    └── feature_tracker.py       # Rastreador de features
```

## 🔄 Workflow Completo

### Fase 1: Desarrollo
- Frontend: componentes, UX coherente
- Backend: endpoints, lógica, validaciones
- Database: modelos, seeds, migraciones
- Integración + Debug + Pruebas unitarias

**Threshold**: 8.5/10

### Fase 2: Validación
- Accesibilidad UI
- Jerarquía de overlays
- Consistencia visual
- Conectividad funcional
- TypeScript type safety
- ESLint compliance
- Supabase RLS policies
- API endpoint validation

**Threshold**: 9.0/10

### Fase 3: Ciclos de Revisión Profunda
- 8 iteraciones de validación
- Si aparece error nuevo, reinicia ciclos
- Métricas: error_rate_reduction >= 15%, convergencia = 0 errores

### Fase 4: DevOps + CI/CD
- Build pipeline
- Test staging
- Deploy localhost
- Integración con GitHub Actions

### Fase 5: Control de Versiones
- 1 sprint exitoso = 1 commit
- Auto-push habilitado
- Threshold: 9.5/10

### Fase 6: Registro de Actividad
- Logs JSON completos
- Tracking de sprints
- Historial de iteraciones

### Fase 7: Fallback Inteligente
- Diagnóstico automático
- Re-apertura de issues
- Iteración con confirmación

### Fase 8: Finalización y Deploy
- Verificación de condiciones
- Commit final
- Push a main
- Deploy a producción

## 📊 Integración con Plan de Implementación

El sistema está integrado con `PLAN_IMPLEMENTACION.md`:

- **Fase 1**: comparison, alerts, gallery, reviews
- **Fase 2**: chat, valuation, heatmap, crm
- **Fase 3**: insights, api

Cada funcionalidad se rastrea individualmente con:
- Estado (not_started, in_progress, completed)
- Progreso (%)
- Tareas completadas/pendientes
- Iteraciones
- Scores promedio

## 🔍 Observabilidad

### Logs
- Logs diarios en `bmad/logs/orchestrator_YYYYMMDD.log`
- Logs de sprint en `bmad/logs/sprint_*_*.json`

### Reportes
- Reportes de autoevaluación en `bmad/reports/report_*_*.json`
- Incluyen scores, errores, iteraciones

### Tracking
- Estado actualizado en `bmad/tracking/implementation.json`
- Progreso por feature y fase

## 🛠️ Configuración

Editar `bmad.toml` para ajustar:
- Thresholds de validación
- Número de iteraciones
- Integraciones CI/CD
- Paths de logs y reportes

## 📈 Métricas

El sistema rastrea:
- **Performance**: tiempos de ciclo
- **Error Heatmap**: distribución de errores
- **Validation Scores**: scores por fase
- **CI/CD Status**: estado de pipelines
- **Test Results**: resultados de tests
- **Deployment Status**: estado de deployments

## 🎯 Objetivo Final

Sistema modular, sin errores, versionado, con trazabilidad completa:
- ✅ CI/CD OK
- ✅ Logs Completos
- ✅ Puntuación >= 9.5
- ✅ Tests Passing
- ✅ Type Safe
- ✅ Deployed Production

## 🔗 Integraciones

- **GitHub Actions**: CI/CD pipelines
- **Vercel**: Deployment
- **Supabase**: Database
- **CrewAI**: Testing agents
- **TypeScript**: Type checking
- **ESLint**: Code quality

## 📝 Ejemplos de Uso

### Ejemplo 1: Implementar Comparación de Propiedades

```bash
# 1. Iniciar tracking
python bmad/scripts/feature_tracker.py --start comparison

# 2. Ejecutar ciclo completo
python bmad/scripts/orchestrator.py --feature comparison

# 3. Ver progreso
python bmad/scripts/feature_tracker.py --status comparison

# 4. Generar reporte
python bmad/scripts/feature_tracker.py --report
```

### Ejemplo 2: Solo Validación

```bash
# Ejecutar solo fase de validación
python bmad/scripts/orchestrator.py --phase validate
```

### Ejemplo 3: Ver Resumen de Fase

```bash
# Ver progreso de Fase 1
python bmad/scripts/feature_tracker.py --phase "Fase 1: MVP Plus"
```

## 🚨 Troubleshooting

### Error: "Config file not found"
```bash
# Verificar que bmad.toml existe en raíz del proyecto
ls bmad.toml
```

### Error: "Tracking file not found"
```bash
# El sistema creará el archivo automáticamente
# Si persiste, crear manualmente:
mkdir -p bmad/tracking
echo '{"features": {}, "current": null}' > bmad/tracking/implementation.json
```

### Error: "Phase failed"
```bash
# Revisar logs
cat bmad/logs/orchestrator_$(date +%Y%m%d).log

# Ejecutar fallback
python bmad/scripts/orchestrator.py --phase fallback
```

## 📚 Referencias

- `PLAN_IMPLEMENTACION.md`: Plan detallado de funcionalidades
- `ANALISIS_REPOS_OPEN_SOURCE.md`: Análisis de repositorios
- `bmad.toml`: Configuración del sistema
- `.github/workflows/`: Pipelines CI/CD

---

**Versión**: 3.0  
**Última actualización**: 2026-01-06

