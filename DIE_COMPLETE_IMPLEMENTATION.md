# Decision Intelligence Engine (DIE) - Implementation Complete
**Fecha**: 2026-01-14  
**Versión**: DIE-3 (Complete)  
**Estado**: ✅ TODAS LAS FASES IMPLEMENTADAS

---

## 🎯 Resumen Ejecutivo

**Decision Intelligence Engine (DIE)** completamente implementado según PRD:
- ✅ DIE-1: Uncertainty + Market Dynamics
- ✅ DIE-2: Wait-Risk Engine
- ✅ DIE-3: Personalization Layer

**Propósito**: No predecir precios, sino reducir errores de decisión convirtiendo datos + señales en riesgo, timing y trade-offs claros.

---

## 📦 DIE-1: Uncertainty + Market Dynamics

### Uncertainty Engine
- ✅ Calcula rangos válidos usando percentiles (5th-95th)
- ✅ Determina incertidumbre (low/medium/high)
- ✅ Integrado con `pricewaze_avm_results` DB table
- ✅ Fallback a cálculo basado en zona si no hay AVM

### Market Dynamics Engine
- ✅ Detecta velocidad (stable/accelerating/decelerating)
- ✅ Change-point detection (aceleración/desaceleración)
- ✅ Determina régimen (hot/warm/cool/cold)
- ✅ Análisis de time series (price, inventory, days on market)

### Pressure Engine
- ✅ Combina señales (high_activity, many_visits, competing_offers)
- ✅ Métricas de competencia (ofertas activas, visitas recientes)
- ✅ Calcula presión total (0-100)

### Outputs DIE-1
- Price Assessment (rango, no número único)
- Uncertainty (low/medium/high)
- Market Velocity (stable/accelerating/decelerating)
- Current Pressure (low/medium/high)

---

## 📦 DIE-2: Wait-Risk Engine

### Wait-Risk Engine
- ✅ Calcula riesgo de esperar 7, 14, 30, 60 días
- ✅ Usa escenarios históricos de propiedades similares vendidas
- ✅ Considera presión actual, velocidad de mercado, competencia
- ✅ Genera trade-offs (disciplina vs probabilidad de perder)

### Factores Considerados
- Presión actual (high/medium/low)
- Velocidad de mercado (accelerating/stable/decelerating)
- Ofertas competidoras
- Escenarios históricos (propiedades similares vendidas)
- Posición del precio (dentro/fuera de rango)
- Horizonte temporal (más días = más riesgo)

### Outputs DIE-2
- Riesgo por días (7, 14, 30, 60)
- Nivel de riesgo (low/medium/high)
- Probabilidad de pérdida (0-1)
- Cambio de precio esperado (%)
- Recomendación general (act_now/wait_short/wait_medium/wait_long)
- Trade-offs explicados

---

## 📦 DIE-3: Personalization Layer

### User Decision Profile
- ✅ Campos agregados a `pricewaze_profiles`:
  - `decision_urgency` (high/medium/low)
  - `decision_risk_tolerance` (conservative/moderate/aggressive)
  - `decision_objective` (primary_residence/investment/vacation/flip)
  - `decision_budget_flexibility` (strict/moderate/flexible)

### Personalization Layer
- ✅ Adapta wait-risk recommendations basado en perfil
- ✅ Personaliza explicaciones y trade-offs
- ✅ Reglas simples (no reentrenamiento de modelos)
- ✅ "Just for you" sin complejidad

### Ajustes por Perfil

#### Urgency
- **High**: Bias hacia actuar ahora
- **Low**: Puede esperar más tiempo

#### Risk Tolerance
- **Conservative**: Evita esperas de alto riesgo
- **Aggressive**: Puede tomar más riesgos calculados

#### Objective
- **Investment**: Más paciente, enfoque en valor
- **Primary Residence**: Balance urgencia con valor
- **Flip**: Actuar rápido si buen deal

#### Budget Flexibility
- **Strict**: Menos margen para aumentos de precio
- **Flexible**: Puede esperar mejores deals

### Outputs DIE-3
- Recomendaciones personalizadas
- Explicaciones adaptadas al perfil
- Trade-offs contextualizados
- Versión DIE-3 cuando perfil disponible

---

## 🏗️ Arquitectura Completa

```
DIE Analysis Flow:
1. Uncertainty Engine
   ├─ Busca AVM results en DB
   ├─ Si existe → Usa rangos AVM
   └─ Si no → Calcula desde zona
2. Market Dynamics Engine
   └─ Detecta velocidad y cambios de régimen
3. Pressure Engine
   └─ Combina señales + competencia
4. Wait-Risk Engine (DIE-2)
   ├─ Analiza escenarios históricos
   └─ Calcula riesgo por horizonte temporal
5. Personalization Layer (DIE-3)
   └─ Adapta outputs al perfil del usuario
6. Copilot Explanations
   └─ LLM explica (no calcula)
7. Save AVM Result
   └─ Guarda en DB para uso futuro
```

---

## 📝 Archivos Implementados

### Engines
- `src/lib/die/uncertainty-engine.ts` - DIE-1
- `src/lib/die/dynamics-engine.ts` - DIE-1
- `src/lib/die/pressure-engine.ts` - DIE-1
- `src/lib/die/wait-risk-engine.ts` - DIE-2
- `src/lib/die/personalization-layer.ts` - DIE-3
- `src/lib/die/copilot-explanations.ts` - All
- `src/lib/die/save-avm-result.ts` - All
- `src/lib/die/index.ts` - Orchestrator

### Types & Interfaces
- `src/types/die.ts` - Tipos completos

### API & UI
- `src/app/api/ai/die/route.ts` - API endpoint
- `src/components/pricing/FairnessPanelV2.tsx` - UI component

### Database
- `supabase/migrations/20260113000001_decision_intelligence_engine.sql` - AVM results, market pressure, dynamics
- `supabase/migrations/20260113000002_update_fairness_function_with_ranges.sql` - Fairness function con rangos
- `supabase/migrations/20260113000003_decision_panels_v2.sql` - Decision panels table
- `supabase/migrations/20260114000001_user_decision_profile.sql` - User profile fields

---

## 🚀 Uso

### API
```typescript
const response = await fetch(`/api/ai/die?property_id=${propertyId}`);
const analysis: DIEAnalysis = await response.json();
// Si usuario tiene perfil, análisis será DIE-3 (personalizado)
// Si no, será DIE-2 (genérico)
```

### Componente
```tsx
import { FairnessPanelV2 } from '@/components/pricing/FairnessPanelV2';

<FairnessPanelV2 
  propertyId={property.id}
  onAnalysisComplete={(analysis) => {
    console.log('Version:', analysis.version); // 'DIE-2' or 'DIE-3'
    console.log('Wait Risk:', analysis.waitRisk);
  }}
/>
```

### Configurar Perfil de Usuario
```sql
UPDATE pricewaze_profiles
SET 
  decision_urgency = 'high',
  decision_risk_tolerance = 'moderate',
  decision_objective = 'primary_residence',
  decision_budget_flexibility = 'strict'
WHERE id = 'user-id';
```

---

## 📊 Outputs Completos del DIE

### Price Assessment
- Rango de precios (min, median, max) con 90% coverage
- Asking price status (within/below/above range)
- Uncertainty level (low/medium/high)
- Uncertainty metrics (coverage, range width, %)

### Market Dynamics
- Velocity (stable/accelerating/decelerating)
- Current regime (hot/warm/cool/cold)
- Change points detectados
- Time series trends

### Current Pressure
- Pressure level (low/medium/high)
- Signal flags
- Competition metrics
- Pressure score (0-100)

### Wait Risk (DIE-2)
- Risk by days (7, 14, 30, 60)
- Risk levels and scores
- Probability of loss
- Expected price change
- Recommendation
- Trade-offs

### Personalization (DIE-3)
- Personalized recommendations
- Contextualized explanations
- Profile-adapted trade-offs

### Explanations
- Uncertainty explanation
- Velocity explanation
- Timing explanation (con wait-risk)
- Decision context (personalizado si DIE-3)

---

## ⚠️ NO-GO List (Respetado)

- ❌ "precio correcto" → Usamos rangos
- ❌ Tiempo real en pricing → Offline AVM
- ❌ Deep learning opaco → Algoritmos explicables
- ❌ Recomendaciones automáticas → Solo explicaciones

---

## 📋 Métricas de Éxito (Futuro)

- ↓ Decisiones revertidas por "llegué tarde"
- ↑ Uso del panel antes de enviar oferta
- ↑ Acción post-alerta (timing)
- Confianza del usuario (encuestas cortas)
- ↑ Conversión de usuarios con perfil personalizado

---

## 🎯 Copy Legal

**Estimación contextual para apoyar decisiones. No es una tasación oficial.**

---

## ✅ Estado Final

- ✅ DIE-1: Uncertainty + Market Dynamics - COMPLETO
- ✅ DIE-2: Wait-Risk Engine - COMPLETO
- ✅ DIE-3: Personalization Layer - COMPLETO
- ✅ Integración con DB completa
- ✅ API route operativa
- ✅ UI component funcional
- ✅ Documentación completa
- ✅ Código en producción

---

**Versión Final**: DIE-3 (Complete Implementation)  
**Fecha de Cierre**: 2026-01-14  
**Commits**:
- `9cd19db` - DIE-1
- `4485511` - DIE-2 + DIE-3

