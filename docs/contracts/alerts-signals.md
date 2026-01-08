# Feature Contract: Alerts & Signals

> **Versión**: 1.0
> **Última actualización**: 2026-01-08
> **Criticidad**: 🟡 Media
> **Estado**: Oficial

Este documento define el contrato del sistema de Alerts & Signals.

---

## 1. Propósito del Módulo

El módulo **Alerts & Signals** es responsable de:

> Detectar cambios relevantes del mercado o de una negociación, convertirlos en señales objetivas, y notificar al usuario cuando una acción es oportuna.

**Alerts no opinan. Signals no persuaden. Ambos informan.**

---

## 2. Diferencia Clave

### Signal (Hecho Calculado)

- Hecho calculado por el sistema
- Basado en data real
- Reproducible
- No requiere contexto de usuario

**Ejemplos**:
- "Precio cayó 6% en 14 días"
- "3 ofertas similares aceptadas esta semana"
- "Riesgo de cierre sube a alto"

### Alert (Mensaje)

- Comunicación al usuario
- Basada en una o más signals
- Dependiente de reglas del usuario

**Ejemplos**:
- "Oportunidad: precio bajo detectado"
- "Acción requerida: oferta por vencer"

**Signals = hechos. Alerts = mensajes.**

---

## 3. Ownership

| Capa | Responsable |
|------|-------------|
| UI | `src/components/alerts/*` |
| API | `src/app/api/alerts/*` |
| Dominio | `src/lib/alerts/*` |
| Signals engine | `src/lib/signals/*` |
| Rules | `src/lib/alerts/evaluateRule.ts` |
| Estado | Supabase (`pricewaze_alerts`, `pricewaze_signals`) |
| Copy | AI |

**Regla**: Alerts consumen signals. Signals no dependen de alerts.

---

## 4. Inputs

### Para Signals

| Input | Fuente |
|-------|--------|
| Cambios en properties | Supabase triggers |
| Eventos de offers/negotiations | Event emitters |
| Time-based triggers | Cron jobs |
| Market data | External sources |

### Para Alerts

| Input | Fuente |
|-------|--------|
| Signals generadas | `pricewaze_signals` |
| User alert rules | `pricewaze_alert_rules` |
| Contexto del usuario | Auth + preferences |

### Nunca Recibe

- ❌ Opiniones de UI
- ❌ Texto libre sin validar
- ❌ Decisiones tomadas por AI

---

## 5. Outputs

### Signals (Persistidas)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `signal_type` | Enum | Tipo de señal |
| `entity_id` | UUID | Entidad relacionada |
| `severity` | Enum | low/medium/high |
| `confidence` | Number | 0-1 |
| `timestamp` | DateTime | Cuándo ocurrió |
| `data` | JSON | Metadata adicional |

### Alerts (Persistidas)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `alert_id` | UUID | ID único |
| `user_id` | UUID | Usuario destinatario |
| `rule_id` | UUID | Regla que disparó |
| `signal_ids` | UUID[] | Signals relacionadas |
| `delivery_status` | Enum | pending/sent/read |

**Signals viven más que alerts.**

---

## 6. Side Effects

| Efecto | Responsable |
|--------|-------------|
| Push / Email | Notifications service |
| Copilot context | Copilot module |
| Gamification | Gamification module |
| UI badge | UI layer |

**Alerts no ejecutan acciones, solo informan.**

---

## 7. Decision Boundaries

### ✅ Signals PUEDEN

- Evaluar condiciones
- Comparar históricos
- Emitir hechos
- Calcular severidad

### ❌ Signals NO PUEDEN

- Decidir qué hacer
- Notificar usuarios
- Generar copy
- Depender de preferencias de usuario

### ✅ Alerts PUEDEN

- Evaluar reglas
- Notificar
- Priorizar mensajes
- Agrupar notificaciones

### ❌ Alerts NO PUEDEN

- Crear signals
- Cambiar estados de negocio
- Ejecutar lógica de dominio

---

## 8. AI Contract

### La IA en Alerts PUEDE

| Acción | Ejemplo |
|--------|---------|
| Traducir signals a lenguaje humano | "El precio bajó" → "Oportunidad detectada" |
| Priorizar copy | Elegir mensaje más relevante |
| Adaptar tono | Formal vs casual |

### La IA NO PUEDE

| Acción | Por qué |
|--------|---------|
| Decidir si alertar | Rules engine decide |
| Cambiar severidad | Signal la define |
| Silenciar señales | Usuario controla |

**La IA explica. El sistema decide.**

---

## 9. Jerarquía de Alertas (UX)

| Nivel | Color | Comportamiento |
|-------|-------|----------------|
| Crítica | Rojo suave | 1 a la vez, acción requerida |
| Oportuna | Ámbar | Máx 2/día, ventaja temporal |
| Informativa | Gris | Solo inbox, no push |

### Reglas Anti-Fatiga

- No alertar fuera de horario (excepto crítica)
- Si ignora 2× → baja prioridad
- Agrupación: "3 cambios" vs 3 alertas

---

## 10. Error Model

| Tipo | Ejemplo | Impacto |
|------|---------|---------|
| `USER_ERROR` | Regla inválida | No guardar regla |
| `DOMAIN_ERROR` | Signal incoherente | Log y skip |
| `SYSTEM_ERROR` | Cron / DB | Retry |

**Falla de alerts ≠ falla del sistema core.**

---

## 11. Invariants

1. **Signals son reproducibles**
   - Misma data = misma signal
   - Función pura

2. **Alerts siempre referencian signals**
   - No alerts huérfanas
   - Trazabilidad completa

3. **Ninguna alerta existe sin regla**
   - Usuario configura
   - Sistema ejecuta

4. **Ninguna señal depende de copy**
   - Signal es fact
   - Copy es presentation

5. **El usuario puede auditar por qué recibió una alerta**
   - "¿Por qué veo esto?" siempre disponible

---

## 12. Anti-patterns Prohibidos

| Anti-pattern | Problema |
|--------------|----------|
| Alerts calculando señales | Inversión de dependencia |
| Signals llamando AI | Mezcla de concerns |
| UI disparando alerts directamente | Bypass de rules |
| Alerts sin trazabilidad | Imposible debuggear |

---

## 13. Event-Driven UX Loop

```
Event (hecho)
       ↓
Signal (hecho calculado)
       ↓
Alert (mensaje accionable)
       ↓
User Action (decisión)
       ↓
System Update (estado)
       ↓
Feedback (aprendizaje)
```

### Aprendizaje del Sistema

| Comportamiento | Ajuste |
|----------------|--------|
| Ignora 2× | Baja prioridad |
| Actúa rápido | Sube prioridad similar |
| Silencia | No repetir tipo |
| Éxito repetido | Adelanta timing |

---

## 14. KPIs

| Métrica | Target |
|---------|--------|
| Action rate | > 30% |
| Ignore rate | < 60% |
| Time to action | < 2h para críticas |
| User trust | NPS > 0 para sistema de alertas |

---

## Referencias

- [Data Flow Canónico](../data-flow/canonical.md)
- [Decision Boundaries](../decision-boundaries.md)
- [AI Boundaries](../ai/ai-boundaries.md)
- [Carbon Design System - Notifications](https://carbondesignsystem.com/patterns/notification-pattern/)
