# 📝 Catálogo Completo de Prompts LLM - PriceWaze

**Versión**: 1.0  
**Fecha**: 2026-01-14  
**Estado**: ✅ Catálogo Completo

---

## 🎯 Propósito

Este documento cataloga **todos los prompts LLM** usados en PriceWaze, incluyendo:
- **Ubicación** del código
- **Propósito** del prompt
- **Flujo UX** donde se usa
- **Parámetros** y contexto
- **Output esperado**

---

## 📊 Resumen Ejecutivo

**Total de Prompts**: 8  
**Ubicaciones**:
- `src/lib/ai/` - 3 prompts (pricing, contracts)
- `src/app/api/copilot/` - 2 prompts (chat, negotiate)
- `src/lib/die/` - 1 prompt (explanations)
- `crewai/agents/` - 2 prompts (agent backstories)

---

## 🔍 Prompts Detallados

### 1. **Análisis de Pricing** (`analyzePricing`)

**Ubicación**: `src/lib/ai/pricing.ts` (líneas 72-101)

**Propósito**: Analiza el precio justo de una propiedad comparándola con el mercado de la zona.

**Flujo UX**:
```
Usuario ve propiedad → 
  Tab "Pricing Intel" → 
  FairnessPanelV2 component → 
  Llama /api/ai/fairness-panel → 
  Usa analyzePricing() → 
  Muestra fairness score, insights, riesgos
```

**Trigger**: Cuando el usuario abre la pestaña "Pricing Intel" en una propiedad.

**Prompt Completo**:
```typescript
`You are a real estate pricing analyst for the ${market.ai.marketContext}. Analyze this property and provide pricing intelligence.

PROPERTY DATA:
- Title: ${property.title}
- Address: ${property.address}
- Asking Price: ${formatPrice(property.price, market)}
- Area: ${property.area_m2 ? `${property.area_m2} m²` : 'Not specified'}
- Price per m²: ${pricePerM2 ? `${market.currency.symbol}${pricePerM2.toFixed(2)}/m²` : 'N/A'}
- Type: ${property.property_type}
- Days on Market: ${daysOnMarket}
- Description: ${property.description || 'Not provided'}

ZONE CONTEXT (${zoneContext.name}):
- Active Listings: ${zoneStats.propertyCount}
- Average Price/m²: ${market.currency.symbol}${zoneStats.avgPricePerM2.toFixed(2)}
- Median Price/m²: ${market.currency.symbol}${zoneStats.medianPricePerM2.toFixed(2)}
- Range: ${market.currency.symbol}${zoneStats.minPricePerM2.toFixed(2)} - ${market.currency.symbol}${zoneStats.maxPricePerM2.toFixed(2)}/m²

Provide a JSON response with:
1. fairnessScore (0-100, where 50 is perfectly fair priced)
2. fairnessLabel: "underpriced", "fair", "overpriced", or "significantly_overpriced"
3. estimatedFairValue (your estimate of fair market value in USD)
4. negotiationPowerScore (0-100, higher = more buyer leverage)
5. negotiationFactors (array of factors affecting negotiation position)
6. suggestedOffers: { aggressive, balanced, conservative } (in USD)
7. insights (array of 2-3 key insights about this property)
8. risks (array of 1-2 potential risks for buyers)
9. opportunities (array of 1-2 opportunities for buyers)

Respond ONLY with valid JSON, no markdown or explanation.`
```

**Parámetros**:
- `property`: Datos de la propiedad (title, price, area, type, etc.)
- `zoneContext`: Estadísticas de la zona (avg price, median, range)
- `market`: Configuración del mercado (currency, locale)

**Output Esperado**:
```json
{
  "fairnessScore": 70,
  "fairnessLabel": "fair",
  "estimatedFairValue": 195000,
  "negotiationPowerScore": 65,
  "negotiationFactors": [...],
  "suggestedOffers": {
    "aggressive": 170000,
    "balanced": 185000,
    "conservative": 195000
  },
  "insights": [...],
  "risks": [...],
  "opportunities": [...]
}
```

**Modelo**: DeepSeek Chat  
**Temperature**: 0.3 (bajo, para análisis preciso)  
**Max Tokens**: 1500

---

### 2. **Consejo de Oferta** (`getOfferAdvice`)

**Ubicación**: `src/lib/ai/pricing.ts` (líneas 206-232)

**Propósito**: Analiza una oferta desde la perspectiva del vendedor y recomienda aceptar, contraofertar o rechazar.

**Flujo UX**:
```
Vendedor recibe oferta → 
  Ve notificación → 
  Abre página de oferta → 
  Componente muestra consejo → 
  Llama /api/ai/advice → 
  Usa getOfferAdvice() → 
  Muestra recomendación, confianza, razones
```

**Trigger**: Cuando un vendedor ve una oferta pendiente.

**Prompt Completo**:
```typescript
`You are a real estate negotiation advisor for the ${market.ai.marketContext}. Analyze this offer and provide advice.

CURRENT OFFER:
- Amount: ${formatPrice(offer.amount, market)}
- Message: ${offer.message || 'No message'}
- Status: ${offer.status}

PROPERTY:
- Asking Price: ${formatPrice(property.price, market)}
- Type: ${property.property_type}
- Days on Market: ${daysOnMarket}

NEGOTIATION HISTORY:
${negotiationHistory.length > 0
  ? negotiationHistory.map((h, i) => `Round ${i + 1}: $${h.amount.toLocaleString()} (${h.status})`).join('\n')
  : 'No previous offers'}

As the SELLER, provide a JSON response with:
1. recommendation: "accept", "counter", "reject", or "wait"
2. confidence (0-100)
3. suggestedCounterAmount (if recommending counter, in USD)
4. reasoning (array of 2-3 reasons for your recommendation)
5. marketContext: { daysOnMarket, similarSales (estimate), pricetrend: "rising"|"stable"|"falling" }

Respond ONLY with valid JSON, no markdown or explanation.`
```

**Parámetros**:
- `offer`: Oferta actual (amount, message, status)
- `property`: Datos de la propiedad
- `negotiationHistory`: Historial de ofertas anteriores

**Output Esperado**:
```json
{
  "recommendation": "counter",
  "confidence": 75,
  "suggestedCounterAmount": 195000,
  "reasoning": [
    "Offer is 5% below asking price",
    "Property has been on market for 45 days",
    "Market is stable, no urgency"
  ],
  "marketContext": {
    "daysOnMarket": 45,
    "similarSales": 3,
    "pricetrend": "stable"
  }
}
```

**Modelo**: DeepSeek Chat  
**Temperature**: 0.3  
**Max Tokens**: 800

---

### 3. **Análisis de Zona** (`analyzeZone`)

**Ubicación**: `src/lib/ai/pricing.ts` (líneas 318-343)

**Propósito**: Analiza la salud del mercado de una zona (tendencia, días promedio en mercado, insights).

**Flujo UX**:
```
Usuario explora zona en mapa → 
  Click en zona → 
  Muestra estadísticas de zona → 
  Llama analyzeZone() → 
  Muestra market health, trend, insights
```

**Trigger**: Cuando el usuario explora estadísticas de una zona (actualmente no usado en UI, pero disponible).

**Prompt Completo**:
```typescript
`Analyze this real estate zone in the ${market.ai.marketContext} and provide market insights.

ZONE: ${zoneName}
- Active Listings: ${activeProperties.length}
- Recent Sales (90 days): ${recentSales.length}
- Average Price: ${formatPrice(avgPrice, market)}
- Average Price/m²: ${market.currency.symbol}${avgPricePerM2.toFixed(2)}
- Price Range: ${formatPrice(minPrice, market)} - ${formatPrice(maxPrice, market)}

Property Types:
${Object.entries(propertyTypeDistribution)
  .map(([type, count]) => `- ${type}: ${count}`)
  .join('\n')}

Provide a JSON response with:
1. marketHealthScore (0-100)
2. marketTrend: "hot", "warm", "cool", or "cold"
3. avgDaysOnMarket (estimate based on market conditions)
4. insights (array of 2-3 key insights about this zone)

Respond ONLY with valid JSON, no markdown or explanation.`
```

**Parámetros**:
- `zoneName`: Nombre de la zona
- `properties`: Lista de propiedades en la zona
- `market`: Configuración del mercado

**Output Esperado**:
```json
{
  "marketHealthScore": 75,
  "marketTrend": "warm",
  "avgDaysOnMarket": 35,
  "insights": [
    "Zone has high absorption rate",
    "Prices are stable with slight upward trend",
    "Good mix of property types"
  ]
}
```

**Modelo**: DeepSeek Chat  
**Temperature**: 0.3  
**Max Tokens**: 600

---

### 4. **Generación de Contrato** (`generateContractDraft`)

**Ubicación**: `src/lib/ai/contracts.ts` (líneas 74-97)

**Propósito**: Genera un borrador bilingüe (español/inglés) de contrato de compraventa.

**Flujo UX**:
```
Oferta aceptada → 
  Usuario click "Generate Contract" → 
  Llama /api/ai/contracts → 
  Usa generateContractDraft() → 
  Muestra contrato generado (PDF o texto)
```

**Trigger**: Cuando una oferta es aceptada y el usuario solicita generar contrato.

**Prompt Completo**:
```typescript
`You are a legal document assistant specializing in ${market.ai.marketContext}. Generate a DRAFT purchase agreement (Contrato de Compraventa) based on the following information.

IMPORTANT: This is a NON-BINDING draft for reference only. Include clear language stating this is not a final legal document.

TRANSACTION DETAILS:
- Buyer: ${input.buyer.full_name}
- Seller: ${input.seller.full_name}
- Property: ${input.property.title}
- Address: ${input.property.address}
- Property Type: ${input.property.property_type}
- Area: ${input.property.area_m2 ? `${input.property.area_m2} m²` : 'To be verified'}
- Agreed Price: ${formatPrice(input.agreedPrice, market)}
- Notes from negotiation: ${input.offerMessage || 'None'}

Generate a bilingual (Spanish/English) draft contract that includes:
1. Identification of parties (with placeholders for ID numbers)
2. Property description (with placeholder for registry number)
3. Agreed price and payment terms (standard 10% deposit, balance at closing)
4. Standard conditions (clear title, no liens, property inspection)
5. Closing timeline (suggest 30-45 days)
6. Signatures section

Write the contract in formal legal Spanish with English translations for key sections.
Format it professionally with proper headings and numbered clauses.`
```

**Parámetros**:
- `input.buyer`: Datos del comprador
- `input.seller`: Datos del vendedor
- `input.property`: Datos de la propiedad
- `input.agreedPrice`: Precio acordado
- `input.offerMessage`: Mensaje de la oferta (opcional)

**Output Esperado**: Texto del contrato en español/inglés (no JSON).

**Modelo**: DeepSeek Chat  
**Temperature**: 0.2 (muy bajo, para documentos legales)  
**Max Tokens**: 3000

---

### 5. **Carta de Oferta** (`generateOfferLetter`)

**Ubicación**: `src/lib/ai/contracts.ts` (líneas 303-318)

**Propósito**: Genera una carta profesional de oferta en español.

**Flujo UX**:
```
Usuario crea oferta → 
  Opción "Generate Offer Letter" → 
  Llama generateOfferLetter() → 
  Muestra carta generada → 
  Usuario puede copiar/usar en mensaje
```

**Trigger**: Cuando el usuario quiere generar una carta formal de oferta (opcional).

**Prompt Completo**:
```typescript
`Generate a brief, professional offer letter in Spanish for a real estate offer in ${market.name}.

Buyer: ${buyer.full_name}
Seller: ${seller.full_name}
Property: ${property.title} at ${property.address}
Asking Price: ${formatPrice(property.price, market)}
Offer Amount: ${formatPrice(offerAmount, market)}
Buyer's Message: ${message || 'No additional message'}

Keep it concise (200-300 words), formal but friendly. Include:
1. Introduction and interest in the property
2. The offer amount and why it's reasonable
3. Proposed terms (standard: 10% deposit, 30-day closing)
4. Request for response

Write only the letter content, no headers or JSON.`
```

**Parámetros**:
- `buyer`: Nombre del comprador
- `seller`: Nombre del vendedor
- `property`: Datos de la propiedad
- `offerAmount`: Monto de la oferta
- `message`: Mensaje adicional del comprador (opcional)

**Output Esperado**: Texto de la carta en español (no JSON).

**Modelo**: DeepSeek Chat  
**Temperature**: 0.4 (medio, para balance entre formalidad y naturalidad)  
**Max Tokens**: 500

---

### 6. **Copilot Chat** (Conversacional)

**Ubicación**: `src/app/api/copilot/chat/route.ts` (líneas 88-112)

**Propósito**: Chat conversacional general del Copilot. Responde preguntas del usuario sobre propiedades, ofertas, negociaciones.

**Flujo UX**:
```
Usuario abre CopilotChat → 
  Escribe pregunta: "¿Por qué fairness 70?" → 
  POST /api/copilot/chat → 
  LLM genera respuesta → 
  Muestra respuesta en chat
```

**Trigger**: Cuando el usuario escribe una pregunta en el chat del Copilot.

**Prompt Completo**:
```typescript
// System Prompt
`Eres el Copilot de PriceWaze, un asistente inmobiliario experto. 
Ayudas a usuarios a tomar mejores decisiones sobre propiedades, ofertas y negociaciones.

Siempre:
- Explica el "por qué", no solo el "qué"
- Cita datos reales cuando los tengas
- Sugiere acciones concretas
- Sé conversacional pero profesional
- Responde en español

${propertyContext ? `
Contexto de la propiedad:
- Título: ${propertyContext.title}
- Precio: $${propertyContext.price.toLocaleString()}
- Dirección: ${propertyContext.address}
- Zona: ${propertyContext.zoneName}
- Área: ${propertyContext.area_m2 || 'N/A'} m²
- Tipo: ${propertyContext.property_type}
${propertyContext.insights.fairness_score ? `- Fairness Score: ${propertyContext.insights.fairness_score}/100` : ''}
${propertyContext.insights.overprice_pct ? `- Sobreprecio: ${propertyContext.insights.overprice_pct}%` : ''}
${propertyContext.insights.underprice_pct ? `- Subprecio: ${propertyContext.insights.underprice_pct}%` : ''}
` : ''}`

// User Prompt
question (pregunta del usuario)
```

**Parámetros**:
- `question`: Pregunta del usuario (texto libre)
- `property_id`: ID de propiedad (opcional, para contexto)
- `offer_id`: ID de oferta (opcional, para contexto)

**Output Esperado**: Respuesta en texto natural en español.

**Modelo**: DeepSeek Chat  
**Temperature**: 0.7 (alto, para conversación natural)  
**Max Tokens**: 1000

---

### 7. **Copilot Negotiate** (Análisis de Negociación)

**Ubicación**: `src/app/api/copilot/negotiate/route.ts` (líneas 170-213)

**Propósito**: Analiza una negociación en curso y compara escenarios (aumentar oferta, mantener, esperar).

**Flujo UX**:
```
Usuario tiene oferta activa → 
  Abre CopilotPanel en página de oferta → 
  Click "Analyze Negotiation" → 
  POST /api/copilot/negotiate → 
  Muestra análisis con escenarios
```

**Trigger**: Cuando el usuario solicita análisis de negociación desde el CopilotPanel.

**Prompt Completo**:
```typescript
// System Prompt
`You are PriceWaze Negotiation Copilot for the ${market.ai.marketContext}.

Rules:
- Do NOT make decisions for the user.
- Do NOT invent facts or numbers.
- Only use the provided data.
- Explain negotiation dynamics clearly.
- If data is insufficient, say so explicitly.
- Be neutral and analytical.
- Always compare scenarios, don't recommend a single path.

You MUST return valid JSON only. No markdown. No commentary. No extra text.

JSON schema:
{
  "summary": string,
  "key_factors": string[],
  "risks": string[],
  "scenarios": [
    {
      "option": string,
      "rationale": string,
      "pros": string[],
      "cons": string[]
    }
  ],
  "confidence_level": "low" | "medium" | "high"
}`

// User Prompt
`Analyze the following negotiation context.

Explain the negotiation by comparing these scenarios:
1. Increasing the offer.
2. Keeping the current offer.
3. Waiting without action.

For each scenario:
- Explain rationale.
- List pros and cons.

Base everything strictly on the provided data.

Context:
${JSON.stringify(context, null, 2)}`
```

**Parámetros**:
- `context.property`: Datos de la propiedad
- `context.current_offer`: Oferta actual
- `context.offer_timeline`: Historial de eventos
- `context.signal_snapshot_current`: Estado actual de señales
- `context.market_context`: Contexto de mercado (días en mercado, etc.)

**Output Esperado**:
```json
{
  "summary": "Analysis summary...",
  "key_factors": ["Factor 1", "Factor 2"],
  "risks": ["Risk 1", "Risk 2"],
  "scenarios": [
    {
      "option": "increase_offer",
      "rationale": "...",
      "pros": ["..."],
      "cons": ["..."]
    },
    ...
  ],
  "confidence_level": "medium"
}
```

**Modelo**: DeepSeek Chat  
**Temperature**: 0.2 (bajo, para análisis preciso)  
**Max Tokens**: 2000

---

### 8. **DIE Explanations** (Explicaciones de Decision Intelligence)

**Ubicación**: `src/lib/die/copilot-explanations.ts` (líneas 50-97)

**Propósito**: Explica los outputs del Decision Intelligence Engine (DIE) - incertidumbre, velocidad, timing.

**Flujo UX**:
```
Usuario ve propiedad → 
  Tab "Pricing Intel" → 
  FairnessPanelV2 → 
  Llama /api/ai/die → 
  Usa generateExplanations() → 
  Muestra explicaciones de incertidumbre, velocidad, timing
```

**Trigger**: Cuando se genera análisis DIE para una propiedad.

**Prompt Completo**:
```typescript
`You are a real estate decision advisor for the ${market.ai.marketContext}. 
Your role is to EXPLAIN the outputs of a Decision Intelligence Engine (DIE), NOT to calculate prices.

CONTEXT:
- Property Type: ${context.property.property_type}
- Asking Price: ${market.currency.symbol}${context.property.price.toLocaleString()}

PRICE ASSESSMENT:
- Price Range: ${market.currency.symbol}${context.priceAssessment.priceRange.min.toLocaleString()} - ${market.currency.symbol}${context.priceAssessment.priceRange.max.toLocaleString()}
- Asking Price Status: ${context.priceAssessment.askingPriceStatus}
- Uncertainty Level: ${context.priceAssessment.uncertainty}
- Range Width: ${context.priceAssessment.uncertaintyMetrics.rangeWidthPercent.toFixed(1)}%

MARKET DYNAMICS:
- Velocity: ${context.marketDynamics.velocity}
- Current Regime: ${context.marketDynamics.currentRegime}
- Price Trend: ${context.marketDynamics.timeSeries.priceTrend}
- Inventory Trend: ${context.marketDynamics.timeSeries.inventoryTrend}
${context.marketDynamics.velocityMetrics.changePoints.length > 0
  ? `- Change Points: ${context.marketDynamics.velocityMetrics.changePoints.map(cp => cp.description).join('; ')}`
  : ''}

CURRENT PRESSURE:
- Level: ${context.currentPressure.level}
- Active Offers: ${context.currentPressure.competition.activeOffers}
- Recent Visits: ${context.currentPressure.competition.recentVisits}
- Signals: ${context.currentPressure.signals.competingOffers ? 'Competing offers detected' : ''} ${context.currentPressure.signals.manyVisits ? 'High visit activity' : ''}

${context.waitRisk ? `WAIT RISK:
- Recommendation: ${context.waitRisk.recommendation}
- 7-day risk: ${context.waitRisk.riskByDays.find(r => r.days === 7)?.riskLevel || 'unknown'} (${Math.round((context.waitRisk.riskByDays.find(r => r.days === 7)?.probabilityOfLoss || 0) * 100)}% probability of loss)
- 30-day risk: ${context.waitRisk.riskByDays.find(r => r.days === 30)?.riskLevel || 'unknown'} (${Math.round((context.waitRisk.riskByDays.find(r => r.days === 30)?.probabilityOfLoss || 0) * 100)}% probability of loss)
- Trade-offs: ${context.waitRisk.tradeoffs.discipline} ${context.waitRisk.tradeoffs.probability}` : ''}

Provide a JSON response with:
1. uncertaintyExplanation: Explain why uncertainty is ${context.priceAssessment.uncertainty} (mention range width, sample size, zone variability)
2. velocityExplanation: Explain what ${context.marketDynamics.velocity} velocity means and what it indicates for timing
3. timingExplanation: ${context.waitRisk ? `Explain what waiting vs acting now implies. Reference the wait risk analysis: ${context.waitRisk.recommendation} recommendation, ${context.waitRisk.tradeoffs.discipline} ${context.waitRisk.tradeoffs.probability}` : 'Explain what waiting vs acting now implies given the current pressure and velocity'}
4. decisionContext: Overall decision context (2-3 sentences summarizing key factors${context.waitRisk ? `, including wait risk recommendation: ${context.waitRisk.recommendation}` : ''})

CRITICAL RULES:
- DO NOT recommend specific prices or amounts
- DO NOT calculate valuations
- DO explain what the data means
- DO explain trade-offs and implications
- Use clear, actionable language

Respond ONLY with valid JSON, no markdown or explanation.`
```

**Parámetros**:
- `context.priceAssessment`: Evaluación de precio (rango, incertidumbre)
- `context.marketDynamics`: Dinámicas de mercado (velocidad, régimen)
- `context.currentPressure`: Presión actual (competencia, señales)
- `context.waitRisk`: Análisis de riesgo de esperar (opcional)

**Output Esperado**:
```json
{
  "uncertaintyExplanation": "Uncertainty is medium because...",
  "velocityExplanation": "Market velocity is accelerating, which means...",
  "timingExplanation": "Waiting vs acting now implies...",
  "decisionContext": "Overall context summary..."
}
```

**Modelo**: DeepSeek Chat  
**Temperature**: 0.3  
**Max Tokens**: 800

---

## 🤖 Prompts de CrewAI (Agentes)

### 9. **PricingAnalyst Agent Backstory**

**Ubicación**: `crewai/agents/pricing_analyst.py` (líneas 44-67)

**Propósito**: Define el rol, objetivo y backstory del agente PricingAnalyst en CrewAI.

**Flujo UX**:
```
Usuario solicita análisis avanzado → 
  POST /api/crewai/pricing → 
  CrewAI ejecuta PricingCrew → 
  PricingAnalystAgent analiza → 
  Retorna análisis completo
```

**Backstory Completo**:
```python
role="Real Estate Pricing Analyst",
goal=(
    "Accurately assess property values by analyzing comparable sales, "
    "market conditions, and property characteristics. Identify whether "
    "properties are fairly priced, overpriced, or represent good value "
    f"for buyers in the {market.ai.market_context}."
),
backstory=(
    f"You are a certified real estate appraiser with extensive experience "
    f"in the {market.name} market. You've appraised thousands of "
    "properties across residential, commercial, and investment segments. "
    f"You understand the nuances of {market.ai.price_unit} pricing, the impact of "
    "location and amenities, and how to adjust for property "
    "condition and features. Your valuations are respected by banks, "
    "investors, and individual buyers alike. You always explain your "
    "methodology and confidence level in your assessments."
)
```

**Uso**: Este backstory guía el comportamiento del agente en análisis complejos multi-paso.

---

### 10. **NegotiationAdvisor Agent Backstory**

**Ubicación**: `crewai/agents/negotiation_advisor.py` (líneas 44-67)

**Propósito**: Define el rol del agente NegotiationAdvisor en CrewAI.

**Flujo UX**:
```
Usuario solicita consejo de negociación → 
  POST /api/crewai/negotiation → 
  CrewAI ejecuta NegotiationCrew → 
  NegotiationAdvisorAgent analiza → 
  Retorna estrategia de negociación
```

**Backstory Completo**:
```python
role="Real Estate Negotiation Advisor",
goal=(
    "Develop optimal negotiation strategies for buyers and sellers in "
    f"{market.name} real estate transactions. Provide specific offer "
    "amount recommendations with tiered strategies (aggressive, balanced, "
    "conservative) and guide clients through the negotiation process."
),
backstory=(
    f"You are a master negotiator with 20+ years in {market.name} "
    "real estate. You've successfully closed deals ranging from modest "
    "apartments to multi-million dollar premium properties. You understand "
    "the cultural nuances of negotiating with local sellers and "
    "international investors. You know when to push, when to "
    "wait, and when to walk away. You've seen every negotiation tactic and "
    "know how to counter them. Your clients trust you to get them the best "
    "possible deal while maintaining professional relationships."
)
```

---

### 11. **MarketAnalyst Agent Backstory**

**Ubicación**: `crewai/agents/market_analyst.py` (líneas 39-60)

**Propósito**: Define el rol del agente MarketAnalyst en CrewAI.

**Backstory Completo**:
```python
role="Real Estate Market Analyst",
goal=(
    f"Provide comprehensive market analysis for the {market.ai.market_context}, "
    "including zone statistics, price trends, and competitive positioning data "
    "to support informed investment decisions."
),
backstory=(
    f"You are an experienced real estate market analyst with 15+ years of "
    f"expertise in the {market.name} property market. You have deep "
    f"knowledge of {locations} and surrounding areas. "
    "Your analysis combines statistical rigor with local market insight. "
    "You understand seasonal patterns, various demand segments, "
    "and the impact of economic factors on property values. You always "
    "present data clearly with actionable insights."
)
```

---

### 12. **LegalAdvisor Agent Backstory**

**Ubicación**: `crewai/agents/legal_advisor.py` (líneas 42-67)

**Propósito**: Define el rol del agente LegalAdvisor en CrewAI.

**Backstory Completo**:
```python
role="Real Estate Legal Advisor",
goal=(
    "Generate clear, bilingual (Spanish/English) contract drafts and "
    f"provide legal guidance for {market.name} real estate transactions. "
    "Ensure all parties understand their rights and obligations while "
    "emphasizing that drafts are for reference only and professional "
    "legal counsel is required."
),
backstory=(
    f"You are a legal professional with expertise in {market.name} "
    f"real estate law governed by {market.legal.contract_law}. You've handled "
    "property transfers and advised clients on due diligence processes. "
    "You understand the complexities of ownership structures, the importance "
    f"of clear title, and common pitfalls in {market.name} property transactions. "
    "You always emphasize that your drafts are informational templates "
    f"and recommend consultation with licensed attorneys ({market.legal.disclaimer_en}). "
    "You're fluent in both Spanish and English and ensure all documents "
    "are bilingual for international buyers."
)
```

---

## 📍 Mapa de Flujos UX

### Flujo 1: Usuario Explora Propiedad
```
1. Usuario navega a /properties/[id]
   ↓
2. Ve PropertySignals (señales Waze)
   ↓
3. Click en tab "Pricing Intel"
   ↓
4. FairnessPanelV2 se carga
   ↓
5. Llama /api/ai/fairness-panel
   ↓
6. Usa analyzePricing() → Prompt #1
   ↓
7. Muestra fairness score, insights, riesgos
   ↓
8. Usuario puede hacer click en "¿Por qué?"
   ↓
9. Abre CopilotChat → Prompt #6
```

### Flujo 2: Usuario Crea Oferta
```
1. Usuario en página de propiedad
   ↓
2. Click "Make Offer"
   ↓
3. SubmitOfferModal se abre
   ↓
4. Usuario ingresa monto
   ↓
5. Sistema evalúa alertas automáticamente
   ↓
6. Si hay alerta "suboptimal_offer", muestra AlertBadge
   ↓
7. Usuario puede abrir CopilotChat → Prompt #6
   ↓
8. Pregunta: "¿Debería ofrecer $X?"
   ↓
9. Copilot responde con análisis
```

### Flujo 3: Vendedor Recibe Oferta
```
1. Vendedor recibe notificación de oferta
   ↓
2. Abre página de oferta
   ↓
3. Componente muestra consejo automático
   ↓
4. Llama /api/ai/advice
   ↓
5. Usa getOfferAdvice() → Prompt #2
   ↓
6. Muestra: "Recomendación: Counter con $X"
   ↓
7. Vendedor puede usar CopilotChat → Prompt #6
```

### Flujo 4: Negociación en Curso
```
1. Usuario tiene oferta activa
   ↓
2. Abre página de negociación
   ↓
3. Ve CopilotPanel
   ↓
4. Click "Analyze Negotiation"
   ↓
5. POST /api/copilot/negotiate
   ↓
6. Usa Prompt #7 (Negotiation Analysis)
   ↓
7. Muestra escenarios comparados
   ↓
8. Usuario puede hacer preguntas → Prompt #6
```

### Flujo 5: Oferta Aceptada → Contrato
```
1. Oferta es aceptada
   ↓
2. Usuario ve opción "Generate Contract"
   ↓
3. Click en botón
   ↓
4. POST /api/ai/contracts
   ↓
5. Usa generateContractDraft() → Prompt #4
   ↓
6. Muestra contrato generado
   ↓
7. Usuario puede descargar/editar
```

---

## 🎯 Parámetros Comunes

### Market Context
Todos los prompts usan `market.ai.marketContext` que viene de `src/config/market.ts`:
- **DO (Dominican Republic)**: "Dominican Republic real estate market"
- **US**: "United States real estate market"
- **Global**: "Global real estate market"

### Temperature Guidelines
- **0.2**: Documentos legales, análisis precisos
- **0.3**: Análisis de pricing, explicaciones técnicas
- **0.4**: Cartas formales
- **0.7**: Chat conversacional

### Max Tokens Guidelines
- **500-800**: Respuestas cortas (consejos, explicaciones)
- **1000-1500**: Análisis completos (pricing, negociación)
- **2000-3000**: Documentos largos (contratos)

---

## 🔄 Integración con Sistema

### Dependencias
Todos los prompts dependen de:
- `getMarketConfig()` - Configuración del mercado
- `formatPrice()` - Formateo de precios según mercado
- Datos de Supabase (propiedades, zonas, ofertas)

### Fallbacks
Todos los prompts tienen fallbacks cuando la API falla:
- `analyzePricing()`: Cálculo basado en estadísticas de zona
- `getOfferAdvice()`: Recomendación basada en porcentaje de oferta
- `generateContractDraft()`: Template hardcoded
- `CopilotChat()`: Mensaje de error amigable

---

## 📊 Métricas de Uso

**Tracking**: Todos los prompts se loguean en `pricewaze_ai_logs` con:
- `user_id`: Usuario que hizo la petición
- `context`: Tipo de prompt ('copilot_chat', 'pricing_analysis', etc.)
- `input_text`: Input del usuario
- `output_text`: Respuesta del LLM
- `latency_ms`: Tiempo de respuesta
- `metadata`: Datos adicionales (property_id, offer_id, etc.)

---

## 🚀 Mejoras Futuras Sugeridas

1. **Prompt Templates**: Extraer prompts a archivos separados para fácil edición
2. **A/B Testing**: Probar diferentes versiones de prompts
3. **Prompt Versioning**: Versionar prompts para tracking de cambios
4. **Few-Shot Examples**: Agregar ejemplos en prompts para mejor calidad
5. **Chain-of-Thought**: Para prompts complejos, pedir reasoning paso a paso

---

**Versión**: 1.0  
**Última actualización**: 2026-01-14  
**Mantenido por**: Equipo de desarrollo PriceWaze

