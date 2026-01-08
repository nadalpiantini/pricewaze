# 🧠 Radar Cognitivo Inmobiliario - 7 Alertas Automáticas

## Visión

**No es un chatbot reactivo. Es un radar proactivo.**

El Radar Cognitivo detecta anomalías, riesgos y oportunidades **antes** de que el usuario pregunte. Como Waze: no espera que preguntes "¿hay tráfico?", te avisa.

**Filosofía**: 
- ✅ Complejo por dentro (múltiples fuentes de datos, razonamiento)
- ✅ Invisible por fuera (el usuario solo ve: "Ojo aquí", "Ahora no", "Esto sí")

---

## 🎯 Las 7 Alertas Automáticas

### 1. 🚨 Precio Emocional

**Qué detecta**: Propiedades con precio desalineado por factores emocionales del vendedor (no por valor de mercado).

**Triggers**:
```typescript
// Se dispara cuando:
- Fairness score < 40 (significativamente sobrepreciado)
- Days on market > 60
- Precio está > 15% por encima del AVM high_estimate
- NO hay señales de "high_activity" o "competing_offers"
- Historial de precio: múltiples reducciones pequeñas (vendedor probando)
- Zona tiene propiedades similares vendidas 10-20% más baratas recientemente
```

**Datos que usa**:
- `pricewaze_avm_results` (estimate, low, high)
- `pricewaze_properties` (price, created_at, price_history si existe)
- `pricewaze_property_signal_state` (high_activity, competing_offers)
- `pricewaze_zones` (avg_price_m2, comparables vendidos)
- `pricewaze_offers` (count de ofertas activas = 0)

**Lógica de detección**:
```sql
-- Función SQL para detectar precio emocional
CREATE OR REPLACE FUNCTION pricewaze_detect_emotional_pricing(
  p_property_id UUID
)
RETURNS TABLE (
  is_emotional BOOLEAN,
  confidence DECIMAL(5,2),
  evidence JSONB,
  suggested_price DECIMAL(15,2)
) AS $$
DECLARE
  v_property RECORD;
  v_avm RECORD;
  v_days_on_market INTEGER;
  v_fairness_score DECIMAL(5,2);
  v_has_activity BOOLEAN;
  v_has_competition BOOLEAN;
  v_zone_avg DECIMAL(15,2);
  v_price_deviation DECIMAL(10,2);
BEGIN
  -- Obtener propiedad
  SELECT p.*, z.avg_price_m2
  INTO v_property
  FROM pricewaze_properties p
  LEFT JOIN pricewaze_zones z ON p.zone_id = z.id
  WHERE p.id = p_property_id;
  
  -- Obtener AVM
  SELECT estimate, low_estimate, high_estimate
  INTO v_avm
  FROM pricewaze_avm_results
  WHERE property_id = p_property_id
    AND (expires_at IS NULL OR expires_at > NOW())
  ORDER BY generated_at DESC
  LIMIT 1;
  
  -- Calcular días en mercado
  v_days_on_market := EXTRACT(DAY FROM (NOW() - v_property.created_at))::INTEGER;
  
  -- Verificar actividad
  v_has_activity := EXISTS (
    SELECT 1 FROM pricewaze_property_signal_state
    WHERE property_id = p_property_id
      AND signal_type IN ('high_activity', 'many_visits')
      AND strength > 50
  );
  
  -- Verificar competencia
  v_has_competition := EXISTS (
    SELECT 1 FROM pricewaze_offers
    WHERE property_id = p_property_id
      AND status IN ('pending', 'countered')
  );
  
  -- Calcular desviación de precio
  IF v_avm.high_estimate IS NOT NULL THEN
    v_price_deviation := ((v_property.price - v_avm.high_estimate) / v_avm.high_estimate) * 100;
  ELSIF v_property.avg_price_m2 IS NOT NULL AND v_property.area_m2 IS NOT NULL THEN
    v_price_deviation := ((v_property.price - (v_property.avg_price_m2 * v_property.area_m2)) / (v_property.avg_price_m2 * v_property.area_m2)) * 100;
  ELSE
    v_price_deviation := 0;
  END IF;
  
  -- Calcular fairness score aproximado
  IF v_price_deviation > 15 THEN
    v_fairness_score := 30;
  ELSIF v_price_deviation > 10 THEN
    v_fairness_score := 40;
  ELSE
    v_fairness_score := 50;
  END IF;
  
  -- Determinar si es precio emocional
  -- Condiciones: precio alto + tiempo en mercado + sin actividad + sin competencia
  IF v_price_deviation > 12 
     AND v_days_on_market > 60
     AND NOT v_has_activity
     AND NOT v_has_competition
     AND v_fairness_score < 45 THEN
    
    RETURN QUERY SELECT
      TRUE AS is_emotional,
      LEAST(90, 50 + (v_price_deviation - 12) * 2 + (v_days_on_market - 60) / 10) AS confidence,
      jsonb_build_object(
        'price_deviation_pct', v_price_deviation,
        'days_on_market', v_days_on_market,
        'fairness_score', v_fairness_score,
        'has_activity', v_has_activity,
        'has_competition', v_has_competition,
        'avm_high', v_avm.high_estimate,
        'current_price', v_property.price
      ) AS evidence,
      COALESCE(v_avm.estimate, v_property.avg_price_m2 * v_property.area_m2) AS suggested_price;
  ELSE
    RETURN QUERY SELECT FALSE, 0::DECIMAL, '{}'::jsonb, NULL::DECIMAL;
  END IF;
END;
$$ LANGUAGE plpgsql;
```

**Narrativa para el usuario**:
```
🚨 Precio Emocional Detectado

Esta propiedad está sobrepreciada por factores emocionales del vendedor, no por valor de mercado.

**Evidencia:**
- Precio actual: $220,000 (18% por encima del rango justo)
- Días en mercado: 75 días (promedio zona: 35 días)
- Sin actividad: Cero visitas recientes, cero ofertas
- Fairness score: 32/100 (rojo)

**Patrón detectado:**
El vendedor probablemente tiene un precio "ideal" en mente (quizás lo que pagó + mejoras), pero el mercado no lo respalda. Las propiedades similares se vendieron entre $180K-$195K en los últimos 90 días.

**Recomendación:**
- Precio sugerido para negociación: $190,000
- Estrategia: Ofrece $185K inicialmente. El vendedor está probando el mercado y probablemente aceptará una reducción significativa después de 60+ días sin interés.
- Timing: Ahora es buen momento. El vendedor está más flexible después de 75 días.

**Riesgo si esperas:**
Si el vendedor baja el precio oficialmente, atraerá más competencia. Mejor negociar ahora cuando hay poca competencia.
```

---

### 2. ⏰ Timing Incorrecto

**Qué detecta**: Usuario está a punto de hacer una oferta o decisión en un momento subóptimo (fin de mes vs fin de trimestre, ciclo de mercado, etc.).

**Triggers**:
```typescript
// Se dispara cuando:
- Usuario está a punto de enviar oferta
- DIE wait_risk cambia de "low" a "medium/high" en últimos 7 días
- Market velocity cambia de "stable" a "accelerating"
- Competencia aumenta (nuevas ofertas activas)
- Señales de "high_activity" aparecen recientemente
- Timing del mes/trimestre es desfavorable (ej: fin de mes = presión de cierre)
- Usuario tiene perfil "conservative" pero mercado está "hot"
```

**Datos que usa**:
- `pricewaze_decision_risk` (wait_risk_level, calculated_at)
- `pricewaze_market_dynamics` (market_velocity, change_detected_at)
- `pricewaze_offers` (count activas, created_at)
- `pricewaze_property_signal_state` (high_activity, many_visits, competing_offers)
- `pricewaze_profiles` (decision_risk_tolerance, decision_urgency)
- Fecha actual (día del mes, día de la semana, fin de trimestre)

**Lógica de detección**:
```typescript
async function detectTimingIssue(
  propertyId: string,
  userId: string,
  action: 'making_offer' | 'viewing' | 'considering'
): Promise<TimingAlert | null> {
  // 1. Obtener estado actual del mercado
  const die = await getDIEAnalysis(propertyId);
  const dynamics = await getMarketDynamics(propertyId);
  const competition = await getCompetitionContext(propertyId);
  const userProfile = await getUserDecisionProfile(userId);
  
  // 2. Detectar cambios recientes
  const recentVelocityChange = await checkVelocityChange(propertyId, 7); // últimos 7 días
  const recentCompetitionIncrease = await checkCompetitionIncrease(propertyId, 7);
  const recentSignals = await getRecentSignals(propertyId, 48); // últimas 48h
  
  // 3. Analizar timing del calendario
  const calendarTiming = analyzeCalendarTiming();
  
  // 4. Detectar conflicto con perfil del usuario
  const profileConflict = detectProfileConflict(userProfile, die, dynamics);
  
  // 5. Determinar si hay timing issue
  const issues: TimingIssue[] = [];
  
  if (recentVelocityChange === 'accelerating' && die.summary.waitRisk === 'low') {
    issues.push({
      type: 'market_accelerating',
      severity: 'high',
      message: 'El mercado está acelerando. Si esperas, puede que pierdas la oportunidad.',
      recommendation: 'act_now',
    });
  }
  
  if (recentCompetitionIncrease > 2 && competition.activeOffers > 0) {
    issues.push({
      type: 'competition_increasing',
      severity: 'high',
      message: `La competencia aumentó: ${recentCompetitionIncrease} nuevas ofertas en 7 días.`,
      recommendation: 'act_fast',
    });
  }
  
  if (calendarTiming.isEndOfMonth && userProfile?.urgency === 'low') {
    issues.push({
      type: 'calendar_pressure',
      severity: 'medium',
      message: 'Fin de mes = presión de cierre. Vendedores más flexibles, pero también más competencia.',
      recommendation: 'negotiate_aggressively',
    });
  }
  
  if (profileConflict) {
    issues.push({
      type: 'profile_mismatch',
      severity: 'medium',
      message: profileConflict.message,
      recommendation: profileConflict.recommendation,
    });
  }
  
  if (issues.length > 0) {
    return {
      propertyId,
      userId,
      action,
      issues,
      optimalTiming: calculateOptimalTiming(propertyId, userProfile),
      explanation: generateTimingExplanation(issues, die, dynamics),
    };
  }
  
  return null;
}
```

**Narrativa para el usuario**:
```
⏰ Timing Subóptimo Detectado

Estás a punto de hacer una oferta, pero el timing no es ideal. Aquí está por qué:

**Cambios recientes (últimos 7 días):**
- 🚀 Mercado acelerando: Velocidad cambió de "estable" a "acelerando"
- 📈 Competencia aumentando: 3 nuevas ofertas activas (antes: 1)
- 🔥 Alta actividad: 8 visitas verificadas en 48h (señal "many_visits" confirmada)

**Tu perfil vs mercado:**
- Tu perfil: "Conservative" + "Low urgency"
- Mercado actual: "Hot" + "Accelerating"
- Conflicto: Estás siendo demasiado cauteloso para un mercado que se está moviendo rápido

**Recomendación:**
- **Si actúas ahora**: Ofrece $195K (tu oferta balanceada). El mercado está caliente, pero aún hay espacio.
- **Si esperas 1 semana**: Probablemente habrá más competencia. Tu oferta de $195K podría quedar fuera.
- **Timing óptimo**: Los próximos 3 días son ideales. Después, el riesgo aumenta.

**Alternativa si prefieres esperar:**
Si realmente quieres ser conservador, considera propiedades con menos competencia. Esta tiene señales de "hot market".

¿Quieres que te muestre propiedades similares con menos presión de mercado?
```

---

### 3. 📍 Zona en Inflexión

**Qué detecta**: Zonas que están cambiando de régimen (de "cool" a "warm", de "warm" a "hot", o viceversa). Oportunidad o riesgo según dirección.

**Triggers**:
```typescript
// Se dispara cuando:
- Market velocity de la zona cambia (stable → accelerating, o accelerating → decelerating)
- Inventario cambia significativamente (nuevas propiedades vs vendidas)
- Precio promedio de la zona cambia > 5% en 30 días
- Señales de zona emergente (nuevas propiedades premium, mejoras de infraestructura)
- Absorción de inventario cambia (días en mercado promedio)
- Comparables recientes muestran patrón diferente
```

**Datos que usa**:
- `pricewaze_zones` (avg_price_m2, property_count, boundary)
- `pricewaze_market_dynamics` (market_velocity, change_detected_at)
- `pricewaze_properties` (price, created_at, status, zone_id)
- `pricewaze_avm_results` (tendencias de estimaciones)
- PostGIS para análisis espacial (propiedades cercanas, micro-zonas)

**Lógica de detección**:
```sql
-- Función para detectar zonas en inflexión
CREATE OR REPLACE FUNCTION pricewaze_detect_zone_inflection(
  p_zone_id UUID,
  p_lookback_days INTEGER DEFAULT 90
)
RETURNS TABLE (
  is_inflecting BOOLEAN,
  inflection_type TEXT, -- 'emerging' | 'cooling' | 'accelerating' | 'decelerating'
  confidence DECIMAL(5,2),
  evidence JSONB,
  recommendation TEXT
) AS $$
DECLARE
  v_zone RECORD;
  v_current_velocity TEXT;
  v_previous_velocity TEXT;
  v_price_trend DECIMAL(10,2);
  v_inventory_change INTEGER;
  v_absorption_rate DECIMAL(10,2);
  v_recent_sales INTEGER;
  v_new_listings INTEGER;
BEGIN
  -- Obtener datos de la zona
  SELECT 
    z.*,
    COUNT(DISTINCT p.id) FILTER (WHERE p.status = 'active') AS active_count,
    COUNT(DISTINCT p.id) FILTER (WHERE p.status = 'sold' AND p.updated_at > NOW() - (p_lookback_days || ' days')::INTERVAL) AS recent_sales,
    COUNT(DISTINCT p.id) FILTER (WHERE p.status = 'active' AND p.created_at > NOW() - (p_lookback_days || ' days')::INTERVAL) AS new_listings
  INTO v_zone
  FROM pricewaze_zones z
  LEFT JOIN pricewaze_properties p ON p.zone_id = z.id
  WHERE z.id = p_zone_id
  GROUP BY z.id;
  
  -- Obtener velocity actual
  SELECT market_velocity
  INTO v_current_velocity
  FROM pricewaze_market_dynamics
  WHERE zone_id = p_zone_id
  ORDER BY calculated_at DESC
  LIMIT 1;
  
  -- Obtener velocity anterior (30 días atrás)
  SELECT market_velocity
  INTO v_previous_velocity
  FROM pricewaze_market_dynamics
  WHERE zone_id = p_zone_id
    AND calculated_at < NOW() - INTERVAL '30 days'
  ORDER BY calculated_at DESC
  LIMIT 1;
  
  -- Calcular tendencia de precio
  WITH price_changes AS (
    SELECT 
      AVG(price) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') AS recent_avg,
      AVG(price) FILTER (WHERE created_at > NOW() - INTERVAL '60 days' AND created_at <= NOW() - INTERVAL '30 days') AS previous_avg
    FROM pricewaze_properties
    WHERE zone_id = p_zone_id AND status = 'active'
  )
  SELECT 
    CASE 
      WHEN previous_avg > 0 THEN ((recent_avg - previous_avg) / previous_avg) * 100
      ELSE 0
    END
  INTO v_price_trend
  FROM price_changes;
  
  -- Calcular cambio de inventario
  v_inventory_change := v_zone.new_listings - v_zone.recent_sales;
  
  -- Calcular tasa de absorción
  v_absorption_rate := CASE 
    WHEN v_zone.active_count > 0 THEN (v_zone.recent_sales::DECIMAL / v_zone.active_count) * 100
    ELSE 0
  END;
  
  -- Determinar tipo de inflexión
  IF v_current_velocity = 'accelerating' AND v_previous_velocity = 'stable' THEN
    -- Zona emergente/acelerando
    IF v_price_trend > 3 AND v_absorption_rate > 20 THEN
      RETURN QUERY SELECT
        TRUE,
        'emerging'::TEXT,
        LEAST(95, 70 + (v_price_trend * 2) + (v_absorption_rate / 2)) AS confidence,
        jsonb_build_object(
          'velocity_change', v_current_velocity || ' → ' || v_previous_velocity,
          'price_trend_pct', v_price_trend,
          'absorption_rate', v_absorption_rate,
          'new_listings', v_zone.new_listings,
          'recent_sales', v_zone.recent_sales
        ) AS evidence,
        'Esta zona está emergiendo. Precios subiendo, alta absorción. Buena oportunidad para comprar antes de que suba más.' AS recommendation;
    END IF;
  ELSIF v_current_velocity = 'decelerating' AND v_previous_velocity = 'accelerating' THEN
    -- Zona enfriándose
    IF v_price_trend < -2 AND v_absorption_rate < 10 THEN
      RETURN QUERY SELECT
        TRUE,
        'cooling'::TEXT,
        LEAST(95, 70 + ABS(v_price_trend * 2) + (30 - v_absorption_rate)) AS confidence,
        jsonb_build_object(
          'velocity_change', v_current_velocity || ' → ' || v_previous_velocity,
          'price_trend_pct', v_price_trend,
          'absorption_rate', v_absorption_rate,
          'inventory_change', v_inventory_change
        ) AS evidence,
        'Esta zona está enfriándose. Precios bajando, baja absorción. Considera esperar o negociar agresivamente.' AS recommendation;
    END IF;
  END IF;
  
  -- Si no hay inflexión clara
  RETURN QUERY SELECT FALSE, NULL::TEXT, 0::DECIMAL, '{}'::jsonb, NULL::TEXT;
END;
$$ LANGUAGE plpgsql;
```

**Narrativa para el usuario**:
```
📍 Zona en Inflexión Detectada: Piantini está Emergiendo

Esta zona está cambiando de régimen. Aquí está lo que está pasando:

**Cambio detectado:**
- Velocidad: "Estable" → "Acelerando" (últimos 30 días)
- Precio promedio: +5.2% en 30 días
- Absorción: 22% (muy alta, propiedades se venden rápido)
- Nuevas propiedades: 8 (vs 12 vendidas = inventario bajando)

**Qué significa:**
Esta zona está en un momento de inflexión positiva. Los precios están subiendo, el inventario se está absorbiendo rápido, y hay más demanda que oferta.

**Oportunidad:**
- **Si compras ahora**: Probablemente compras al inicio de una subida de precios. Buena inversión a mediano plazo.
- **Si esperas 6 meses**: Los precios probablemente serán 8-12% más altos. Perderás la ventana.

**Riesgo:**
- **Competencia**: Con alta absorción, hay más compradores compitiendo. Ofertas agresivas pueden ser necesarias.
- **Timing**: La ventana de "buen precio" se está cerrando. En 3-6 meses, esta zona será más cara.

**Recomendación:**
Si esta zona te interesa, actúa rápido. Ofrece cerca del precio de lista (fairness score 65-70 es aceptable aquí porque la zona está subiendo). No esperes a que baje el precio, porque probablemente no lo hará.

**Alternativa:**
Si prefieres zonas más estables, considera Naco o Evaristo Morales, que tienen precios similares pero menos presión de mercado.

¿Quieres que analice propiedades específicas en esta zona con mejor relación precio/valor?
```

---

### 4. 💰 Oferta Subóptima

**Qué detecta**: Usuario está a punto de hacer una oferta que no maximiza su poder de negociación o no está alineada con el contexto del mercado.

**Triggers**:
```typescript
// Se dispara cuando:
- Usuario está a punto de enviar oferta
- Oferta está fuera del rango sugerido (aggressive/balanced/conservative)
- Oferta no aprovecha el poder de negociación del usuario
- Oferta no considera timing (DIE wait_risk, market velocity)
- Oferta no considera competencia (hay espacio para ser más agresivo)
- Oferta no considera perfil del usuario (conservative haciendo oferta agresiva, o viceversa)
```

**Datos que usa**:
- `pricewaze_offers` (oferta propuesta)
- `pricewaze_calculate_offer_fairness()` (fairness de la oferta)
- `pricewaze_decision_risk` (wait_risk, negotiation power)
- `pricewaze_market_pressure` (competencia, presión)
- `pricewaze_profiles` (decision_risk_tolerance, decision_objective)
- `pricewaze_avm_results` (rango justo)
- `pricewaze_negotiation_coherence` (si hay negociación en curso)

**Lógica de detección**:
```typescript
async function detectSuboptimalOffer(
  propertyId: string,
  offerAmount: number,
  userId: string
): Promise<OfferAlert | null> {
  // 1. Obtener contexto completo
  const property = await getProperty(propertyId);
  const fairness = await getFairnessBreakdown(propertyId, offerAmount);
  const die = await getDIEAnalysis(propertyId);
  const suggestedOffers = await getSuggestedOffers(propertyId);
  const competition = await getCompetitionContext(propertyId);
  const userProfile = await getUserDecisionProfile(userId);
  const negotiationPower = await getNegotiationPower(propertyId, userId);
  
  // 2. Analizar la oferta propuesta
  const offerAnalysis = {
    amount: offerAmount,
    vsAsking: ((offerAmount / property.price) - 1) * 100,
    vsFairValue: ((offerAmount / fairness.avm.estimate) - 1) * 100,
    vsSuggested: {
      aggressive: ((offerAmount / suggestedOffers.aggressive) - 1) * 100,
      balanced: ((offerAmount / suggestedOffers.balanced) - 1) * 100,
      conservative: ((offerAmount / suggestedOffers.conservative) - 1) * 100,
    },
    fairnessLabel: fairness.breakdown.priceFairness,
    fairnessScore: fairness.breakdown.overallScore,
  };
  
  // 3. Detectar problemas
  const issues: OfferIssue[] = [];
  
  // Problema 1: Oferta demasiado conservadora cuando hay poder de negociación
  if (negotiationPower.score > 70 && offerAnalysis.vsSuggested.conservative > 2) {
    issues.push({
      type: 'too_conservative',
      severity: 'high',
      message: `Tu poder de negociación es alto (${negotiationPower.score}/100), pero estás ofreciendo cerca del precio conservador.`,
      recommendation: `Considera ofrecer $${suggestedOffers.balanced.toLocaleString()} (balanceada) para maximizar tu ventaja.`,
      potentialSavings: suggestedOffers.balanced - offerAmount,
    });
  }
  
  // Problema 2: Oferta demasiado agresiva cuando hay competencia
  if (competition.activeOffers > 0 && offerAnalysis.vsSuggested.aggressive < -5) {
    issues.push({
      type: 'too_aggressive',
      severity: 'high',
      message: `Hay ${competition.activeOffers} ofertas activas. Tu oferta es muy agresiva y probablemente será rechazada.`,
      recommendation: `Considera ofrecer $${suggestedOffers.balanced.toLocaleString()} para ser competitivo.`,
      risk: 'rejection',
    });
  }
  
  // Problema 3: Oferta no aprovecha timing
  if (die.summary.waitRisk === 'high' && offerAnalysis.vsSuggested.balanced > 3) {
    issues.push({
      type: 'bad_timing',
      severity: 'medium',
      message: 'El riesgo de esperar es alto, pero estás ofreciendo muy por debajo del balanceado.',
      recommendation: 'Aumenta tu oferta a $' + suggestedOffers.balanced.toLocaleString() + ' para aprovechar el timing.',
    });
  }
  
  // Problema 4: Oferta no alineada con perfil del usuario
  if (userProfile?.riskTolerance === 'conservative' && offerAnalysis.vsSuggested.aggressive < -8) {
    issues.push({
      type: 'profile_mismatch',
      severity: 'low',
      message: 'Tu perfil es conservador, pero estás haciendo una oferta muy agresiva.',
      recommendation: 'Considera si realmente quieres asumir el riesgo de rechazo. Una oferta balanceada ($' + suggestedOffers.balanced.toLocaleString() + ') es más alineada con tu perfil.',
    });
  }
  
  // Problema 5: Oferta fuera del rango justo
  if (fairness.breakdown.priceFairness === 'red' && offerAmount < fairness.avm.low_estimate) {
    issues.push({
      type: 'outside_fair_range',
      severity: 'high',
      message: `Tu oferta está fuera del rango justo (${fairness.avm.low_estimate.toLocaleString()} - ${fairness.avm.high_estimate.toLocaleString()}).`,
      recommendation: `Ajusta a $${fairness.avm.low_estimate.toLocaleString()} (mínimo del rango justo) para tener mejor chance de aceptación.`,
    });
  }
  
  if (issues.length > 0) {
    return {
      propertyId,
      offerAmount,
      issues,
      suggestedOffer: calculateOptimalOffer(propertyId, userId, die, competition, userProfile),
      explanation: generateOfferExplanation(issues, fairness, die, competition, userProfile),
    };
  }
  
  return null;
}
```

**Narrativa para el usuario**:
```
💰 Oferta Subóptima Detectada

Tu oferta de $180,000 no maximiza tu poder de negociación. Aquí está por qué:

**Análisis de tu oferta:**
- vs Precio de lista: -10% (razonable)
- vs Valor justo: -5% (dentro del rango, pero en el límite inferior)
- vs Ofertas sugeridas:
  * Agresiva: $175K (estás +2.8% por encima)
  * Balanceada: $190K (estás -5.3% por debajo) ⚠️
  * Conservadora: $195K (estás -7.7% por debajo)

**Problemas detectados:**

1. **Poder de negociación no aprovechado** (Alta severidad)
   - Tu poder de negociación: 78/100 (muy alto)
   - La propiedad lleva 65 días en el mercado
   - Cero competencia (ninguna oferta activa)
   - Fairness score: 45/100 (rojo) = vendedor en posición débil
   - **Pero estás ofreciendo cerca del precio agresivo cuando podrías ofrecer el balanceado**

2. **Oferta fuera del rango justo** (Alta severidad)
   - Rango justo: $185K - $210K
   - Tu oferta: $180K (por debajo del mínimo)
   - Riesgo: El vendedor puede rechazarla por estar fuera del rango aceptable

**Recomendación:**
Ofrece **$190,000** (oferta balanceada) en lugar de $180K.

**Por qué:**
- Sigue siendo 5% por debajo del precio de lista (buen descuento)
- Está dentro del rango justo (fairness score 70/100 = verde)
- Aprovecha tu poder de negociación sin ser demasiado agresivo
- Reduce riesgo de rechazo
- Si el vendedor contraoferta, estarás en mejor posición desde $190K que desde $180K

**Potencial ahorro vs riesgo:**
- Ahorro adicional con $180K: $10K
- Riesgo de rechazo: Alto (fuera del rango justo)
- Ahorro con $190K: $0K vs tu oferta actual, pero dentro del rango = mayor probabilidad de aceptación

**Alternativa si quieres ser más agresivo:**
Si realmente quieres maximizar ahorro, ofrece $185K (mínimo del rango justo). Es más agresivo pero aún dentro del rango aceptable.

¿Quieres que ajuste tu oferta a $190K?
```

---

### 5. ⚠️ Riesgo Oculto

**Qué detecta**: Factores de riesgo que el usuario no está viendo (problemas estructurales, señales negativas, patrones históricos, etc.).

**Triggers**:
```typescript
// Se dispara cuando:
- Señales negativas de usuarios (noise, humidity, misleading_photos, etc.)
- Patrón histórico de la propiedad (múltiples listados, precio bajando consistentemente)
- Zona tiene problemas estructurales conocidos (inundaciones, construcción, etc.)
- Comparables muestran patrón de problemas (propiedades similares con señales negativas)
- Fairness score bajo pero sin explicación obvia (puede haber problema oculto)
- Días en mercado muy altos sin razón aparente (puede haber defecto no mencionado)
```

**Datos que usa**:
- `pricewaze_property_signals_raw` (señales negativas de usuarios)
- `pricewaze_property_signal_state` (señales confirmadas)
- `pricewaze_properties` (price_history, listing_history)
- `pricewaze_visits` (user feedback post-visita)
- `pricewaze_zones` (problemas conocidos de la zona)
- Comparables con señales similares

**Lógica de detección**:
```typescript
async function detectHiddenRisk(
  propertyId: string,
  userId: string
): Promise<RiskAlert | null> {
  // 1. Obtener señales negativas
  const negativeSignals = await getNegativeSignals(propertyId);
  
  // 2. Obtener patrón histórico
  const priceHistory = await getPriceHistory(propertyId);
  const listingHistory = await getListingHistory(propertyId);
  
  // 3. Obtener feedback de visitas
  const visitFeedback = await getVisitFeedback(propertyId);
  
  // 4. Obtener problemas de zona
  const zoneIssues = await getZoneKnownIssues(propertyId);
  
  // 5. Analizar comparables con problemas similares
  const comparableRisks = await getComparableRisks(propertyId);
  
  // 6. Detectar riesgos
  const risks: HiddenRisk[] = [];
  
  // Riesgo 1: Señales negativas confirmadas
  if (negativeSignals.confirmed.length > 0) {
    risks.push({
      type: 'confirmed_negative_signals',
      severity: 'high',
      signals: negativeSignals.confirmed,
      message: `${negativeSignals.confirmed.length} señales negativas confirmadas por otros usuarios.`,
      recommendation: 'Investiga estos problemas antes de hacer oferta. Considera una inspección profesional.',
    });
  }
  
  // Riesgo 2: Patrón de precio bajando
  if (priceHistory.trend === 'declining' && priceHistory.reductions > 2) {
    risks.push({
      type: 'price_declining_pattern',
      severity: 'medium',
      message: `El precio ha bajado ${priceHistory.reductions} veces. Puede haber un problema no mencionado.`,
      recommendation: 'Investiga por qué el precio sigue bajando. Puede haber defectos estructurales o problemas legales.',
    });
  }
  
  // Riesgo 3: Múltiples listados
  if (listingHistory.count > 2) {
    risks.push({
      type: 'multiple_listings',
      severity: 'medium',
      message: `Esta propiedad ha estado listada ${listingHistory.count} veces. Puede haber problemas que hacen que los compradores se retiren.`,
      recommendation: 'Investiga por qué las ventas anteriores no se completaron.',
    });
  }
  
  // Riesgo 4: Feedback negativo de visitas
  if (visitFeedback.negativeRatio > 0.3) {
    risks.push({
      type: 'negative_visit_feedback',
      severity: 'high',
      message: `${(visitFeedback.negativeRatio * 100).toFixed(0)}% de las visitas reportaron problemas.`,
      recommendation: 'Revisa el feedback específico de las visitas antes de proceder.',
    });
  }
  
  // Riesgo 5: Problemas conocidos de la zona
  if (zoneIssues.length > 0) {
    risks.push({
      type: 'zone_known_issues',
      severity: zoneIssues.some(i => i.severity === 'high') ? 'high' : 'medium',
      message: `La zona tiene problemas conocidos: ${zoneIssues.map(i => i.issue).join(', ')}.`,
      recommendation: 'Investiga cómo estos problemas afectan esta propiedad específica.',
    });
  }
  
  // Riesgo 6: Comparables con problemas similares
  if (comparableRisks.length > 0) {
    risks.push({
      type: 'comparable_risks',
      severity: 'medium',
      message: `Propiedades similares en la zona tienen problemas: ${comparableRisks.map(r => r.risk).join(', ')}.`,
      recommendation: 'Estos problemas pueden ser comunes en esta zona. Considera si estás dispuesto a asumirlos.',
    });
  }
  
  if (risks.length > 0) {
    return {
      propertyId,
      risks,
      overallSeverity: calculateOverallSeverity(risks),
      explanation: generateRiskExplanation(risks, negativeSignals, priceHistory, visitFeedback),
      recommendedActions: generateRecommendedActions(risks),
    };
  }
  
  return null;
}
```

**Narrativa para el usuario**:
```
⚠️ Riesgo Oculto Detectado

Esta propiedad tiene factores de riesgo que no son obvios a primera vista:

**Riesgos detectados:**

1. **Señales negativas confirmadas** (Alta severidad)
   - 3 usuarios reportaron "humidity" (posible humedad)
   - 2 usuarios reportaron "noise" (zona ruidosa)
   - 1 usuario reportó "misleading_photos" (fotos engañosas)
   - Estas señales están confirmadas (múltiples reportes)

2. **Patrón de precio declinante** (Media severidad)
   - El precio ha bajado 3 veces en los últimos 6 meses:
     * Inicial: $220,000
     * Primera reducción: $210,000 (-4.5%)
     * Segunda reducción: $200,000 (-4.8%)
     * Actual: $195,000 (-2.5%)
   - Patrón: Reducciones consistentes sin razón aparente
   - Posible causa: Problema estructural o legal no mencionado

3. **Feedback negativo de visitas** (Alta severidad)
   - 40% de las visitas reportaron problemas
   - Problemas más reportados:
     * Humedad en paredes (3 reportes)
     * Ruido excesivo (2 reportes)
     * Condición peor que fotos (2 reportes)

4. **Múltiples listados** (Media severidad)
   - Esta propiedad ha estado listada 2 veces anteriormente
   - Ambas veces se retiró del mercado sin venta
   - Posible causa: Problemas que hacen que compradores se retiren

**Qué significa:**
Estos riesgos sugieren que hay problemas reales con la propiedad que no están siendo mencionados explícitamente. El patrón de precio bajando + señales negativas + múltiples listados = bandera roja.

**Recomendación:**
1. **Antes de hacer oferta:**
   - Solicita una inspección profesional (especialmente para humedad)
   - Visita la propiedad en diferentes horarios (para verificar ruido)
   - Pregunta explícitamente sobre las listas anteriores y por qué no se vendieron

2. **Si decides proceder:**
   - Ofrece 10-15% por debajo del precio actual (para compensar riesgos)
   - Incluye contingencias estrictas (inspección, financiamiento)
   - Considera que puede haber costos ocultos de reparación

3. **Alternativa:**
   - Considera propiedades similares en la zona sin estos patrones de riesgo
   - El ahorro potencial no justifica los riesgos si no estás preparado para lidiar con problemas

**Preguntas clave para el vendedor:**
- ¿Por qué el precio ha bajado 3 veces?
- ¿Por qué la propiedad fue retirada del mercado anteriormente?
- ¿Hay problemas de humedad o estructurales?
- ¿Por qué está vendiendo?

¿Quieres que te muestre propiedades similares sin estos riesgos?
```

---

### 6. 💎 Oportunidad Silenciosa

**Qué detecta**: Propiedades con excelente relación precio/valor que no están recibiendo atención (oportunidades que otros no están viendo).

**Triggers**:
```typescript
// Se dispara cuando:
- Fairness score alto (>75) pero sin actividad (no hay visitas, no hay ofertas)
- Precio está por debajo del AVM low_estimate (subvaluado)
- Días en mercado > 45 pero fairness score alto (oportunidad no descubierta)
- Zona emergente pero propiedad no ha subido de precio aún
- Comparables se vendieron más caros recientemente
- Señales positivas pero poca competencia
- Timing perfecto (mercado estable, vendedor flexible)
```

**Datos que usa**:
- `pricewaze_avm_results` (estimate vs current price)
- `pricewaze_property_signal_state` (actividad, competencia)
- `pricewaze_properties` (days_on_market, price_history)
- `pricewaze_zones` (emerging zones, price trends)
- Comparables vendidos recientemente
- `pricewaze_offers` (competencia = 0 o baja)

**Lógica de detección**:
```sql
-- Función para detectar oportunidades silenciosas
CREATE OR REPLACE FUNCTION pricewaze_detect_silent_opportunity(
  p_property_id UUID
)
RETURNS TABLE (
  is_opportunity BOOLEAN,
  opportunity_score DECIMAL(5,2),
  opportunity_type TEXT, -- 'undervalued' | 'emerging_zone' | 'low_competition' | 'timing'
  evidence JSONB,
  recommendation TEXT
) AS $$
DECLARE
  v_property RECORD;
  v_avm RECORD;
  v_days_on_market INTEGER;
  v_fairness_score DECIMAL(5,2);
  v_has_activity BOOLEAN;
  v_competition_count INTEGER;
  v_zone_emerging BOOLEAN;
  v_price_vs_avm DECIMAL(10,2);
  v_recent_comparables_sold DECIMAL(15,2);
BEGIN
  -- Obtener propiedad
  SELECT p.*, z.name AS zone_name
  INTO v_property
  FROM pricewaze_properties p
  LEFT JOIN pricewaze_zones z ON p.zone_id = z.id
  WHERE p.id = p_property_id;
  
  -- Obtener AVM
  SELECT estimate, low_estimate, high_estimate
  INTO v_avm
  FROM pricewaze_avm_results
  WHERE property_id = p_property_id
    AND (expires_at IS NULL OR expires_at > NOW())
  ORDER BY generated_at DESC
  LIMIT 1;
  
  -- Calcular días en mercado
  v_days_on_market := EXTRACT(DAY FROM (NOW() - v_property.created_at))::INTEGER;
  
  -- Calcular fairness score
  SELECT overall_score
  INTO v_fairness_score
  FROM pricewaze_calculate_offer_fairness_breakdown(p_property_id, v_property.price)
  LIMIT 1;
  
  -- Verificar actividad
  v_has_activity := EXISTS (
    SELECT 1 FROM pricewaze_property_signal_state
    WHERE property_id = p_property_id
      AND signal_type IN ('high_activity', 'many_visits')
      AND strength > 30
  );
  
  -- Contar competencia
  SELECT COUNT(*)
  INTO v_competition_count
  FROM pricewaze_offers
  WHERE property_id = p_property_id
    AND status IN ('pending', 'countered');
  
  -- Verificar si zona está emergiendo
  SELECT is_inflecting
  INTO v_zone_emerging
  FROM pricewaze_detect_zone_inflection((SELECT zone_id FROM pricewaze_properties WHERE id = p_property_id))
  WHERE inflection_type = 'emerging';
  
  -- Calcular precio vs AVM
  IF v_avm.low_estimate IS NOT NULL THEN
    v_price_vs_avm := ((v_property.price - v_avm.low_estimate) / v_avm.low_estimate) * 100;
  ELSE
    v_price_vs_avm := 0;
  END IF;
  
  -- Obtener promedio de comparables vendidos recientemente
  SELECT AVG(price)
  INTO v_recent_comparables_sold
  FROM pricewaze_properties
  WHERE zone_id = v_property.zone_id
    AND status = 'sold'
    AND updated_at > NOW() - INTERVAL '90 days'
    AND property_type = v_property.property_type;
  
  -- Detectar oportunidad
  -- Condición: Buena relación precio/valor + Sin actividad + Sin competencia
  IF v_fairness_score > 75 
     AND NOT v_has_activity
     AND v_competition_count = 0
     AND v_days_on_market > 30 THEN
    
    -- Determinar tipo de oportunidad
    DECLARE
      v_opportunity_type TEXT;
      v_score DECIMAL(5,2);
    BEGIN
      IF v_price_vs_avm < -5 THEN
        v_opportunity_type := 'undervalued';
        v_score := 85 + ABS(v_price_vs_avm);
      ELSIF v_zone_emerging THEN
        v_opportunity_type := 'emerging_zone';
        v_score := 80;
      ELSIF v_days_on_market > 60 AND v_fairness_score > 80 THEN
        v_opportunity_type := 'low_competition';
        v_score := 75 + (v_days_on_market / 10);
      ELSE
        v_opportunity_type := 'timing';
        v_score := 70;
      END IF;
      
      RETURN QUERY SELECT
        TRUE,
        LEAST(100, v_score) AS opportunity_score,
        v_opportunity_type,
        jsonb_build_object(
          'fairness_score', v_fairness_score,
          'days_on_market', v_days_on_market,
          'price_vs_avm_pct', v_price_vs_avm,
          'has_activity', v_has_activity,
          'competition_count', v_competition_count,
          'zone_emerging', v_zone_emerging,
          'recent_comparables_avg', v_recent_comparables_sold
        ) AS evidence,
        CASE v_opportunity_type
          WHEN 'undervalued' THEN 'Esta propiedad está subvaluada. El precio está por debajo del rango justo, pero el fairness score es alto. Oportunidad de compra excelente.'
          WHEN 'emerging_zone' THEN 'Esta propiedad está en una zona emergente. El precio aún no refleja el potencial de la zona. Buena oportunidad de inversión.'
          WHEN 'low_competition' THEN 'Excelente relación precio/valor con poca competencia. La propiedad lleva tiempo en el mercado sin atención, pero el fairness score es alto.'
          ELSE 'Timing perfecto: Buena propiedad, buen precio, sin competencia. Oportunidad de compra.'
        END AS recommendation;
    END;
  ELSE
    RETURN QUERY SELECT FALSE, 0::DECIMAL, NULL::TEXT, '{}'::jsonb, NULL::TEXT;
  END IF;
END;
$$ LANGUAGE plpgsql;
```

**Narrativa para el usuario**:
```
💎 Oportunidad Silenciosa Detectada

Esta propiedad tiene excelente relación precio/valor, pero nadie la está viendo. Aquí está por qué es una oportunidad:

**Por qué es oportunidad:**

1. **Subvaluada** (Score: 92/100)
   - Precio actual: $185,000
   - Rango justo (AVM): $195K - $220K
   - Estás comprando 5% por debajo del mínimo del rango justo
   - Fairness score: 85/100 (excelente)

2. **Sin competencia**
   - Cero ofertas activas
   - Cero visitas recientes
   - La propiedad lleva 55 días en el mercado sin atención
   - Pero el fairness score es alto = otros no la están viendo

3. **Zona emergente**
   - Piantini está en inflexión positiva (precios subiendo)
   - Esta propiedad aún no ha subido de precio
   - Comparables vendidos recientemente: promedio $210K (tú pagarías $185K)

4. **Timing perfecto**
   - Mercado estable (no hay presión inmediata)
   - Vendedor probablemente flexible (55 días sin interés)
   - Puedes negociar con calma

**Qué significa:**
Esta es una propiedad que normalmente sería más cara, pero por alguna razón (marketing pobre, ubicación no obvia, etc.) no está recibiendo atención. Es una oportunidad porque:
- Estás comprando por debajo del valor justo
- No hay competencia
- La zona está subiendo (upside potencial)
- Tienes tiempo para negociar

**Recomendación:**
- **Oferta inicial**: $180,000 (agresiva pero justificada)
- **Oferta objetivo**: $185,000 (balanceada, aún excelente precio)
- **Estrategia**: Negocia con calma. Tienes ventaja porque no hay competencia.

**Potencial upside:**
- Si la zona sube 8% en 12 meses (probable según tendencias), esta propiedad valdrá ~$200K
- Estarías comprando con 7.5% de descuento vs valor futuro estimado

**Riesgo:**
- Bajo. El fairness score es alto, el precio está por debajo del rango justo, y no hay competencia.
- El único riesgo es que el vendedor no esté motivado a vender, pero 55 días sin interés sugiere que sí lo está.

**Acción:**
Esta es una de esas oportunidades que no duran. Si te interesa, actúa pronto. Una vez que otros la descubran, la competencia aumentará.

¿Quieres que genere una oferta optimizada para esta oportunidad?
```

---

### 7. 🤝 Negociación Mal Planteada

**Qué detecta**: Usuario está negociando de manera subóptima (ritmo incorrecto, fricción innecesaria, no aprovecha ventajas, etc.).

**Triggers**:
```typescript
// Se dispara cuando:
- Negociación en curso (offer status = 'pending' o 'countered')
- Ritmo de negociación es incorrecto (muy lento cuando mercado es hot, muy rápido cuando hay tiempo)
- Fricción detectada (NCE detecta friction_level = 'high')
- Concesiones no estratégicas (usuario cede demasiado rápido o no cede cuando debería)
- No aprovecha ventajas (poder de negociación alto pero no lo usa)
- Timing de contraofertas es incorrecto
- Mensajes/estrategia no alineados con contexto
```

**Datos que usa**:
- `pricewaze_negotiation_events` (historial de eventos)
- `pricewaze_negotiation_state_snapshots` (estados de la negociación)
- `pricewaze_negotiation_friction` (fricción detectada)
- `pricewaze_negotiation_rhythm` (ritmo de respuesta)
- `pricewaze_negotiation_coherence` (coherencia de la negociación)
- `pricewaze_offers` (ofertas y contraofertas)
- DIE (wait_risk, market_velocity)
- Market pressure (competencia)

**Lógica de detección**:
```typescript
async function detectNegotiationIssues(
  offerId: string,
  userId: string
): Promise<NegotiationAlert | null> {
  // 1. Obtener estado de la negociación
  const negotiation = await getNegotiationState(offerId);
  const friction = await getNegotiationFriction(offerId);
  const rhythm = await getNegotiationRhythm(offerId);
  const coherence = await getNegotiationCoherence(offerId);
  
  // 2. Obtener contexto del mercado
  const property = await getPropertyFromOffer(offerId);
  const die = await getDIEAnalysis(property.id);
  const competition = await getCompetitionContext(property.id);
  
  // 3. Obtener perfil del usuario
  const userProfile = await getUserDecisionProfile(userId);
  
  // 4. Analizar eventos de negociación
  const events = await getNegotiationEvents(offerId);
  const concessions = analyzeConcessions(events);
  const responseTimes = analyzeResponseTimes(events);
  
  // 5. Detectar problemas
  const issues: NegotiationIssue[] = [];
  
  // Problema 1: Ritmo incorrecto
  if (rhythm.avgResponseTimeHours > 72 && die.summary.waitRisk === 'high') {
    issues.push({
      type: 'slow_rhythm_high_risk',
      severity: 'high',
      message: 'Estás respondiendo muy lento (promedio 72h) en un mercado que se mueve rápido.',
      recommendation: 'Acelera tus respuestas. En un mercado hot, la demora te puede costar la oportunidad.',
    });
  }
  
  if (rhythm.avgResponseTimeHours < 2 && die.summary.waitRisk === 'low') {
    issues.push({
      type: 'fast_rhythm_low_risk',
      severity: 'medium',
      message: 'Estás respondiendo muy rápido cuando no hay presión. Esto reduce tu poder de negociación.',
      recommendation: 'Tómate más tiempo. En un mercado estable, la paciencia es una ventaja.',
    });
  }
  
  // Problema 2: Fricción alta
  if (friction.frictionLevel === 'high') {
    issues.push({
      type: 'high_friction',
      severity: 'high',
      message: `Fricción alta detectada. Dominante: ${friction.dominantFriction}.`,
      recommendation: generateFrictionResolution(friction),
    });
  }
  
  // Problema 3: Concesiones no estratégicas
  if (concessions.pattern === 'too_fast' && negotiation.alignmentState === 'deteriorating') {
    issues.push({
      type: 'conceding_too_fast',
      severity: 'high',
      message: 'Estás cediendo demasiado rápido. El vendedor puede pensar que tienes más margen.',
      recommendation: 'Mantén tu posición. Si el vendedor está presionando, es porque necesita vender.',
    });
  }
  
  if (concessions.pattern === 'too_slow' && competition.activeOffers > 0) {
    issues.push({
      type: 'not_conceding_with_competition',
      severity: 'high',
      message: `Hay ${competition.activeOffers} ofertas activas. Si no cedes algo, puedes perder la propiedad.`,
      recommendation: 'Considera una concesión estratégica (pequeña) para mantenerte competitivo.',
    });
  }
  
  // Problema 4: No aprovecha ventajas
  const negotiationPower = await getNegotiationPower(property.id, userId);
  if (negotiationPower.score > 70 && concessions.userConcessions > concessions.sellerConcessions) {
    issues.push({
      type: 'not_using_advantage',
      severity: 'medium',
      message: 'Tienes poder de negociación alto, pero estás cediendo más que el vendedor.',
      recommendation: 'Invierte la dinámica. Con tu poder, deberías estar recibiendo más concesiones.',
    });
  }
  
  // Problema 5: Coherencia baja
  if (coherence.coherenceScore < 60) {
    issues.push({
      type: 'low_coherence',
      severity: 'medium',
      message: 'La negociación está perdiendo coherencia. Las ofertas no están alineadas con el contexto.',
      recommendation: 'Reevalúa tu estrategia. Asegúrate de que tus ofertas reflejen el contexto del mercado.',
    });
  }
  
  if (issues.length > 0) {
    return {
      offerId,
      issues,
      currentState: {
        alignment: negotiation.alignmentState,
        rhythm: rhythm.avgResponseTimeHours,
        friction: friction.frictionLevel,
        coherence: coherence.coherenceScore,
      },
      recommendedStrategy: generateNegotiationStrategy(property.id, userId, issues, die, competition),
      explanation: generateNegotiationExplanation(issues, negotiation, friction, rhythm, die),
    };
  }
  
  return null;
}
```

**Narrativa para el usuario**:
```
🤝 Negociación Mal Planteada Detectada

Tu negociación tiene problemas que están reduciendo tus chances de éxito. Aquí está qué está mal:

**Estado actual de la negociación:**
- Alineación: Deteriorando (empeorando)
- Ritmo: 72 horas promedio de respuesta (muy lento)
- Fricción: Alta (dominante: precio)
- Coherencia: 45/100 (baja)

**Problemas detectados:**

1. **Ritmo demasiado lento en mercado hot** (Alta severidad)
   - Promedio de respuesta: 72 horas
   - Mercado: Acelerando (wait_risk = high)
   - Problema: En un mercado que se mueve rápido, la demora te puede costar la oportunidad
   - **Recomendación**: Responde en < 24 horas. La velocidad es crucial aquí.

2. **Fricción alta en precio** (Alta severidad)
   - El vendedor está presionando en precio
   - Tú estás resistiendo
   - Problema: La fricción alta puede hacer que la negociación se rompa
   - **Recomendación**: Considera una concesión estratégica pequeña ($2K-$3K) para reducir fricción, pero mantén tu posición principal.

3. **Cediendo demasiado rápido** (Alta severidad)
   - Tus concesiones: $8K total
   - Concesiones del vendedor: $2K total
   - Problema: Estás cediendo 4x más que el vendedor, lo que sugiere que tienes más margen
   - **Recomendación**: Mantén tu posición. Si el vendedor está presionando, es porque necesita vender. No cedas más hasta que él ceda.

4. **No aprovechas tu ventaja** (Media severidad)
   - Tu poder de negociación: 78/100 (muy alto)
   - La propiedad lleva 65 días en el mercado
   - Cero competencia
   - Problema: Tienes todas las ventajas, pero no las estás usando
   - **Recomendación**: Usa tu ventaja. El vendedor está en posición débil. Mantén tu oferta y espera su concesión.

**Estrategia recomendada:**

**Próximos pasos:**
1. **Responde rápido** (< 24h) a la próxima contraoferta
2. **Mantén tu posición** en precio. No cedas más hasta que el vendedor ceda significativamente
3. **Ofrece concesión no-monetaria**: "Acepto tu precio si cierras en 20 días en lugar de 30" (esto reduce fricción sin ceder precio)
4. **Si el vendedor no cede**: Considera que esta negociación puede no ser la correcta. Con tu poder de negociación, deberías estar recibiendo más.

**Script sugerido para tu próxima respuesta:**
"Entiendo tu posición en el precio. Sin embargo, basado en comparables recientes y el tiempo en el mercado, mi oferta de $190K refleja el valor justo. Estoy dispuesto a cerrar rápido (20 días) si aceptas esta oferta. ¿Podemos trabajar con esto?"

**Alternativa si la fricción persiste:**
Si el vendedor sigue presionando después de esto, considera retirar tu oferta. Con tu poder de negociación y sin competencia, puedes encontrar mejores oportunidades.

¿Quieres que genere una contraoferta optimizada con esta estrategia?
```

---

## 🏗️ Arquitectura del Radar Cognitivo

### Componentes

1. **Alert Engine** (`src/lib/radar/alert-engine.ts`)
   - Detecta las 7 alertas automáticamente
   - Se ejecuta en background (cron jobs) y en tiempo real (triggers)
   - Usa funciones SQL y TypeScript

2. **Narrative Generator** (`src/lib/radar/narrative-generator.ts`)
   - Convierte datos técnicos en narrativas explicables
   - Usa LLM (DeepSeek) para generar explicaciones humanas
   - Personaliza según perfil del usuario

3. **Alert Delivery** (`src/lib/radar/alert-delivery.ts`)
   - Entrega alertas en el momento correcto
   - No spam: solo alertas relevantes y accionables
   - Integra con UI (notificaciones, badges, modales)

4. **User Twin** (`src/lib/radar/user-twin.ts`)
   - Aprende patrones de decisión del usuario
   - Personaliza alertas según perfil
   - Predice qué alertas son más relevantes para cada usuario

### Flujo de una Alerta

```
1. Evento ocurre (precio cambia, oferta creada, señal detectada, etc.)
   ↓
2. Alert Engine detecta trigger
   ↓
3. Ejecuta función de detección (SQL o TypeScript)
   ↓
4. Si detecta alerta, genera evidencia y datos
   ↓
5. Narrative Generator crea explicación humana
   ↓
6. User Twin personaliza según perfil
   ↓
7. Alert Delivery muestra al usuario (notificación, badge, modal)
   ↓
8. Usuario actúa (o ignora)
   ↓
9. Sistema aprende (feedback loop)
```

### Integración con Sistema Existente

**Reutiliza**:
- ✅ `pricewaze_avm_results` → Para detección de precio emocional, oferta subóptima
- ✅ `pricewaze_property_signal_state` → Para detección de riesgos, oportunidades
- ✅ `pricewaze_decision_risk` → Para timing incorrecto
- ✅ `pricewaze_market_dynamics` → Para zona en inflexión
- ✅ `pricewaze_negotiation_coherence` → Para negociación mal planteada
- ✅ `pricewaze_profiles` (decision_*) → Para personalización

**Nuevo**:
- 🆕 Funciones SQL de detección (emotional_pricing, zone_inflection, silent_opportunity)
- 🆕 Alert Engine (TypeScript)
- 🆕 Narrative Generator (LLM)
- 🆕 Alert Delivery (UI components)
- 🆕 User Twin (machine learning básico)

---

## 📋 Plan de Implementación (Fase 1)

### Semana 1: Infraestructura Base
- [ ] Crear `alert-engine.ts` básico
- [ ] Implementar función SQL `detect_emotional_pricing()`
- [ ] Crear endpoint `/api/radar/alerts` para obtener alertas
- [ ] Crear componente `AlertBadge` para UI

### Semana 2: Primeras 3 Alertas
- [ ] Implementar Alerta #1: Precio Emocional
- [ ] Implementar Alerta #2: Timing Incorrecto
- [ ] Implementar Alerta #3: Zona en Inflexión
- [ ] Crear `narrative-generator.ts` básico

### Semana 3: Últimas 4 Alertas
- [ ] Implementar Alerta #4: Oferta Subóptima
- [ ] Implementar Alerta #5: Riesgo Oculto
- [ ] Implementar Alerta #6: Oportunidad Silenciosa
- [ ] Implementar Alerta #7: Negociación Mal Planteada

### Semana 4: User Twin + Refinamiento
- [ ] Implementar `user-twin.ts` básico (aprendizaje de patrones)
- [ ] Personalizar alertas según perfil
- [ ] Optimizar triggers (no spam)
- [ ] Testing y refinamiento

---

## 🎯 Métricas de Éxito

**Técnicas**:
- Precisión de detección > 85% (alertas correctas vs falsos positivos)
- Tiempo de detección < 5 minutos desde trigger
- Cobertura: 7 alertas funcionando correctamente

**Producto**:
- % de alertas que resultan en acción del usuario
- % de usuarios que encuentran valor en las alertas
- Reducción de decisiones subóptimas (ofertas rechazadas, oportunidades perdidas)

---

## 🚀 Siguiente Paso Inmediato

**Mañana**: Implementar la **Alerta #1 (Precio Emocional)** como proof of concept.

**Archivos a crear**:
1. `supabase/migrations/XXXXXX_detect_emotional_pricing.sql`
2. `src/lib/radar/alert-engine.ts`
3. `src/lib/radar/narrative-generator.ts`
4. `src/app/api/radar/alerts/route.ts`
5. `src/components/radar/AlertBadge.tsx`

**¿Procedo con la implementación de la Alerta #1?**

