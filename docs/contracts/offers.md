# Feature Contract: Offers

> **Versión**: 1.0
> **Última actualización**: 2026-01-08
> **Criticidad**: 🔴 Alta
> **Estado**: Oficial

Este documento define el contrato del módulo Offers. Es ley del sistema.

---

## 1. Propósito del Módulo

El módulo **Offers** es responsable de:

> Gestionar la creación, evolución y validación de ofertas y contraofertas individuales, sin decidir el resultado final de la negociación.

**Offers no negocia. Offers provee insumos a Negotiations.**

---

## 2. Ownership

| Capa | Responsable |
|------|-------------|
| UI | `src/components/offers/*` |
| API | `src/app/api/offers/*` |
| Dominio | `src/lib/offers/*` |
| Fairness | `src/lib/ai/pricing` |
| Negotiation state | `src/lib/negotiation-coherence` |
| Estado | Supabase (`pricewaze_offers`) |

**Regla**: Offers nunca decide estados finales (eso es Negotiations).

---

## 3. Inputs

### Desde UI / Usuario

| Input | Tipo | Validación |
|-------|------|------------|
| Precio propuesto | Number | > 0, dentro de rango |
| Condiciones | Object | Zod schema |
| Property ID | UUID | Existencia verificada |
| Rol | `buyer` \| `seller` | Enum |

### Desde el Sistema

| Input | Fuente |
|-------|--------|
| Property context | Supabase |
| Market config | `src/config/market.ts` |
| User permissions | Auth middleware |

### Nunca Recibe

- ❌ Fairness calculado en UI
- ❌ Estados de negociación ya decididos
- ❌ Texto generado por AI sin validar

---

## 4. Outputs

### Persistidos

| Output | Tabla | Descripción |
|--------|-------|-------------|
| Offer record | `pricewaze_offers` | La oferta creada |
| Offer chain entry | Relación | Vinculo con oferta padre |
| Metadata de timing | Campos | Timestamps, expiration |

### Derivados (No Verdad)

| Output | Uso |
|--------|-----|
| Fairness delta | Informativo |
| Distance to market | Indicador |
| Flags (`aggressive` / `conservative`) | UI hints |

**Estos outputs no cierran nada, solo informan.**

---

## 5. Side Effects

Offers **emite eventos, no ejecuta efectos**.

| Evento | Consumido por |
|--------|---------------|
| `OfferCreated` | Negotiations |
| `CounterOfferCreated` | Negotiations |
| `OfferRejected` | Alerts |
| `OfferAccepted` | Negotiations |

**Regla**: Offers no otorga puntos, no manda notificaciones, no decide cierre.

---

## 6. Decision Boundaries

### ✅ Offers PUEDE

- Validar coherencia básica de oferta
- Persistir ofertas
- Calcular métricas locales (delta, timing)
- Emitir eventos
- Invocar AI para evaluar fairness

### ❌ Offers NO PUEDE

- Cambiar estado de negociación
- Decidir aceptación/rechazo
- Ejecutar lógica de cierre
- Llamar AI para decisiones

---

## 7. AI Contract

### La IA en Offers PUEDE

| Acción | Ejemplo |
|--------|---------|
| Evaluar fairness | "Esta oferta está 8% bajo mercado" |
| Explicar desviaciones | "El precio/m² es menor que..." |
| Sugerir rangos | "Un precio competitivo sería..." |

### La IA NO PUEDE

| Acción | Por qué |
|--------|---------|
| Decidir si oferta es válida | Solo dominio valida |
| Persistir datos | Solo `/lib` persiste |
| Ajustar precios | Usuario decide |

**Fairness = señal, no veredicto.**

---

## 8. Error Model

| Tipo | Ejemplo | Código HTTP |
|------|---------|-------------|
| `USER_ERROR` | Precio inválido | 400 |
| `DOMAIN_ERROR` | Oferta incoherente | 422 |
| `SYSTEM_ERROR` | DB error | 500 |

### Reglas

- Nunca fallar silenciosamente
- Nunca devolver mensajes crípticos
- Siempre log con contexto

---

## 9. Invariants (Nunca Se Rompen)

1. **Las ofertas son inmutables**
   - Una vez creada, no se modifica
   - Cambios = nueva contraoferta

2. **El historial no se reescribe**
   - Offer chain es append-only
   - Auditoría siempre posible

3. **Toda oferta tiene contexto de mercado**
   - Market config presente
   - Property context verificado

4. **Ninguna oferta cierra una negociación por sí sola**
   - Offers informa
   - Negotiations decide

**Si se rompe uno → bug crítico.**

---

## 10. Anti-patterns Prohibidos

| Anti-pattern | Problema |
|--------------|----------|
| "Pequeña lógica" de negociación en Offers | Fragmenta responsabilidad |
| UI ajustando precios post-submit | Bypass de validación |
| API decidiendo aceptación | No es su dominio |
| AI escribiendo ofertas | Pierde control |
| Mutar offer history | Rompe auditoría |

---

## 11. Relación con Negotiations

```
User crea oferta
      ↓
Offers valida y persiste
      ↓
Offers emite OfferCreated
      ↓
Negotiations recibe evento
      ↓
Negotiations actualiza estado
      ↓
Negotiations decide siguiente paso
```

**Offers es proveedor de datos. Negotiations es decisor.**

---

## 12. Testing Requirements

### Unit Tests

- Validación de ofertas
- Cálculo de deltas
- Edge cases de pricing

### Integration Tests

- Flujo de creación
- Flujo de contraoferta
- Manejo de errores

---

## Referencias

- [Data Flow Canónico](../data-flow/canonical.md)
- [Feature Contract: Negotiations](./negotiations.md)
- [Decision Boundaries](../decision-boundaries.md)
