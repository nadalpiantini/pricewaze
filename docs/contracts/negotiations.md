# Feature Contract: Negotiations

> **Versión**: 1.0
> **Última actualización**: 2026-01-08
> **Criticidad**: 🔴 Máxima
> **Estado**: Oficial

Este documento define el contrato del módulo Negotiations. Es ley del sistema.

---

## 1. Propósito del Módulo

El módulo **Negotiations** es responsable de:

> Convertir una secuencia de ofertas y contraofertas en un estado negociado coherente, maximizando probabilidad de cierre, equidad y timing.

**No muestra data. No persuade emocionalmente. Decide estados.**

---

## 2. Ownership

| Capa | Responsable |
|------|-------------|
| UI | `src/components/negotiations/*` |
| API | `src/app/api/negotiations/*` |
| Dominio | `src/lib/negotiation-coherence/*` |
| Decision Intelligence | `src/lib/die/*` |
| Estado | Supabase (`pricewaze_offers`, `pricewaze_negotiations`) |
| Asesoría | `src/lib/ai/*` |

**Una sola verdad**: El dominio vive en `/lib`.

---

## 3. Inputs

### Desde el Sistema

| Input | Fuente | Descripción |
|-------|--------|-------------|
| Offer chain | Supabase | Historial completo de ofertas |
| Negotiation state | Supabase | Estado actual de la negociación |
| Market config | `src/config/market.ts` | País, moneda, reglas |
| Time context | Calculado | Días en mercado, urgencia |

### Desde el Usuario

| Input | Tipo | Validación |
|-------|------|------------|
| Acción | `accept` \| `counter` \| `reject` \| `ask_advice` | Enum |
| Parámetros | Precio, condiciones | Zod schema |
| Rol | `buyer` \| `seller` | Enum |

### Nunca Recibe

- ❌ Cálculos hechos en UI
- ❌ Texto libre sin validar
- ❌ Decisiones pre-hechas por AI

---

## 4. Outputs

### Estados Duros (Persistidos)

| Output | Tipo | Descripción |
|--------|------|-------------|
| `negotiation_state` | Enum | Estado actual de la negociación |
| `fairness_delta` | Number | Cambio en equidad |
| `pressure_score` | Number | Nivel de presión temporal |
| `risk_level` | Enum | Bajo/Medio/Alto |
| `recommended_next_actions` | Array | Acciones sugeridas |

### Outputs Blandos (No Persistidos)

| Output | Uso |
|--------|-----|
| Recomendaciones narrativas | Copilot display |
| Explicaciones de fairness | UI panels |
| Alertas sugeridas | Alerts engine |

---

## 5. Side Effects

El módulo Negotiations **emite eventos, no ejecuta efectos**.

| Evento | Consumido por |
|--------|---------------|
| `NegotiationStateChanged` | Alerts engine |
| `OfferAccepted` | Gamification |
| `CounterOfferCreated` | Notifications |
| `DealClosed` | Contracts module |

**Regla**: Negotiations no otorga puntos, no manda notificaciones, no genera contratos directamente.

---

## 6. Decision Boundaries

### ✅ Negotiations PUEDE

- Calcular coherencia de oferta
- Evaluar fairness
- Estimar presión y riesgo
- Cambiar estado negociado
- Invocar AI para asesoría

### ❌ Negotiations NO PUEDE

- Generar texto final al usuario
- Escribir copy emocional
- Llamar a servicios externos
- Persistir fuera de su dominio
- Ejecutar side effects directamente

---

## 7. AI Contract

> **La IA en Negotiations es: Asesor estratégico, no juez.**

### La IA PUEDE

| Acción | Ejemplo |
|--------|---------|
| Analizar escenarios | "Si esperas 48h, el riesgo sube" |
| Sugerir wording | "Recomiendo responder con..." |
| Explicar consecuencias | "Aceptar ahora significa..." |
| Evaluar timing | "El mercado favorece esperar" |

### La IA NO PUEDE

| Acción | Por qué |
|--------|---------|
| Cambiar estados | Solo el dominio muta estado |
| Decidir aceptar/rechazar | El usuario decide |
| Escribir en base de datos | Solo `/lib` persiste |
| Bypassear validación | Todo pasa por Zod |

**Toda salida de AI es tratada como input no confiable.**

---

## 8. Error Model

| Tipo | Ejemplo | Código HTTP |
|------|---------|-------------|
| `USER_ERROR` | Oferta inválida | 400 |
| `DOMAIN_ERROR` | Incoherencia lógica | 422 |
| `SYSTEM_ERROR` | DB / Infra | 500 |

### Reglas

- Nunca lanzar errores crudos al cliente
- Siempre mapear a respuesta segura
- Siempre log semántico con contexto

### Ejemplo de Manejo

```typescript
try {
  const result = await calculateCoherence(offer);
  return NextResponse.json(result);
} catch (error) {
  if (error instanceof NegotiationError) {
    logger.warn('Negotiation error:', error);
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: 422 }
    );
  }
  logger.error('System error:', error);
  return NextResponse.json(
    { error: 'Internal error' },
    { status: 500 }
  );
}
```

---

## 9. Invariants (Nunca Se Rompen)

1. **El historial de ofertas es inmutable**
   - No se editan ofertas pasadas
   - Solo se agregan nuevas

2. **Toda negociación tiene estado explícito**
   - Nunca `null` o `undefined`
   - Siempre uno de los estados válidos

3. **La fairness score es reproducible**
   - Mismos inputs = misma score
   - Función pura, sin side effects

4. **Ninguna acción ocurre sin contexto de mercado**
   - Market config siempre presente
   - Timezone siempre explícito

5. **Ningún estado cambia sin pasar por `/lib`**
   - API no muta directamente
   - UI no muta directamente

**Si uno se rompe → bug crítico.**

---

## 10. Anti-patterns Prohibidos

| Anti-pattern | Problema |
|--------------|----------|
| Lógica de negociación en UI | No testeable, duplicación |
| "Pequeño cálculo" en API | Fragmenta la lógica |
| AI tomando decisiones | Pierde control del sistema |
| Bypassear lib por "rapidez" | Deuda técnica |
| Mutar historia pasada | Rompe auditoría |
| Estado implícito | Imposible debuggear |

---

## 11. Testing Requirements

### Unit Tests (`/lib/negotiation-coherence/`)

- Todos los cálculos de coherencia
- Todos los cálculos de fairness
- Edge cases de timing
- Validación de inputs

### Integration Tests (`/api/negotiations/`)

- Flujo completo de contraoferta
- Flujo de aceptación
- Flujo de rechazo
- Manejo de errores

### E2E Tests

- Negociación completa buyer → seller
- Multi-round negotiation
- Timeout handling

---

## 12. Monitoreo

### Métricas a Trackear

| Métrica | Alerta si |
|---------|-----------|
| Tiempo de cálculo de coherencia | > 500ms |
| Tasa de errores de dominio | > 5% |
| Negociaciones abandonadas | > 30% |
| AI advisory failures | > 1% |

### Logs Requeridos

```typescript
logger.info('Negotiation state changed', {
  negotiation_id,
  old_state,
  new_state,
  trigger: 'user_action' | 'system' | 'timeout'
});
```

---

## 13. Evolución del Contrato

Para modificar este contrato:

1. Crear ADR explicando el cambio
2. Actualizar tests primero
3. Implementar cambio
4. Actualizar este documento
5. Review de arquitectura

**No se hacen cambios "pequeños" sin documentar.**

---

## Referencias

- [Data Flow Canónico](../data-flow/canonical.md)
- [Decision Boundaries](../decision-boundaries.md)
- [AI Boundaries](../ai/ai-boundaries.md)
- [ADR-003: CrewAI Multi-Agent](../adr/ADR-003-crewai.md)
