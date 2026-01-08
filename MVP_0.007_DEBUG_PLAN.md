# 🧊 MVP 0.007 — DEBUG QUIRÚRGICO

**Estado**: FREEZE — Sin nuevas features hasta cerrar debug  
**Versión**: v0.0.7  
**Rama**: `release/mvp-0.007`  
**Tag**: `v0.0.7`

---

## ✅ ALCANCE CONGELADO (MVP 0.007)

### INCLUYE (cerrado)
- ✅ Mapa con señales (pins + colores)
- ✅ Detalle de propiedad
- ✅ Seguir / dejar de seguir
- ✅ Alertas solo por:
  - Señal confirmada
  - Expiración de oferta
- ✅ Ofertas + contraofertas
- ✅ Timeline con snapshot de señales
- ✅ Copiloto DeepSeek (JSON estructurado)
- ✅ Paywall Pro inline (no checkout)
- ✅ PWA básica + push
- ✅ Demo OFF en prod

### EXCLUYE (congelado)
- ❌ Nuevas señales
- ❌ Chat libre
- ❌ Multi-buyer avanzado
- ❌ Rutas de visitas
- ❌ Exportes PDF
- ❌ Stripe real
- ❌ App nativa

---

## 🧪 PLAN DE DEBUG (48-72h)

### DÍA 1 — BUILD & TYPES + DATA INTEGRITY

#### 1.1 Build & Types
- [ ] `npm run build` (limpio, sin errores)
- [ ] `tsc --noEmit` (cero errores TypeScript)
- [ ] Cero `any` nuevos
- [ ] Cero warnings críticos de ESLint
- [ ] Verificar imports rotos

**Archivos a revisar**:
- `src/app/**/*.tsx`
- `src/components/**/*.tsx`
- `src/lib/**/*.ts`
- `src/types/**/*.ts`

#### 1.2 Data Integrity
- [ ] **RLS Policies**: Verificar `SELECT`, `INSERT`, `DELETE` en:
  - `pricewaze_properties`
  - `pricewaze_offers`
  - `pricewaze_property_follows`
  - `pricewaze_property_signal_state`
  - `pricewaze_alert_events`
- [ ] **Ofertas**: 1 activa por comprador (verificar constraint)
- [ ] **Expiraciones**: Cron corre y marca `expired = true`
- [ ] **Snapshots**: Cada evento guarda señales en timeline

**Verificaciones SQL**:
```sql
-- Verificar ofertas activas duplicadas
SELECT buyer_id, property_id, COUNT(*) 
FROM pricewaze_offers 
WHERE status = 'pending' 
GROUP BY buyer_id, property_id 
HAVING COUNT(*) > 1;

-- Verificar ofertas expiradas no marcadas
SELECT id, expires_at, expired 
FROM pricewaze_offers 
WHERE expires_at < NOW() AND expired = false;
```

---

### DÍA 2 — REALTIME + COPILOTO + PAYWALL

#### 2.1 Realtime
- [ ] **Señales → pin cambia sin reload**
  - Verificar subscription en `PropertyMapWithSignals.tsx`
  - Verificar subscription en `PropertySignals.tsx`
  - Test: Cambiar señal en DB → pin debe actualizar en <2s
- [ ] **Follow → alertas solo si seguido**
  - Verificar `useSignalAlerts.ts` filtra por `followedProperties`
  - Test: Seguir propiedad → recibir alerta
  - Test: Dejar de seguir → no recibir alerta
- [ ] **Un evento = una alerta (no duplicados)**
  - Verificar trigger `signal_confirmed_trigger` no duplica
  - Verificar `useSignalAlerts` no procesa el mismo evento 2 veces

**Archivos clave**:
- `src/components/signals/PropertySignals.tsx`
- `src/components/map/PropertyMapWithSignals.tsx`
- `src/hooks/useSignalAlerts.ts`
- `supabase/migrations/*_signal*.sql`

#### 2.2 Copiloto
- [ ] **JSON válido SIEMPRE**
  - Verificar `safeJsonParse` en `copilotValidator.ts`
  - Verificar `isValidAnalysis` valida estructura completa
  - Test: Respuesta inválida → fallback se activa
- [ ] **Fallback funciona**
  - Verificar `fallbackAnalysis()` retorna estructura válida
  - Test: API down → UI muestra fallback sin crash
- [ ] **Cache evita llamadas repetidas**
  - Verificar cache en `CopilotPanel.tsx`
  - Test: Mismo `offer_id` → no llama API 2 veces en 5min
- [ ] **Confianza cambia según contexto**
  - Verificar `confidence_level` se calcula correctamente
  - Test: Sin datos → `low`, con datos → `medium/high`

**Archivos clave**:
- `src/app/api/copilot/negotiate/route.ts`
- `src/lib/copilotValidator.ts`
- `src/components/copilot/CopilotPanel.tsx`

#### 2.3 Paywall
- [ ] **Free nunca bloquea mapa/señales**
  - Verificar `hasProAccess()` no bloquea `/properties`
  - Verificar mapa siempre visible
  - Verificar señales siempre visibles
- [ ] **Pro bloquea solo**:
  - Copiloto (verificar en `CopilotPanel.tsx`)
  - Timeline profundo (verificar en timeline component)
- [ ] **Copy correcto, sin loops**
  - Verificar mensajes de paywall son claros
  - Verificar no hay redirect loops
  - Verificar "Upgrade to Pro" funciona

**Archivos clave**:
- `src/lib/subscriptions.ts`
- `src/components/copilot/CopilotPanel.tsx`
- `src/app/api/subscriptions/activate-trial/route.ts`

---

### DÍA 3 — PWA + MOBILE + PERFORMANCE

#### 3.1 PWA
- [ ] **"Agregar a inicio" aparece**
  - Verificar `manifest.json` existe
  - Verificar service worker registrado
  - Test: iOS Safari → "Add to Home Screen"
  - Test: Android Chrome → "Install app"
- [ ] **Push llega y abre deep link correcto**
  - Verificar subscription a push notifications
  - Verificar deep link en payload
  - Test: Recibir push → abrir app → navegar a propiedad correcta
- [ ] **Sin spam (máx 1 push/día/prop)**
  - Verificar rate limiting en push service
  - Verificar deduplicación por `property_id` + `user_id` + fecha

**Archivos clave**:
- `public/manifest.json` (verificar si existe)
- `src/app/**/layout.tsx` (service worker registration)
- `src/app/api/push/**` (si existe)

#### 3.2 Mobile / UX
- [ ] **Copy confuso**
  - Revisar todos los textos de UI
  - Verificar mensajes de error son claros
  - Verificar CTAs son descriptivos
- [ ] **Estados intermedios**
  - Loading states en todas las acciones async
  - Empty states cuando no hay data
  - Error states con mensajes claros
- [ ] **Errores silenciosos**
  - Verificar `console.error` no se muestran en prod
  - Verificar errores se loguean pero no crashean UI

#### 3.3 Performance
- [ ] **Llamadas duplicadas**
  - Verificar React Query cache funciona
  - Verificar no hay `useEffect` sin deps que causen loops
- [ ] **Realtime reconecta bien**
  - Test: Desconectar internet → reconectar → updates funcionan
- [ ] **Cache del copiloto**
  - Verificar cache persiste entre navegaciones
- [ ] **Lighthouse móvil ≥ 80**
  - Performance ≥ 80
  - Accessibility ≥ 90
  - Best Practices ≥ 80
  - SEO ≥ 80

---

## 🧰 CHECKLIST DE BUG BASH

### Flujo 1: Crear → Enviar → Contraofertar → Aceptar
- [ ] Crear oferta desde detalle de propiedad
- [ ] Enviar oferta (status: `pending`)
- [ ] Vendedor recibe notificación
- [ ] Vendedor crea contraoferta
- [ ] Comprador recibe notificación
- [ ] Comprador acepta contraoferta
- [ ] Oferta original se marca `expired`
- [ ] Timeline muestra todos los eventos

### Flujo 2: Seguir → Recibir Alerta → Abrir
- [ ] Seguir propiedad desde detalle
- [ ] Señal se confirma en DB (trigger)
- [ ] Usuario recibe alerta (toast + push si PWA)
- [ ] Click en alerta → navega a propiedad
- [ ] Propiedad muestra señal confirmada

### Flujo 3: Expirar Oferta → Badge + Push
- [ ] Crear oferta con `expires_at` en 1 minuto
- [ ] Esperar 1 minuto
- [ ] Cron marca `expired = true`
- [ ] Usuario ve badge "Expired" en UI
- [ ] Usuario recibe push (si PWA)

### Flujo 4: Copiloto con y sin Data
- [ ] Copiloto con oferta completa → análisis detallado
- [ ] Copiloto sin historial → análisis básico
- [ ] Copiloto con API down → fallback funciona
- [ ] Copiloto Free → muestra paywall
- [ ] Copiloto Pro → muestra análisis completo

---

## 🧱 VERSIONADO

### Rama
```bash
git checkout -b release/mvp-0.007
```

### Tag
```bash
git tag -a v0.0.7 -m "MVP 0.007 - Debug completo"
```

### Changelog
Solo fixes, no features nuevas.

---

## 🧠 DEFINICIÓN DE "DONE"

MVP 0.007 está listo cuando:

1. ✅ **1 usuario real completa un flujo sin ayuda**
   - Crear oferta → recibir contraoferta → aceptar
   - Seguir propiedad → recibir alerta → abrir

2. ✅ **No hay crashes**
   - Build limpio
   - Cero errores en consola
   - Errores manejados con fallbacks

3. ✅ **Las alertas ayudan**
   - Llegan cuando corresponde
   - No hay spam
   - Deep links funcionan

4. ✅ **El copiloto aclara**
   - JSON siempre válido
   - Fallback funciona
   - Copy es claro

5. ✅ **El paywall no molesta**
   - Free puede usar mapa/señales
   - Pro bloquea solo features premium
   - Copy es claro

---

## 📋 PRÓXIMOS PASOS

1. **Ejecutar Día 1** → Build + Types + Data Integrity
2. **Ejecutar Día 2** → Realtime + Copiloto + Paywall
3. **Ejecutar Día 3** → PWA + Mobile + Performance
4. **Bug Bash** → Flujos completos con usuario real
5. **Tag & Release** → `v0.0.7` listo para soft launch

---

**Última actualización**: 2026-01-11  
**Estado**: 🟡 En progreso

