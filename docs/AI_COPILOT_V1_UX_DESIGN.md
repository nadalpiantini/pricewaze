# 🎨 PRICEWAZE — AI COPILOT V1 - Diseño UX

**Versión**: 1.0  
**Fecha**: 2026-01-14  
**Estado**: ✅ Diseño Completo

---

## 🎯 Principios de Diseño

1. **Invisible cuando no es necesario**: El Copilot no interrumpe, guía
2. **Contextual**: Las alertas aparecen donde tienen sentido
3. **Accionable**: Cada alerta tiene una acción clara
4. **Explicable**: Siempre muestra el "por qué", no solo el "qué"

---

## 📱 Componentes Principales

### 1. AlertBadge (Badge de Alerta)

**Ubicación**: En cards de propiedades, páginas de detalle, ofertas

**Estados**:
- 🔴 **High**: Alerta crítica (rojo)
- 🟡 **Medium**: Alerta importante (amarillo)
- 🟢 **Low**: Alerta informativa (verde)

**Props**:
```typescript
interface AlertBadgeProps {
  alertType: 'overprice_emotional' | 'bad_timing' | 'zone_inflection' | 
             'suboptimal_offer' | 'hidden_risk' | 'silent_opportunity' | 
             'bad_negotiation';
  severity: 'low' | 'medium' | 'high';
  message: string;
  onClick?: () => void;
}
```

**Diseño Visual**:
```
┌─────────────────────────────┐
│ 🚨 Oportunidad Silenciosa   │  ← Badge con icono + texto corto
│ Esta propiedad está 12%      │
│ bajo el mercado             │
│ [Ver detalles →]            │
└─────────────────────────────┘
```

**Comportamiento**:
- Click abre modal con detalles completos
- Hover muestra preview de la alerta
- Se puede dismiss (marcar como "vista")

---

### 2. CopilotChat (Interfaz de Chat)

**Ubicación**: Panel lateral o modal flotante

**Estados**:
- **Idle**: Esperando pregunta
- **Thinking**: Procesando (muestra "Pensando...")
- **Streaming**: Mostrando respuesta en tiempo real
- **Function Calling**: Muestra "Consultando datos..." cuando llama funciones

**Diseño Visual**:
```
┌─────────────────────────────────────┐
│  🤖 PriceWaze Copilot               │
│  ───────────────────────────────────│
│                                      │
│  👤 ¿Por qué este fairness score     │
│     es 70?                          │
│                                      │
│  🤖 El fairness score de 70 indica  │
│     que esta propiedad está en el    │
│     rango superior de lo justo...   │
│                                      │
│     **Desglose:**                   │
│     • Precio (verde, 75/100): ...   │
│     • Incertidumbre (amarillo): ... │
│                                      │
│  [Generar oferta] [Ver comparables] │
│                                      │
│  ───────────────────────────────────│
│  💬 Escribe tu pregunta...          │
│  [Enviar]                           │
└─────────────────────────────────────┘
```

**Features**:
- Streaming de respuestas (SSE)
- Botones de acción rápida después de respuestas
- Historial de conversación
- Sugerencias de preguntas

---

### 3. AlertModal (Modal de Alerta Detallada)

**Trigger**: Click en AlertBadge o alerta automática

**Contenido**:
- Título de la alerta
- Explicación completa (narrativa)
- Evidencia (datos, gráficos si aplica)
- Recomendación específica
- Acciones sugeridas

**Diseño Visual**:
```
┌─────────────────────────────────────┐
│  🚨 Oportunidad Silenciosa          │
│  ───────────────────────────────────│
│                                      │
│  Esta propiedad tiene excelente     │
│  relación precio/valor, pero nadie  │
│  la está viendo.                    │
│                                      │
│  **Por qué es oportunidad:**        │
│                                      │
│  1. **Subvaluada** (Score: 92/100)  │
│     • Precio actual: $185,000       │
│     • Rango justo: $195K - $220K   │
│     • Estás comprando 5% por debajo│
│                                      │
│  2. **Sin competencia**              │
│     • Cero ofertas activas          │
│     • Cero visitas recientes        │
│                                      │
│  3. **Zona emergente**              │
│     • Piantini está en inflexión    │
│     • Precios subiendo              │
│                                      │
│  **Recomendación:**                 │
│  Ofrece $180,000 inicialmente.      │
│  Es una oportunidad que no durará.  │
│                                      │
│  [Generar Oferta] [Ver Detalles]    │
│  [Descartar]                        │
└─────────────────────────────────────┘
```

---

### 4. CopilotPanel (Panel Lateral)

**Ubicación**: Sidebar o panel deslizable

**Contenido**:
- Lista de alertas activas
- Historial de conversación
- Acceso rápido al chat

**Diseño Visual**:
```
┌─────────────────────┐
│  🤖 Copilot         │
│  ───────────────────│
│                      │
│  🚨 Alertas (3)     │
│  ───────────────────│
│  • Oportunidad      │
│    silenciosa       │
│  • Timing           │
│    incorrecto       │
│  • Oferta           │
│    subóptima        │
│                      │
│  💬 Chat            │
│  ───────────────────│
│  [Abrir chat]       │
│                      │
│  📊 Historial       │
│  ───────────────────│
│  • ¿Por qué         │
│    fairness 70?     │
│  • ¿Qué barrio...   │
│                      │
└─────────────────────┘
```

---

## 🎬 Flujos de Usuario

### Flujo 1: Usuario Ve Propiedad → Alerta Automática

```
1. Usuario navega a página de propiedad
   ↓
2. Sistema evalúa alertas automáticamente (background)
   ↓
3. Si hay alerta relevante:
   - Muestra AlertBadge en la página
   - Opcional: Notificación push (si alta severidad)
   ↓
4. Usuario hace click en badge
   ↓
5. Se abre AlertModal con detalles
   ↓
6. Usuario puede:
   - Generar oferta optimizada
   - Ver más detalles
   - Descartar alerta
```

### Flujo 2: Usuario Hace Pregunta → Chat Responde

```
1. Usuario abre CopilotChat
   ↓
2. Escribe pregunta: "¿Por qué fairness 70?"
   ↓
3. Sistema muestra "Pensando..."
   ↓
4. Sistema llama funciones:
   - getFairnessBreakdown()
   - getComparables()
   - getZoneStats()
   ↓
5. Sistema muestra "Consultando datos..."
   ↓
6. LLM genera respuesta con datos reales
   ↓
7. Respuesta se streama al usuario
   ↓
8. Sistema muestra botones de acción:
   - "Generar oferta"
   - "Ver comparables"
   - "Ver zona en mapa"
```

### Flujo 3: Usuario Crea Oferta → Alerta de Oferta Subóptima

```
1. Usuario está en página de crear oferta
   ↓
2. Ingresa monto: $180,000
   ↓
3. Sistema evalúa oferta en tiempo real
   ↓
4. Detecta que es subóptima:
   - Poder de negociación alto (78/100)
   - Oferta muy conservadora
   - Podría ofrecer $190K
   ↓
5. Muestra AlertBadge en el formulario
   ↓
6. Usuario hace click
   ↓
7. AlertModal explica:
   - Por qué es subóptima
   - Qué debería ofrecer
   - Cómo maximizar poder
   ↓
8. Usuario puede:
   - Ajustar oferta automáticamente
   - Mantener oferta original
   - Ver análisis completo
```

---

## 📐 Especificaciones Técnicas

### Componentes React

#### AlertBadge.tsx
```typescript
export function AlertBadge({
  alertType,
  severity,
  message,
  onClick,
}: AlertBadgeProps) {
  const colors = {
    high: 'bg-red-50 border-red-200 text-red-800',
    medium: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    low: 'bg-blue-50 border-blue-200 text-blue-800',
  };
  
  const icons = {
    overprice_emotional: '💰',
    bad_timing: '⏰',
    zone_inflection: '📍',
    suboptimal_offer: '💸',
    hidden_risk: '⚠️',
    silent_opportunity: '💎',
    bad_negotiation: '🤝',
  };
  
  return (
    <div
      className={`rounded-lg border p-3 cursor-pointer hover:shadow-md transition ${colors[severity]}`}
      onClick={onClick}
    >
      <div className="flex items-start gap-2">
        <span className="text-xl">{icons[alertType]}</span>
        <div className="flex-1">
          <p className="font-semibold text-sm">{message}</p>
          <p className="text-xs mt-1 opacity-75">Click para ver detalles</p>
        </div>
      </div>
    </div>
  );
}
```

#### CopilotChat.tsx
```typescript
export function CopilotChat({ propertyId, offerId }: CopilotChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  
  const handleSend = async () => {
    // Agregar mensaje del usuario
    setMessages(prev => [...prev, { role: 'user', content: input }]);
    setInput('');
    setIsThinking(true);
    
    // Llamar API
    const response = await fetch('/api/copilot/chat', {
      method: 'POST',
      body: JSON.stringify({
        question: input,
        property_id: propertyId,
        offer_id: offerId,
      }),
    });
    
    setIsThinking(false);
    setIsStreaming(true);
    
    // Stream respuesta
    const reader = response.body?.getReader();
    // ... lógica de streaming
    
    setIsStreaming(false);
  };
  
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <MessageBubble key={i} message={msg} />
        ))}
        {isThinking && <ThinkingIndicator />}
        {isStreaming && <StreamingMessage />}
      </div>
      <div className="border-t p-4">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Escribe tu pregunta..."
          className="w-full px-4 py-2 border rounded-lg"
        />
      </div>
    </div>
  );
}
```

#### AlertModal.tsx
```typescript
export function AlertModal({
  alert,
  onClose,
  onAction,
}: AlertModalProps) {
  return (
    <Dialog open={!!alert} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-2xl">{getAlertIcon(alert.type)}</span>
            {getAlertTitle(alert.type)}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <AlertExplanation alert={alert} />
          <AlertEvidence evidence={alert.evidence} />
          <AlertRecommendation recommendation={alert.recommendation} />
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Descartar
          </Button>
          <Button onClick={() => onAction(alert)}>
            {getActionButtonText(alert.type)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

---

## 🎨 Paleta de Colores

### Alertas
- **High Severity**: `red-50` bg, `red-800` text, `red-200` border
- **Medium Severity**: `yellow-50` bg, `yellow-800` text, `yellow-200` border
- **Low Severity**: `blue-50` bg, `blue-800` text, `blue-200` border

### Chat
- **User Messages**: `bg-blue-50` bg, `text-blue-900`
- **Copilot Messages**: `bg-gray-50` bg, `text-gray-900`
- **Thinking Indicator**: `bg-gray-100` bg, animación de puntos

---

## 📱 Responsive Design

### Mobile (< 768px)
- AlertBadge: Full width, stack vertical
- CopilotChat: Modal fullscreen
- AlertModal: Fullscreen con scroll

### Tablet (768px - 1024px)
- AlertBadge: 50% width en grid
- CopilotChat: Panel lateral (400px)
- AlertModal: Centered, max-width 600px

### Desktop (> 1024px)
- AlertBadge: Inline en cards
- CopilotChat: Panel lateral (500px)
- AlertModal: Centered, max-width 800px

---

## 🔄 Estados y Animaciones

### AlertBadge
- **Hover**: Elevación sutil (shadow-md)
- **Click**: Ripple effect
- **Appear**: Fade in desde arriba

### CopilotChat
- **Thinking**: Puntos animados (3 dots)
- **Streaming**: Typing effect
- **New Message**: Slide in desde abajo

### AlertModal
- **Open**: Fade in + scale up
- **Close**: Fade out + scale down

---

## 🚀 Integración en Páginas Existentes

### Página de Propiedad (`/properties/[id]`)
```tsx
export default function PropertyPage({ params }: { params: { id: string } }) {
  const { alerts } = useCopilotAlerts(params.id);
  
  return (
    <div>
      <PropertyHeader />
      
      {/* Alertas automáticas */}
      {alerts.map(alert => (
        <AlertBadge
          key={alert.id}
          alertType={alert.type}
          severity={alert.severity}
          message={alert.message}
          onClick={() => openAlertModal(alert)}
        />
      ))}
      
      <PropertyDetails />
      
      {/* Botón flotante para abrir chat */}
      <FloatingChatButton propertyId={params.id} />
    </div>
  );
}
```

### Página de Crear Oferta (`/offers/new`)
```tsx
export default function CreateOfferPage() {
  const [offerAmount, setOfferAmount] = useState(0);
  const { alerts } = useCopilotAlerts(null, offerId);
  
  return (
    <div>
      <OfferForm 
        amount={offerAmount}
        onChange={setOfferAmount}
      />
      
      {/* Alerta de oferta subóptima */}
      {alerts
        .filter(a => a.type === 'suboptimal_offer')
        .map(alert => (
          <AlertBadge key={alert.id} {...alert} />
        ))}
    </div>
  );
}
```

---

## 📋 Checklist de Implementación

### Fase 1: Componentes Base
- [ ] AlertBadge component
- [ ] AlertModal component
- [ ] CopilotChat component (básico)
- [ ] CopilotPanel component
- [ ] Hooks: `useCopilotAlerts`, `useCopilotChat`

### Fase 2: Integración
- [ ] Integrar AlertBadge en páginas de propiedad
- [ ] Integrar AlertBadge en formulario de ofertas
- [ ] Integrar CopilotChat en layout principal
- [ ] Crear API routes: `/api/copilot/alerts`, `/api/copilot/chat`

### Fase 3: UX Polishing
- [ ] Animaciones y transiciones
- [ ] Responsive design
- [ ] Accesibilidad (a11y)
- [ ] Testing de flujos

---

## 🎯 Métricas de Éxito UX

- **Tiempo de interacción**: < 2 segundos desde alerta hasta acción
- **Tasa de click**: > 30% de alertas resultan en click
- **Tasa de acción**: > 20% de alertas resultan en acción (oferta, visita, etc.)
- **Satisfacción**: NPS del Copilot > 50

---

**Versión**: 1.0  
**Estado**: ✅ Listo para implementación

