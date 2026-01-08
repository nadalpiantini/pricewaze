# 🧠 PRICEWAZE — AI COPILOT V1

**Versión**: 1.0 (Cerrada)  
**Fecha**: 2026-01-14  
**Estado**: ✅ Especificación Final

---

## 🎯 PROPÓSITO REAL

**No responder preguntas.**  
**Guiar decisiones antes de que el usuario se equivoque.**

= **Waze inmobiliario cognitivo**

---

## 🧩 1. CAPACIDADES CLAVE (Lo Mínimo Poderoso)

### A. Conversación Explicable (No Chat Tonto)

**Preguntas en lenguaje natural:**
- "¿Por qué fairness 70?"
- "¿Qué estoy ignorando aquí?"
- "¿Dónde tendría más poder de negociación?"

**Respuestas con razones, no conclusiones mágicas:**
- Siempre explica el "por qué"
- Siempre cita datos reales (comparables, señales, historial)
- Siempre sugiere acción concreta

### B. Alertas Automáticas (Core Diferencial)

**El sistema habla primero.**

No espera que preguntes. Te avisa.

---

## 🚨 LAS 7 ALERTAS DEFINITIVAS

### 1. **Sobreprecio Emocional**
- Precio > mercado + señales de estancamiento
- Detección: Fairness < 40, días en mercado > 60, sin actividad

### 2. **Timing Incorrecto**
- Buen precio, mal momento (mes, ciclo, absorción)
- Detección: Wait risk cambia, mercado acelerando, competencia aumentando

### 3. **Zona en Inflexión**
- Micro-zona empezando a despegar (o enfriándose)
- Detección: Velocity cambia, precio promedio cambia > 5%, absorción cambia

### 4. **Oferta Subóptima**
- Oferta válida pero mal estructurada
- Detección: No aprovecha poder de negociación, fuera de rango sugerido, timing incorrecto

### 5. **Riesgo Oculto**
- Historial, ruido, liquidez, comparables anómalos
- Detección: Señales negativas confirmadas, precio declinante, múltiples listados

### 6. **Oportunidad Silenciosa**
- Propiedad ignorada con upside claro
- Detección: Fairness alto (>75), sin actividad, sin competencia, precio < AVM low

### 7. **Negociación Mal Planteada**
- Buen número, mal argumento
- Detección: Ritmo incorrecto, fricción alta, concesiones no estratégicas

**👉 Esto es el Waze moment.**

---

## 🧠 2. FAIRNESS SCORE → HISTORIA DE PRECIO

### Ya no:
```
Score: 70
```

### Ahora:
```
"Está 15% sobre mercado por amenities infladas.
El vendedor ha bajado 2 veces.
Zona estable pero sin presión de demanda.
Oferta óptima: -12% con cierre rápido."
```

**Siempre narrativa. Siempre defendible.**

---

## 🧬 3. GEMELO DEL USUARIO (User Twin)

El sistema aprende:
- Qué riesgo tolera
- Qué sacrifica
- Cómo decide

**Resultado:**
```
"Para ti sí.
Para otro comprador no."
```

**Datos que aprende:**
- `decision_urgency` (high/medium/low)
- `decision_risk_tolerance` (conservative/moderate/aggressive)
- `decision_objective` (primary_residence/investment/vacation/flip)
- `decision_budget_flexibility` (strict/moderate/flexible)
- Patrones históricos (qué ofertas acepta, qué rechaza, qué busca)

---

## 🧠 4. EXPLORACIÓN CONTRAFÁCTICA (Anti-Filtros)

**No "busca más".**  
**Busca mejor.**

```
"Esto no es lo que pediste,
pero cumple mejor lo que quieres lograr."
```

**Ejemplo:**
- Usuario busca: "3 habitaciones en Piantini"
- Sistema detecta: quiere seguridad, reventa, status
- Sistema muestra: "Esto NO es Piantini, pero cumple mejor lo que realmente buscas"

---

## 🧱 5. ARQUITECTURA FINAL (Simple)

```
User
 ↓
AI Copilot
 ↓
UserTwinAgent      → Aprende perfil del usuario
MarketRadarAgent   → Detecta alertas automáticas
NegotiationAgent   → Guía negociaciones
GeoPatternAgent    → Detecta zonas en inflexión
 ↓
Alertas + Narrativa + Sugerencias
```

**Componentes:**
- **Alert Engine**: Detecta las 7 alertas automáticamente
- **Narrative Generator**: Convierte datos en explicaciones humanas
- **User Twin**: Personaliza según perfil
- **RAG Engine**: Consulta comparables, zonas, historial
- **Question Classifier**: Identifica intención de preguntas

---

## 🧩 6. OPEN SOURCE CLAVE (Solo lo Necesario)

### Core Reasoning
**LangGraph**  
👉 https://github.com/langchain-ai/langgraph
- Flujos explicables
- Estados
- "Piensa antes de hablar"
- Ideal para: Fairness reasoning, Negotiation reasoning, Market reasoning

### RAG / Data + Explicaciones
**LlamaIndex**  
👉 https://github.com/run-llama/llama_index
- Contextos múltiples
- Metadata filtering
- Perfecto para: Comparables, zonas, históricos

### Agentes
**CrewAI** (Ya lo usas)  
👉 https://github.com/joaomdmoura/crewai
- Multi-agent workflows
- Especialización por tarea

**AutoGen** (Opcional)  
👉 https://github.com/microsoft/autogen
- Agentes que se hablan entre sí
- Ideal para: MarketAnalyst ↔ Negotiator ↔ UserProfileAgent

### Geo Inteligencia (Arma Secreta)
**Uber H3**  
👉 https://github.com/uber/h3
- Indexación hexagonal
- Detección de micro-zonas emergentes
- Mucho mejor que barrios administrativos

### Reports Narrativos
**Evidence.dev**  
👉 https://github.com/evidence-dev/evidence
- Convierte SQL → narrativa
- Perfecto para: "Por qué este barrio es oportunidad"

---

## ⚙️ 7. IMPLEMENTACIÓN MVP (Rápida)

### Semana 1: Infraestructura Base
- [ ] Definir 7 alertas (SQL + reglas simples)
- [ ] Crear funciones SQL de detección
- [ ] Narrativas hardcoded (sin LLM aún)
- [ ] Endpoint `/api/copilot/alerts`

### Semana 2: LLM + RAG
- [ ] Integrar LLM para explicación (DeepSeek)
- [ ] RAG con comparables + zonas (LlamaIndex)
- [ ] Question classifier básico
- [ ] Endpoint `/api/copilot/chat`

### Semana 3: User Twin + UI
- [ ] User Twin básico (aprendizaje de patrones)
- [ ] Alertas automáticas UI (badges, modales)
- [ ] Chat interface básico
- [ ] Personalización según perfil

**👉 Ya tienes producto vendible.**

---

## ❌ LO QUE NO HACEMOS (Importante)

- ❌ No dashboards complejos
- ❌ No mil filtros
- ❌ No "AI porque sí"
- ❌ No chat genérico sin contexto

---

## ✅ LO QUE SÍ ES PRICEWAZE

- ✅ **Copiloto**: Guía decisiones en tiempo real
- ✅ **Alerta**: Detecta problemas antes de que ocurran
- ✅ **Guía**: Explica el "por qué", no solo el "qué"
- ✅ **Decisión**: Convierte datos en acciones concretas

---

## 💥 Cierre Honesto

**Esto te pone una generación adelante de Zillow, Realtor, Redfin y clones locales.**

**No compites por data.**  
**Compites por criterio.**

---

## 📋 Archivos de Referencia

- **Especificación Técnica Completa**: `docs/CONSULTOR_VIRTUAL_SPEC.md`
- **7 Alertas Detalladas**: `docs/RADAR_COGNITIVO_ALERTAS.md`
- **Implementación DIE**: `DIE_COMPLETE_IMPLEMENTATION.md`

---

## 🚀 Próximos Pasos

**Opción A: Schema Mínimo + Triggers Exactos**
- Definir tablas necesarias
- Crear triggers para detección automática
- SQL functions para las 7 alertas

**Opción B: UX del Copiloto (Pantallas)**
- Diseño de chat interface
- Diseño de alertas (badges, modales)
- Flujo de usuario completo

**¿Cuál prefieres primero?**

---

**Versión**: 1.0  
**Estado**: ✅ Cerrada y lista para implementación

