# 🧠 Consultor Virtual - Especificación Técnica

## Visión

El **Consultor Virtual** es el copiloto inmobiliario de PriceWaze. No es un chatbot genérico, es un **asistente conversacional** que responde preguntas complejas sobre propiedades, precios, negociación y oportunidades usando RAG (Retrieval Augmented Generation) sobre los datos reales de PriceWaze.

**Filosofía**: Más conversación = más decisiones tomadas. El chat es la interfaz principal, no un feature adicional.

---

## 🎯 Las 5 Preguntas "Mágicas"

### 1. "¿Por qué este fairness score es 70?"

**Contexto**: Usuario ve un fairness score y quiere entender el breakdown.

**Pipeline**:
```
Pregunta → LLM identifica intención → 
  → Llama función: get_fairness_breakdown(property_id, offer_amount?)
  → Obtiene: AVM results, comparables, zone stats, market pressure
  → LLM genera explicación humana con datos reales
```

**Función Backend**:
```typescript
async function getFairnessBreakdown(propertyId: string, offerAmount?: number) {
  // 1. Obtener AVM result más reciente
  const avm = await getLatestAVMResult(propertyId);
  
  // 2. Obtener comparables (ya calculados en DB)
  const comparables = await getComparables(propertyId);
  
  // 3. Obtener zone stats
  const zoneStats = await getZoneStats(propertyId);
  
  // 4. Obtener market pressure
  const pressure = await getMarketPressure(propertyId);
  
  // 5. Calcular fairness breakdown (usar función DB existente)
  const breakdown = await calculateFairnessBreakdown(propertyId, offerAmount);
  
  return {
    avm: {
      estimate: avm.estimate,
      low: avm.low_estimate,
      high: avm.high_estimate,
      uncertainty: avm.uncertainty_level,
    },
    comparables: {
      count: comparables.length,
      avgPricePerM2: comparables.avg_price_per_m2,
      medianPricePerM2: comparables.median_price_per_m2,
    },
    zoneStats,
    pressure,
    breakdown: {
      priceFairness: breakdown.price_fairness,
      uncertaintyFairness: breakdown.uncertainty_fairness,
      riskFairness: breakdown.risk_fairness,
      velocityFairness: breakdown.velocity_fairness,
      overallScore: breakdown.overall_score,
    },
  };
}
```

**Prompt para LLM**:
```
Eres un consultor inmobiliario experto. Explica por qué esta propiedad tiene un fairness score de {score}.

DATOS REALES:
- AVM: ${avm.estimate} (rango: ${avm.low} - ${avm.high})
- Comparables: {count} propiedades similares, promedio ${avgPricePerM2}/m²
- Zona: {zoneName}, {propertyCount} propiedades activas
- Presión de mercado: {pressure.level}
- Breakdown:
  * Precio: {priceFairness} ({priceScore}/100)
  * Incertidumbre: {uncertaintyFairness} ({uncertaintyScore}/100)
  * Riesgo: {riskFairness} ({riskScore}/100)
  * Velocidad: {velocityFairness} ({velocityScore}/100)

Explica en lenguaje natural:
1. Por qué el score es {score} (no solo "es bueno/malo")
2. Qué factores lo afectan más
3. Qué significa para el comprador/vendedor
4. Qué debería hacer el usuario

Responde en español, máximo 200 palabras, tono conversacional pero profesional.
```

**Output Esperado**:
```
El fairness score de 70 indica que esta propiedad está en el rango superior de lo justo, pero con algunas señales de precaución.

**Desglose:**
- **Precio (verde, 75/100)**: Está dentro del rango AVM ($180K-$220K), pero en el límite superior. El precio de $210K es razonable pero no es una ganga.

- **Incertidumbre (amarillo, 50/100)**: Solo hay 6 comparables en la zona, lo que reduce la confianza en la estimación. Necesitamos más datos.

- **Riesgo (amarillo, 60/100)**: La propiedad lleva 45 días en el mercado, lo que sugiere que el precio podría estar un poco alto. Hay tiempo para negociar.

- **Velocidad (verde, 70/100)**: El mercado en esta zona está estable, no hay presión inmediata.

**Recomendación**: Si eres comprador, puedes ofrecer $195K-$200K con confianza. Si eres vendedor, considera bajar a $205K para acelerar la venta.
```

---

### 2. "¿Qué barrio se parece a Piantini pero 20% más barato?"

**Contexto**: Usuario busca alternativas inteligentes basadas en características, no solo precio.

**Pipeline**:
```
Pregunta → LLM extrae: zona_referencia, porcentaje_diferencia, criterios →
  → Función: findSimilarZones(referenceZone, priceDiff, criteria)
  → PostGIS + SQL para encontrar zonas similares
  → LLM genera respuesta con explicación + mini-mapa
```

**Función Backend**:
```typescript
async function findSimilarZones(
  referenceZoneId: string,
  priceDiffPercent: number,
  criteria?: {
    propertyType?: string;
    minArea?: number;
    maxArea?: number;
    amenities?: string[];
  }
) {
  // 1. Obtener características de la zona de referencia
  const referenceZone = await getZoneProfile(referenceZoneId);
  
  // 2. Buscar zonas con características similares pero precio diferente
  const similarZones = await supabase.rpc('find_similar_zones', {
    reference_zone_id: referenceZoneId,
    price_diff_percent: priceDiffPercent,
    property_type: criteria?.propertyType,
    min_area: criteria?.minArea,
    max_area: criteria?.maxArea,
  });
  
  // 3. Para cada zona, calcular similitud y diferencia de precio
  const results = await Promise.all(
    similarZones.map(async (zone) => {
      const zoneStats = await getZoneStats(zone.id);
      const similarity = calculateSimilarity(referenceZone, zone);
      
      return {
        zone: {
          id: zone.id,
          name: zone.name,
          location: zone.boundary, // PostGIS geometry
        },
        priceComparison: {
          referenceAvg: referenceZone.avg_price_m2,
          zoneAvg: zoneStats.avgPricePerM2,
          difference: zoneStats.avgPricePerM2 - referenceZone.avg_price_m2,
          differencePercent: ((zoneStats.avgPricePerM2 - referenceZone.avg_price_m2) / referenceZone.avg_price_m2) * 100,
        },
        similarity: {
          score: similarity.score,
          factors: similarity.factors, // ["property_type_match", "amenities_match", "demographics_match"]
        },
        opportunities: {
          activeListings: zoneStats.propertyCount,
          avgDaysOnMarket: zoneStats.avgDaysOnMarket,
        },
      };
    })
  );
  
  return results.sort((a, b) => b.similarity.score - a.similarity.score);
}
```

**SQL Function (PostGIS)**:
```sql
CREATE OR REPLACE FUNCTION find_similar_zones(
  reference_zone_id UUID,
  price_diff_percent DECIMAL,
  property_type TEXT DEFAULT NULL
)
RETURNS TABLE (
  zone_id UUID,
  zone_name TEXT,
  avg_price_m2 DECIMAL,
  similarity_score DECIMAL,
  distance_km DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  WITH reference_zone AS (
    SELECT 
      z.id,
      z.name,
      z.avg_price_m2,
      z.boundary,
      z.property_type_distribution,
      z.amenities_score
    FROM pricewaze_zones z
    WHERE z.id = reference_zone_id
  ),
  candidate_zones AS (
    SELECT 
      z.id,
      z.name,
      z.avg_price_m2,
      z.boundary,
      z.property_type_distribution,
      z.amenities_score,
      ST_Distance(
        (SELECT boundary FROM reference_zone),
        z.boundary
      ) / 1000 AS distance_km
    FROM pricewaze_zones z
    WHERE z.id != reference_zone_id
      AND z.avg_price_m2 <= (
        SELECT avg_price_m2 * (1 - ABS(price_diff_percent) / 100)
        FROM reference_zone
      )
      AND (property_type IS NULL OR z.property_type_distribution ? property_type)
  )
  SELECT 
    cz.id,
    cz.name,
    cz.avg_price_m2,
    -- Calcular similitud basada en:
    -- 1. Distribución de tipos de propiedad (30%)
    -- 2. Amenities score (30%)
    -- 3. Proximidad geográfica (20%)
    -- 4. Diferencia de precio objetivo (20%)
    (
      (CASE WHEN cz.property_type_distribution = (SELECT property_type_distribution FROM reference_zone) 
        THEN 1.0 ELSE 0.5 END) * 0.3 +
      (1.0 - ABS(cz.amenities_score - (SELECT amenities_score FROM reference_zone)) / 100) * 0.3 +
      (1.0 - LEAST(cz.distance_km / 50, 1.0)) * 0.2 +
      (1.0 - ABS(cz.avg_price_m2 - (SELECT avg_price_m2 * (1 - ABS(price_diff_percent) / 100) FROM reference_zone)) / (SELECT avg_price_m2 FROM reference_zone)) * 0.2
    ) AS similarity_score,
    cz.distance_km
  FROM candidate_zones cz
  ORDER BY similarity_score DESC
  LIMIT 10;
END;
$$ LANGUAGE plpgsql;
```

**Prompt para LLM**:
```
El usuario busca zonas similares a {referenceZone} pero {priceDiffPercent}% más baratas.

ZONAS ENCONTRADAS:
{similarZones.map(zone => `
- {zone.name}: ${zone.priceComparison.differencePercent}% más barato
  * Similitud: {zone.similarity.score}/100
  * Precio promedio: ${zone.priceComparison.zoneAvg}/m² vs ${zone.priceComparison.referenceAvg}/m²
  * {zone.opportunities.activeListings} propiedades activas
  * Factores de similitud: {zone.similarity.factors.join(', ')}
`)}

Genera una respuesta que:
1. Explica por qué estas zonas son similares
2. Destaca las diferencias clave (precio, ubicación, oportunidades)
3. Recomienda las top 3 zonas con razones específicas
4. Incluye un resumen para mostrar en un mini-mapa

Responde en español, máximo 250 palabras, tono de consultor inmobiliario.
```

**Output Esperado**:
```
Encontré 5 zonas similares a Piantini pero entre 18-25% más baratas:

**Top 3 Recomendaciones:**

1. **Naco** (22% más barato, similitud 85/100)
   - Precio promedio: $1,850/m² vs $2,380/m² en Piantini
   - Mismo perfil de propiedades (apartamentos modernos, amenities similares)
   - 12 propiedades activas, buen inventario
   - Ubicada a 3km, misma accesibilidad

2. **Evaristo Morales** (20% más barato, similitud 78/100)
   - Precio promedio: $1,900/m²
   - Zona en crecimiento, buena relación precio/valor
   - 8 propiedades activas
   - Ligeramente más lejos del centro (5km)

3. **Gazcue** (25% más barato, similitud 72/100)
   - Precio promedio: $1,785/m²
   - Zona histórica, más auténtica, menos "nueva"
   - 15 propiedades activas, más opciones
   - Excelente para inversión a largo plazo

**Insight**: Naco es tu mejor opción si buscas lo más parecido a Piantini. Evaristo Morales si quieres crecimiento. Gazcue si priorizas precio.

¿Quieres que te muestre propiedades específicas en alguna de estas zonas?
```

---

### 3. "¿Debería hacer esta oferta de $180,000?"

**Contexto**: Usuario está a punto de hacer una oferta y quiere validación inteligente.

**Pipeline**:
```
Pregunta → LLM extrae: property_id, offer_amount →
  → Función: analyzeOfferDecision(propertyId, offerAmount, userId)
  → Integra: DIE + Fairness Panel + Negotiation Power
  → LLM genera recomendación con razones + alternativas
```

**Función Backend**:
```typescript
async function analyzeOfferDecision(
  propertyId: string,
  offerAmount: number,
  userId: string
) {
  // 1. Obtener análisis DIE completo
  const dieAnalysis = await fetch('/api/ai/die', {
    params: { property_id: propertyId },
  });
  
  // 2. Obtener fairness breakdown para esta oferta específica
  const fairnessBreakdown = await getFairnessBreakdown(propertyId, offerAmount);
  
  // 3. Obtener negotiation power
  const negotiationPower = await getNegotiationPower(propertyId, userId);
  
  // 4. Obtener ofertas sugeridas (ya calculadas)
  const suggestedOffers = await getSuggestedOffers(propertyId);
  
  // 5. Obtener contexto de competencia
  const competition = await getCompetitionContext(propertyId);
  
  // 6. Obtener perfil de decisión del usuario (si existe)
  const userProfile = await getUserDecisionProfile(userId);
  
  return {
    offer: {
      amount: offerAmount,
      vsAsking: ((offerAmount / property.price) - 1) * 100,
      vsFairValue: ((offerAmount / fairnessBreakdown.avm.estimate) - 1) * 100,
    },
    die: {
      recommendation: dieAnalysis.summary.recommendation, // "act_now" | "wait" | "negotiate"
      waitRisk: dieAnalysis.summary.waitRisk,
      marketVelocity: dieAnalysis.summary.marketVelocity,
    },
    fairness: {
      label: fairnessBreakdown.breakdown.priceFairness, // "green" | "yellow" | "red"
      score: fairnessBreakdown.breakdown.overallScore,
      explanation: fairnessBreakdown.breakdown.explanation,
    },
    negotiation: {
      power: negotiationPower.score,
      factors: negotiationPower.factors,
    },
    alternatives: {
      aggressive: suggestedOffers.aggressive,
      balanced: suggestedOffers.balanced,
      conservative: suggestedOffers.conservative,
    },
    competition: {
      activeOffers: competition.activeOffers,
      recentVisits: competition.recentVisits,
      signals: competition.signals,
    },
    personalization: userProfile ? {
      urgency: userProfile.urgency,
      riskTolerance: userProfile.riskTolerance,
      objective: userProfile.objective,
    } : null,
  };
}
```

**Prompt para LLM**:
```
Eres un consultor de negociación inmobiliaria. Analiza si el usuario debería hacer esta oferta.

OFERTA PROPUESTA:
- Monto: ${offerAmount}
- vs Precio de lista: {offer.vsAsking}%
- vs Valor justo estimado: {offer.vsFairValue}%

ANÁLISIS DIE:
- Recomendación: {die.recommendation}
- Riesgo de esperar: {die.waitRisk}
- Velocidad de mercado: {die.marketVelocity}

FAIRNESS:
- Label: {fairness.label}
- Score: {fairness.score}/100
- Explicación: {fairness.explanation}

PODER DE NEGOCIACIÓN:
- Score: {negotiation.power}/100
- Factores: {negotiation.factors.map(f => `${f.factor} (${f.impact})`).join(', ')}

COMPETICIÓN:
- Ofertas activas: {competition.activeOffers}
- Visitas recientes (48h): {competition.recentVisits}
- Señales: {competition.signals.join(', ')}

ALTERNATIVAS SUGERIDAS:
- Agresiva: ${alternatives.aggressive}
- Balanceada: ${alternatives.balanced}
- Conservadora: ${alternatives.conservative}

PERFIL DEL USUARIO (si aplica):
- Urgencia: {personalization.urgency}
- Tolerancia al riesgo: {personalization.riskTolerance}
- Objetivo: {personalization.objective}

Genera una recomendación clara:
1. ¿Debería hacer esta oferta? (Sí/No/Con modificaciones)
2. ¿Por qué? (3 razones específicas basadas en datos)
3. ¿Qué riesgo hay? (competencia, timing, precio)
4. ¿Qué alternativa recomiendas? (si la oferta no es óptima)
5. ¿Cuál es el mejor argumento para presentarla? (si es buena)

Responde en español, máximo 300 palabras, tono directo y accionable.
```

**Output Esperado**:
```
**Recomendación: SÍ, pero con una modificación**

**Análisis de tu oferta de $180,000:**

✅ **A favor:**
1. Está 10% por debajo del precio de lista ($200K), lo cual es razonable para iniciar negociación
2. El fairness score es 65/100 (amarillo), lo que significa que está en el límite inferior del rango justo
3. Tu poder de negociación es alto (75/100): la propiedad lleva 60 días en el mercado y hay poca competencia (solo 1 oferta activa)

⚠️ **Precaución:**
- El DIE recomienda "act_now" porque el mercado está acelerando (5 nuevas propiedades en 14 días)
- Hay 3 visitas recientes, lo que sugiere interés creciente
- El valor justo estimado es $185K, tu oferta está 3% por debajo

**Mi recomendación:**
Ofrece **$182,000** en lugar de $180K. Es solo $2K más, pero:
- Te pone en el rango "verde" del fairness (70/100)
- Sigue siendo 9% por debajo del precio de lista
- Reduce el riesgo de rechazo inmediato
- Si el vendedor contraoferta, estarás en mejor posición

**Mejor argumento para presentarla:**
"Basado en comparables recientes en la zona y el tiempo en el mercado, esta oferta refleja el valor justo. Estoy listo para cerrar en 30 días con depósito del 10%."

¿Quieres que genere la carta de oferta con este argumento?
```

---

### 4. "¿Cuál es el mejor argumento para negociar esta propiedad?"

**Contexto**: Usuario necesita estrategia de negociación con datos concretos.

**Pipeline**:
```
Pregunta → LLM identifica: property_id, rol (comprador/vendedor) →
  → Función: generateNegotiationStrategy(propertyId, userId, role, offerAmount?)
  → Integra: Comparables + Market Pressure + Fairness + DIE
  → LLM genera: argumentos + contra-argumentos + script de negociación
```

**Función Backend**:
```typescript
async function generateNegotiationStrategy(
  propertyId: string,
  userId: string,
  role: 'buyer' | 'seller',
  offerAmount?: number
) {
  // 1. Obtener contexto completo de la propiedad
  const property = await getProperty(propertyId);
  const fairness = await getFairnessBreakdown(propertyId, offerAmount);
  const die = await getDIEAnalysis(propertyId);
  const competition = await getCompetitionContext(propertyId);
  
  // 2. Obtener comparables más relevantes
  const comparables = await getTopComparables(propertyId, 5);
  
  // 3. Obtener historial de precios (si existe)
  const priceHistory = await getPriceHistory(propertyId);
  
  // 4. Obtener señales de mercado
  const signals = await getMarketSignals(propertyId);
  
  // 5. Calcular puntos de negociación
  const negotiationPoints = calculateNegotiationPoints({
    fairness,
    die,
    competition,
    comparables,
    priceHistory,
    signals,
    role,
  });
  
  return {
    strategy: {
      primaryArgument: negotiationPoints.primary,
      supportingArguments: negotiationPoints.supporting,
      counterArguments: negotiationPoints.counter, // Qué puede decir el otro lado
      responses: negotiationPoints.responses, // Cómo responder a contra-argumentos
    },
    script: {
      opening: negotiationPoints.opening,
      mainPoints: negotiationPoints.main,
      closing: negotiationPoints.closing,
    },
    data: {
      comparables: comparables.slice(0, 3), // Top 3 para mostrar
      marketContext: {
        daysOnMarket: die.summary.daysOnMarket,
        velocity: die.summary.marketVelocity,
        competition: competition.activeOffers,
      },
      fairnessBreakdown: fairness.breakdown,
    },
  };
}
```

**Prompt para LLM**:
```
Eres un experto en negociación inmobiliaria. Genera una estrategia de negociación para un {role}.

CONTEXTO DE LA PROPIEDAD:
- Precio: ${property.price}
- Días en mercado: {marketContext.daysOnMarket}
- Velocidad: {marketContext.velocity}
- Competencia: {marketContext.competition} ofertas activas

FAIRNESS BREAKDOWN:
- Score: {fairnessBreakdown.overallScore}/100
- Precio: {fairnessBreakdown.priceFairness} ({fairnessBreakdown.priceScore}/100)
- Riesgo: {fairnessBreakdown.riskFairness} ({fairnessBreakdown.riskScore}/100)

COMPARABLES (Top 3):
{comparables.map(c => `
- ${c.address}: ${c.price} (${c.daysOnMarket} días, ${c.status})
`)}

PUNTOS DE NEGOCIACIÓN CALCULADOS:
- Argumento principal: {strategy.primaryArgument}
- Argumentos de apoyo: {strategy.supportingArguments.join(', ')}
- Contra-argumentos esperados: {strategy.counterArguments.join(', ')}

Genera:
1. **Argumento principal** (1-2 oraciones, con datos específicos)
2. **3 argumentos de apoyo** (cada uno con un dato concreto)
3. **Script de negociación**:
   - Apertura (cómo empezar)
   - Puntos principales (qué decir)
   - Cierre (cómo terminar)
4. **Respuestas a contra-argumentos** (qué decir si el otro lado dice X)

Responde en español, tono profesional pero conversacional, máximo 400 palabras.
```

**Output Esperado**:
```
**Estrategia de Negociación - Comprador**

**Argumento Principal:**
"Basado en 5 propiedades comparables recientes en la zona, el precio justo de mercado es $185K, no $200K. Tu propiedad lleva 60 días listada, lo que sugiere que el precio actual no refleja la realidad del mercado."

**3 Argumentos de Apoyo:**

1. **Comparables concretos:**
   - Calle Principal #45: $180K, vendida en 30 días
   - Avenida Central #12: $185K, vendida en 45 días
   - Tu propiedad: $200K, 60 días sin vender
   → Conclusión: Estás 8-11% por encima del mercado

2. **Tiempo en mercado:**
   - Promedio de venta en la zona: 35 días
   - Tu propiedad: 60 días (71% más lento)
   → Conclusión: El precio está desalineado con la demanda

3. **Fairness score:**
   - Score actual: 45/100 (rojo)
   - Rango justo: $180K-$190K
   → Conclusión: Mi oferta de $182K está en el rango justo

**Script de Negociación:**

**Apertura:**
"Gracias por considerar mi oferta. He analizado el mercado de la zona y tengo algunos datos que quiero compartir contigo."

**Puntos Principales:**
1. "En los últimos 90 días, 3 propiedades similares se vendieron entre $180K-$185K en promedio 35 días. Tu propiedad lleva 60 días, lo que sugiere que el precio necesita ajuste."
2. "Mi oferta de $182K está dentro del rango justo según el análisis de comparables (fairness score 70/100)."
3. "Estoy listo para cerrar en 30 días con depósito del 10%. No hay condiciones complicadas."

**Cierre:**
"Entiendo que quieres el mejor precio, pero también quieres vender. Esta oferta refleja el valor real del mercado. ¿Podemos trabajar con esto?"

**Respuestas a Contra-Argumentos:**

**Si dice: "Otros compradores ofrecieron más":**
"Entiendo. ¿Puedes compartir cuántas ofertas activas tienes? Porque según los datos del mercado, hay poca competencia en esta zona en este momento. Mi oferta es seria y estoy lista para cerrar rápido."

**Si dice: "El precio es justo, no bajo":**
"Respeto tu posición. Sin embargo, los datos muestran que propiedades similares se vendieron 8-11% más baratas en los últimos 90 días. El tiempo en mercado también sugiere que el precio necesita ajuste. ¿Podríamos encontrar un punto medio?"

**Si dice: "Necesito pensar":**
"Por supuesto. Mientras tanto, te comparto el análisis completo de comparables para que lo revises. Mi oferta está disponible hasta [fecha + 48h]. ¿Te parece bien?"

---

¿Quieres que genere la carta de oferta formal con estos argumentos?
```

---

### 5. "¿Qué propiedades son oportunidades ahora?"

**Contexto**: Usuario quiere descubrir propiedades con potencial, no solo buscar por filtros.

**Pipeline**:
```
Pregunta → LLM identifica: criterios opcionales (presupuesto, zona, tipo) →
  → Función: discoverOpportunities(userId, criteria?)
  → Integra: Signals + Fairness + Market Dynamics + User Profile
  → LLM genera: lista de oportunidades con explicación de por qué cada una
```

**Función Backend**:
```typescript
async function discoverOpportunities(
  userId: string,
  criteria?: {
    maxBudget?: number;
    minBudget?: number;
    zones?: string[];
    propertyTypes?: string[];
    maxDaysOnMarket?: number;
  }
) {
  // 1. Obtener perfil del usuario
  const userProfile = await getUserDecisionProfile(userId);
  
  // 2. Buscar propiedades con señales de oportunidad
  const opportunities = await supabase.rpc('find_opportunity_properties', {
    user_id: userId,
    max_budget: criteria?.maxBudget,
    min_budget: criteria?.minBudget,
    zone_ids: criteria?.zones,
    property_types: criteria?.propertyTypes,
    max_days_on_market: criteria?.maxDaysOnMarket || 90,
  });
  
  // 3. Para cada oportunidad, calcular "opportunity score"
  const scoredOpportunities = await Promise.all(
    opportunities.map(async (property) => {
      const fairness = await getFairnessBreakdown(property.id);
      const die = await getDIEAnalysis(property.id);
      const signals = await getPropertySignals(property.id);
      const competition = await getCompetitionContext(property.id);
      
      // Calcular opportunity score
      const opportunityScore = calculateOpportunityScore({
        fairness: fairness.breakdown.overallScore,
        daysOnMarket: die.summary.daysOnMarket,
        signals: signals.strength,
        competition: competition.activeOffers,
        priceDeviation: ((property.price - fairness.avm.estimate) / fairness.avm.estimate) * 100,
        marketVelocity: die.summary.marketVelocity,
        userProfile, // Personalizar según perfil
      });
      
      return {
        property,
        opportunityScore,
        reasons: generateOpportunityReasons({
          fairness,
          die,
          signals,
          competition,
          userProfile,
        }),
      };
    })
  );
  
  return scoredOpportunities
    .sort((a, b) => b.opportunityScore - a.opportunityScore)
    .slice(0, 10); // Top 10
}
```

**SQL Function**:
```sql
CREATE OR REPLACE FUNCTION find_opportunity_properties(
  user_id UUID,
  max_budget DECIMAL DEFAULT NULL,
  min_budget DECIMAL DEFAULT NULL,
  zone_ids UUID[] DEFAULT NULL,
  property_types TEXT[] DEFAULT NULL,
  max_days_on_market INTEGER DEFAULT 90
)
RETURNS TABLE (
  property_id UUID,
  title TEXT,
  price DECIMAL,
  address TEXT,
  zone_name TEXT,
  days_on_market INTEGER,
  fairness_score DECIMAL,
  signal_strength DECIMAL,
  opportunity_flags TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  WITH property_metrics AS (
    SELECT 
      p.id,
      p.title,
      p.price,
      p.address,
      z.name AS zone_name,
      EXTRACT(DAY FROM (NOW() - p.created_at))::INTEGER AS days_on_market,
      -- Calcular fairness score básico
      CASE 
        WHEN a.estimate IS NOT NULL THEN
          CASE 
            WHEN p.price BETWEEN a.low_estimate AND a.high_estimate THEN 70
            WHEN p.price < a.low_estimate THEN 80 + (p.price / a.low_estimate - 1) * 20
            ELSE 50 - ((p.price - a.high_estimate) / a.high_estimate) * 30
          END
        ELSE 50
      END AS fairness_score,
      -- Calcular signal strength
      COALESCE(
        (SELECT AVG(strength) 
         FROM pricewaze_property_signal_state 
         WHERE property_id = p.id AND confirmed = true),
        0
      ) AS signal_strength,
      -- Flags de oportunidad
      ARRAY[
        CASE WHEN p.price < COALESCE(a.low_estimate, p.price * 0.9) THEN 'underpriced' END,
        CASE WHEN EXTRACT(DAY FROM (NOW() - p.created_at)) > 60 THEN 'long_market' END,
        CASE WHEN (SELECT COUNT(*) FROM pricewaze_offers WHERE property_id = p.id AND status IN ('pending', 'countered')) = 0 THEN 'no_competition' END,
        CASE WHEN (SELECT COUNT(*) FROM pricewaze_visits WHERE property_id = p.id AND verified_at > NOW() - INTERVAL '48 hours') >= 3 THEN 'high_interest' END
      ] FILTER (WHERE value IS NOT NULL) AS opportunity_flags
    FROM pricewaze_properties p
    LEFT JOIN pricewaze_zones z ON p.zone_id = z.id
    LEFT JOIN LATERAL (
      SELECT estimate, low_estimate, high_estimate
      FROM pricewaze_avm_results
      WHERE property_id = p.id
        AND (expires_at IS NULL OR expires_at > NOW())
      ORDER BY generated_at DESC
      LIMIT 1
    ) a ON true
    WHERE p.status = 'active'
      AND (max_budget IS NULL OR p.price <= max_budget)
      AND (min_budget IS NULL OR p.price >= min_budget)
      AND (zone_ids IS NULL OR p.zone_id = ANY(zone_ids))
      AND (property_types IS NULL OR p.property_type = ANY(property_types))
      AND EXTRACT(DAY FROM (NOW() - p.created_at)) <= max_days_on_market
  )
  SELECT 
    pm.id,
    pm.title,
    pm.price,
    pm.address,
    pm.zone_name,
    pm.days_on_market,
    pm.fairness_score,
    pm.signal_strength,
    pm.opportunity_flags
  FROM property_metrics pm
  WHERE pm.fairness_score >= 60 -- Al menos "bueno"
     OR array_length(pm.opportunity_flags, 1) >= 2 -- Al menos 2 flags
  ORDER BY 
    (pm.fairness_score * 0.4 + pm.signal_strength * 0.3 + (100 - pm.days_on_market) * 0.3) DESC
  LIMIT 20;
END;
$$ LANGUAGE plpgsql;
```

**Prompt para LLM**:
```
Eres un cazador de oportunidades inmobiliarias. Presenta las mejores oportunidades encontradas.

OPORTUNIDADES ENCONTRADAS:
{opportunities.map(opp => `
**{opp.property.title}** (Score: {opp.opportunityScore}/100)
- Precio: ${opp.property.price}
- Zona: {opp.property.zone_name}
- Días en mercado: {opp.reasons.daysOnMarket}
- Fairness: {opp.reasons.fairnessScore}/100
- Señales: {opp.reasons.signals}
- Competencia: {opp.reasons.competition} ofertas activas
- Razones: {opp.reasons.reasons.join(', ')}
`)}

PERFIL DEL USUARIO:
- Objetivo: {userProfile.objective}
- Urgencia: {userProfile.urgency}
- Tolerancia al riesgo: {userProfile.riskTolerance}

Genera una respuesta que:
1. Presenta las top 5 oportunidades (si hay más de 5)
2. Para cada una, explica POR QUÉ es una oportunidad (no solo datos)
3. Destaca qué hace única cada oportunidad
4. Incluye una recomendación de acción para cada una
5. Si hay criterios del usuario, menciona cómo se alinean

Responde en español, máximo 500 palabras, tono entusiasta pero profesional.
```

**Output Esperado**:
```
Encontré 8 oportunidades interesantes. Aquí están las top 5:

**🏆 Top Oportunidad: Apartamento en Naco** (Score: 92/100)
- Precio: $185,000
- Por qué es oportunidad:
  * Está 12% por debajo del valor justo estimado ($210K)
  * Lleva 75 días en el mercado (vendedor probablemente flexible)
  * Cero competencia (ninguna oferta activa)
  * Señales de "high_interest" (5 visitas en 48h) pero sin ofertas = oportunidad
  * Fairness score: 85/100 (excelente)
- Recomendación: Ofrece $180K rápido. El vendedor está desesperado pero hay interés creciente.

**🥈 Segunda: Casa en Piantini** (Score: 88/100)
- Precio: $320,000
- Por qué es oportunidad:
  * Precio justo (fairness 75/100) pero mercado acelerando
  * 2 ofertas activas = competencia moderada, pero aún hay espacio
  * Zona premium con alta demanda = buena inversión
  * Señal "many_visits" confirmada (8 visitas esta semana)
- Recomendación: Si tu presupuesto lo permite, actúa rápido. Ofrece $315K para destacar.

**🥉 Tercera: Apartamento en Gazcue** (Score: 82/100)
- Precio: $95,000
- Por qué es oportunidad:
  * Está 8% por debajo del mercado (fairness 78/100)
  * Zona en crecimiento, buen upside a largo plazo
  * 45 días en mercado = tiempo razonable para negociar
  * Perfecto para tu objetivo de "investment"
- Recomendación: Ofrece $90K. Es una ganga para inversión, especialmente si puedes rentarla.

**4. Casa en Evaristo Morales** (Score: 78/100)
- Precio: $145,000
- Por qué es oportunidad:
  * Precio justo pero mercado estable (no hay presión)
  * 60 días en mercado = vendedor abierto a negociar
  * Zona emergente, buen potencial
- Recomendación: Negocia con calma. Ofrece $140K y espera contraoferta.

**5. Apartamento en Zona Colonial** (Score: 75/100)
- Precio: $125,000
- Por qué es oportunidad:
  * Fairness 70/100 (bueno, no excelente)
  * Pero: Zona histórica, siempre demanda, buena para renta
  * 30 días en mercado = todavía fresco
- Recomendación: Si te gusta la zona, ofrécelo pronto antes de que suba la competencia.

**Insight General:**
El mercado está en un momento interesante: hay propiedades con buen precio pero poca competencia. Las oportunidades #1 y #3 son especialmente buenas para tu perfil de "investment" con "moderate" risk tolerance.

¿Quieres que analice alguna en detalle o que genere ofertas para las que te interesen?
```

---

## 🏗️ Arquitectura Técnica

### Stack Propuesto

**Backend (Next.js API Routes)**:
- **RAG Engine**: LangChain.js o LlamaIndex.js
- **LLM**: DeepSeek (ya integrado) + OpenAI-compatible API
- **Vector Store**: Supabase pgvector (para embeddings de propiedades/comparables)
- **SQL Functions**: PostGIS para búsquedas geográficas inteligentes

**Frontend (React)**:
- **Chat UI**: Componente conversacional tipo ChatGPT
- **Streaming**: Server-Sent Events (SSE) para respuestas en tiempo real
- **Context Management**: Zustand para historial de conversación

### Estructura de Archivos

```
src/
├── app/
│   └── api/
│       └── copilot/
│           ├── chat/route.ts          # Endpoint principal del chat
│           ├── explain/route.ts      # Explicación de fairness scores
│           ├── search/route.ts       # Búsqueda de zonas similares
│           ├── analyze-offer/route.ts # Análisis de ofertas
│           ├── strategy/route.ts     # Estrategia de negociación
│           └── discover/route.ts     # Descubrimiento de oportunidades
├── lib/
│   └── copilot/
│       ├── rag-engine.ts            # RAG sobre datos de PriceWaze
│       ├── question-classifier.ts    # Clasifica tipo de pregunta
│       ├── functions/
│       │   ├── fairness-breakdown.ts
│       │   ├── similar-zones.ts
│       │   ├── offer-analysis.ts
│       │   ├── negotiation-strategy.ts
│       │   └── opportunity-discovery.ts
│       └── prompts/
│           ├── fairness-explanation.ts
│           ├── zone-search.ts
│           ├── offer-advice.ts
│           ├── negotiation-script.ts
│           └── opportunity-presentation.ts
└── components/
    └── copilot/
        ├── ChatInterface.tsx         # UI principal del chat
        ├── MessageBubble.tsx
        ├── StreamingMessage.tsx
        └── FunctionCallIndicator.tsx # Muestra cuando llama funciones
```

### Flujo de una Pregunta

```
1. Usuario escribe pregunta
   ↓
2. POST /api/copilot/chat
   ↓
3. question-classifier.ts identifica intención
   ↓
4. Router llama función específica (fairness-breakdown, similar-zones, etc.)
   ↓
5. Función obtiene datos de DB (Supabase)
   ↓
6. Función prepara contexto para LLM
   ↓
7. LLM genera respuesta usando prompt template + contexto
   ↓
8. Respuesta se streama al frontend (SSE)
   ↓
9. Frontend renderiza mensaje con formato (markdown, links, etc.)
```

### Integración con Sistema Existente

**Reutilizar**:
- ✅ `/api/ai/fairness-panel` → Para explicaciones de fairness
- ✅ `/api/ai/die` → Para análisis de decisiones
- ✅ `/api/ai/pricing` → Para análisis de pricing
- ✅ Funciones SQL existentes (`pricewaze_calculate_offer_fairness`, etc.)
- ✅ CrewAI para análisis complejos (opcional, async)

**Nuevo**:
- 🆕 RAG engine sobre embeddings de propiedades
- 🆕 Question classifier (intención → función)
- 🆕 Streaming responses (SSE)
- 🆕 Chat UI component
- 🆕 SQL functions para búsquedas inteligentes (similar zones, opportunities)

---

## 📋 Plan de Implementación (Fase 1)

### Semana 1: Infraestructura Base
- [ ] Setup RAG engine (LangChain.js o LlamaIndex.js)
- [ ] Crear question classifier
- [ ] Implementar función `getFairnessBreakdown()`
- [ ] Crear endpoint `/api/copilot/chat` básico
- [ ] Crear componente `ChatInterface` básico

### Semana 2: Las 5 Preguntas Mágicas
- [ ] Implementar función `findSimilarZones()`
- [ ] Implementar función `analyzeOfferDecision()`
- [ ] Implementar función `generateNegotiationStrategy()`
- [ ] Implementar función `discoverOpportunities()`
- [ ] Crear SQL functions necesarias

### Semana 3: UI y UX
- [ ] Mejorar `ChatInterface` con streaming
- [ ] Agregar indicadores de "pensando" y "llamando función"
- [ ] Formatear respuestas (markdown, links, números)
- [ ] Agregar botones de acción rápida ("Generar oferta", "Ver propiedad", etc.)

### Semana 4: Testing y Refinamiento
- [ ] Testear las 5 preguntas con datos reales
- [ ] Ajustar prompts basado en respuestas
- [ ] Optimizar performance (caching, async)
- [ ] Documentar para usuarios

---

## 🎯 Métricas de Éxito

**Técnicas**:
- Tiempo de respuesta < 3 segundos (sin CrewAI)
- Precisión de question classifier > 90%
- Cobertura: Las 5 preguntas respondidas correctamente > 95% del tiempo

**Producto**:
- % de usuarios que usan el chat vs filtros tradicionales
- % de preguntas que resultan en acciones (oferta, visita, etc.)
- NPS del Consultor Virtual

---

## 🚀 Siguiente Paso Inmediato

**Mañana**: Implementar la **Pregunta #1** ("¿Por qué este fairness score es X?") como proof of concept.

**Archivos a crear**:
1. `src/lib/copilot/question-classifier.ts`
2. `src/lib/copilot/functions/fairness-breakdown.ts`
3. `src/app/api/copilot/chat/route.ts`
4. `src/components/copilot/ChatInterface.tsx`

**¿Procedo con la implementación de la Pregunta #1?**

