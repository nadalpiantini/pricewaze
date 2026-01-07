# ADR-003: CrewAI para Sistema Multi-Agente

## Status
**Accepted** - 2025-01-06

## Context
Para an谩lisis complejos de mercado inmobiliario, un solo prompt de AI no es suficiente. Se necesita:
- An谩lisis desde m煤ltiples perspectivas (mercado, precio, legal, negociaci贸n)
- Workflows donde un an谩lisis alimenta otro
- Especializaci贸n de conocimiento por dominio

## Decision
Implementar sistema multi-agente usando **CrewAI** (Python), desplegado como microservicio separado.

## Consequences

### Positivas
- **Especializaci贸n**: Cada agente es experto en su dominio
- **Composici贸n flexible**: Crews configurables para diferentes casos de uso
- **Mejor calidad**: An谩lisis m谩s profundos que un solo prompt
- **Mantenibilidad**: F谩cil a帽adir/modificar agentes sin afectar otros
- **Framework maduro**: CrewAI bien documentado y activamente mantenido

### Negativas
- **Complejidad**: Stack adicional (Python) junto a Next.js
- **Latencia**: Workflows multi-agente toman 10-30s
- **Costo**: M煤ltiples llamadas a API por an谩lisis
- **Debugging**: M谩s dif铆cil trazar errores en pipelines complejos

### Riesgos
- **Integraci贸n**: Bridge Next.js 鈫 Python puede fallar
- **Mitigaci贸n**: API REST simple, timeouts generosos, fallback a DeepSeek directo

## Agent Architecture

```
CrewAI System
鈹
鈹溾攢鈹 Agents
鈹   鈹溾攢鈹 MarketAnalyst
鈹   鈹   鈹斺攢鈹 Expertise: Zone stats, market trends, comparables
鈹   鈹溾攢鈹 PricingAnalyst
鈹   鈹   鈹斺攢鈹 Expertise: Valuation models, offer tiers
鈹   鈹溾攢鈹 NegotiationAdvisor
鈹   鈹   鈹斺攢鈹 Expertise: Counter-offer strategy, psychology
鈹   鈹斺攢鈹 LegalAdvisor
鈹       鈹斺攢鈹 Expertise: Contract review, compliance
鈹
鈹斺攢鈹 Crews
    鈹溾攢鈹 PricingCrew
    鈹   鈹斺攢鈹 Agents: Market + Pricing
    鈹溾攢鈹 NegotiationCrew
    鈹   鈹斺攢鈹 Agents: Market + Pricing + Negotiation
    鈹溾攢鈹 ContractCrew
    鈹   鈹斺攢鈹 Agents: Legal + Pricing
    鈹斺攢鈹 FullAnalysisCrew
        鈹斺攢鈹 Agents: All 4 agents in sequence
```

## Alternatives Considered

### 1. LangChain Agents
- **Pros**: Ecosistema m谩s grande, m谩s integraciones
- **Cons**: Abstracciones complejas, verbose, overkill para este caso
- **Rejected**: CrewAI es m谩s simple y directo para multi-agent

### 2. AutoGen (Microsoft)
- **Pros**: Conversaciones multi-agente, code execution
- **Cons**: Orientado a code generation, no business analysis
- **Rejected**: No alineado con caso de uso

### 3. Custom Implementation
- **Pros**: Control total, sin dependencias
- **Cons**: Reinventar la rueda, mantenimiento alto
- **Rejected**: CrewAI ya resuelve el problema

### 4. Single-Prompt Chain
- **Pros**: Simple, r谩pido, barato
- **Cons**: Calidad inferior, sin especializaci贸n
- **Rejected**: An谩lisis complejos requieren perspectivas m煤ltiples

## API Bridge Design

```typescript
// src/app/api/crewai/pricing/route.ts
export async function POST(request: Request) {
  const { propertyId } = await request.json();

  const response = await fetch(`${CREWAI_URL}/pricing`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ property_id: propertyId }),
    signal: AbortSignal.timeout(30000), // 30s timeout
  });

  if (!response.ok) {
    // Fallback to direct DeepSeek
    return await fallbackToPricing(propertyId);
  }

  return NextResponse.json(await response.json());
}
```

## Decision Owner
Tech Lead

## Date
2025-01-06
