# 🚀 W1 - Onboarding Demo "WOW en 5 minutos"

## Objetivo
Implementar onboarding demo interactivo que permite a usuarios entender el producto en ≤5 minutos sin registro.

## Cambios Implementados

### Nuevos Archivos
- `src/app/demo/map/page.tsx` - Pantalla 1: Mapa Demo
- `src/app/demo/property/[id]/page.tsx` - Pantalla 2: Propiedad Demo
- `src/app/demo/negotiation/[id]/page.tsx` - Pantalla 3: Negociación Demo
- `src/components/demo/DemoMap.tsx` - Componente mapa con 3 propiedades demo
- `src/components/demo/DemoPropertyView.tsx` - Vista de propiedad con señales
- `src/components/demo/DemoNegotiationView.tsx` - Vista de negociación con timeline
- `src/components/demo/DemoCopilot.tsx` - Copiloto con análisis prellenado
- `src/components/demo/DemoCTA.tsx` - CTA final de conversión
- `src/lib/demo.ts` - Helper DEMO_MODE y localStorage
- `src/lib/demo-data.ts` - Fixtures demo (3 propiedades, señales, ofertas, análisis)

### Archivos Modificados
- `src/lib/analytics.ts` - Eventos onboarding agregados
- `src/lib/signals.ts` - Labels para señales del sistema
- `src/components/landing/HeroSection.tsx` - Link al demo agregado

## Funcionalidades

### Flujo Completo
1. **Mapa Demo** (`/demo/map`)
   - 3 propiedades con diferentes estados de señales
   - Pins con colores: 🔴 Alta presión, ⚪ Señal débil, 🔵 Limpia
   - Tooltips informativos
   - CTA flotante

2. **Propiedad Demo** (`/demo/property/[id]`)
   - Señales visibles (🔊 x2, 🥊 x3, 🧭 x7)
   - Botón "Seguir esta propiedad" (localStorage)
   - Tab de negociación con link

3. **Negociación Demo** (`/demo/negotiation/[id]`)
   - Timeline prellenado con 2 ofertas
   - Señales en contexto de ofertas
   - Botón "Analizar negociación"

4. **Copiloto Demo**
   - Análisis prellenado con:
     - Resumen contextual
     - Factores clave
     - Riesgos
     - Opciones razonables (pros/cons)
   - CTA final de conversión

### Tracking de Eventos
- `onboarding_started` - Al cargar mapa
- `onboarding_property_clicked` - Click en propiedad
- `onboarding_follow_clicked` - Click en seguir
- `onboarding_copilot_opened` - Abrir copiloto
- `signup_from_onboarding` - Click en CTA

### Características Técnicas
- ✅ Rutas públicas (sin autenticación)
- ✅ SEO metadata en todas las páginas
- ✅ Manejo de errores robusto
- ✅ Estado en localStorage para "seguir"
- ✅ Analytics logging en dev y prod
- ✅ Build exitoso sin errores

## Métricas de Éxito
- Usuario puede completar flujo en ≤5 minutos
- >40% abre el copiloto → producto ganador
- Tracking completo de funnel de conversión

## Próximos Pasos (W1.2)
- W1.1: Copy exacto (palabras finales del demo)
- W1.2: Data demo perfecta (fixtures realistas) ✅ COMPLETADO
- W2: Paywall Pro (ya con onboarding funcionando)

