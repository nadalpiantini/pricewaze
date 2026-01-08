# 🧠 PRICEWAZE COPILOT v1 – Definitivo

**UX + Schema + Triggers (en un solo bloque)**

---

## 1️⃣ UX — CÓMO SE VE Y SE USA (sin ruido)

### 🎯 Punto de entrada único

**Botón fijo: Copiloto AI**
(visible en: mapa, propiedad, ofertas)

---

### 🧭 Pantalla 1 — Copiloto (default)

**Layout:**
- Header: "Tu copiloto está activo"
- Cards automáticas (alertas)
- Input chat abajo (opcional)

**Ejemplo de card:**
```
⚠️ Oportunidad silenciosa
Esta propiedad está 11% bajo comparables similares.
Ver por qué →
```

👉 **El sistema habla primero.**

---

### 🏠 Pantalla 2 — Historia de Precio (property view)

Reemplaza el "score frío".

**Bloques:**
- Fairness Score (visual simple)
- Historia explicada (bullets)
- Acción sugerida (CTA)

**Ejemplo:**
```
+15% sobre mercado

Vendedor redujo 2 veces

Demanda estable
👉 Oferta sugerida: -12%
```

---

### 🔍 Pantalla 3 — Exploración inteligente

**Prompt guiado:**
"Muéstrame mejores opciones para mi objetivo"

**Output:**
- 3–5 propiedades
- Cada una con "Por qué te conviene"

---

### 🤝 Pantalla 4 — Negociación asistida

En cada oferta / contraoferta:

- **Semáforo:** Verde / Amarillo / Rojo
- **Texto corto:** "Buen número, mal timing"

---

## 2️⃣ SCHEMA MÍNIMO (Supabase-ready)

### 🧱 Tabla: `pw_user_twin`

```sql
id uuid pk
user_id uuid
risk_tolerance int        -- 0-100
price_sensitivity int     -- 0-100
decision_speed int        -- lento / medio / rápido
updated_at timestamp
```

### 🏠 Tabla: `pw_property_insights`

```sql
id uuid pk
property_id uuid
fairness_score int
overprice_pct numeric
underprice_pct numeric
narrative jsonb          -- explicación estructurada
updated_at timestamp
```

### 🚨 Tabla: `pw_alerts`

```sql
id uuid pk
user_id uuid
property_id uuid
alert_type text          -- 7 tipos
severity text            -- low / med / high
message text
resolved boolean
created_at timestamp
```

### 🤖 Tabla: `pw_ai_logs` (debug & confianza)

```sql
id uuid pk
user_id uuid
context text
input text
output text
latency_ms int
created_at timestamp
```

---

## 3️⃣ LAS 7 ALERTAS (con lógica clara)

| Alerta | Trigger lógico |
|--------|----------------|
| **Sobreprecio emocional** | price > comps + baja absorción |
| **Timing incorrecto** | buen precio + mes/ciclo malo |
| **Zona en inflexión** | H3 ↑ demanda + ↑ visitas |
| **Oferta subóptima** | oferta ≠ patrón ganador |
| **Riesgo oculto** | comparables anómalos |
| **Oportunidad silenciosa** | bajo precio + baja visibilidad |
| **Negociación mal planteada** | buen monto + malas condiciones |

---

## 4️⃣ TRIGGERS (CUÁNDO SE DISPARA)

### ⏱️ Background jobs

- **nightly:** recalcular insights
- **on price change**
- **on new comparable**
- **on oferta / contraoferta**

### 🧠 Evento clave

```typescript
onPropertyViewed(user_id, property_id)
  → evaluateAlerts()
  → pushCopilotCard()
```

---

## 5️⃣ IA — USO MÍNIMO (barato y potente)

**LLM solo para explicar, no calcular**

- **Input:** JSON estructurado
- **Output:** narrativa humana

**Ejemplo prompt:**
```
"Explica esto a un comprador no técnico en 3 bullets"
```

---

## ❌ QUÉ NO SE HACE

- No dashboards complejos
- No prompts largos
- No IA opinando sin data

---

## ✅ QUÉ SÍ ES PRICEWAZE

- Copiloto
- Alerta primero
- Historia clara
- Decisión guiada

---

## 🏁 CIERRE

**Con esto puedes:**
- construir MVP real
- vender demo
- diferenciarte brutalmente

> **No es una app inmobiliaria.**  
> **Es criterio embotellado.**

---

**Si quieres el PRD final v2, feature flags rollout o UX copy exacto, lo hacemos en el próximo paso.**

**Buenísimo hasta aquí. 👊**

