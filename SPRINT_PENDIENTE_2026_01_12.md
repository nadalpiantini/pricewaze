# 📋 Sprint Pendiente: Testing, Performance & Analytics

**Sprint**: 2026-01-11  
**Estado**: 🟡 En Progreso  
**Última actualización**: 2026-01-12

---

## ✅ Completado

### 1. Notificaciones Push ✅
- ✅ Tabla `pricewaze_notifications` creada
- ✅ Triggers para señales confirmadas
- ✅ API endpoints funcionando
- ✅ Frontend completo (NotificationBell)
- ✅ Realtime updates con Supabase

### 2. Analytics Base ✅
- ✅ Sistema base (`src/lib/analytics.ts`)
- ✅ Eventos onboarding agregados
- ✅ Ready para PostHog/Mixpanel
- ✅ Logging en dev y prod

### 3. Performance Parcial ✅
- ✅ React Query cache optimizado
- ✅ Lazy loading de componentes pesados
- ✅ PropertyDetail lazy loaded
- ✅ RouteMap lazy loaded

### 4. Testing E2E Parcial ✅
- ✅ Setup Playwright configurado
- ✅ Tests base creados (signals, routes, auth, integration)
- ✅ Helpers de autenticación
- ✅ Data-testid en componentes críticos

---

## ⏳ Pendiente (Prioridad Alta)

### 1. Testing E2E - Completar Tests

#### Tests Signals (Faltan 3 de 4)
- [x] Test base creado
- [ ] **Test: Reportar señal después de visita** (parcial)
- [ ] **Test: Confirmación de señal (3 usuarios)** (no implementado)
- [ ] **Test: Decay temporal** (no implementado)
- [ ] **Test: Mapa con señales** (parcial)

#### Tests Routes (Faltan 2 de 4)
- [x] Test: Crear ruta completa (parcial)
- [ ] **Test: Drag & Drop reordenamiento** (no implementado)
- [ ] **Test: Deep links** (no implementado)
- [x] Test: Add to Route desde PropertyDetail (parcial)

#### Tests Auth (Faltan 1 de 2)
- [ ] **Test: Registro completo** (skipped - necesita email verification mock)
- [x] Test: Login/Logout (implementado)

#### Tests Integración (Faltan 2 de 2)
- [ ] **Test: Flujo completo usuario nuevo** (parcial)
- [ ] **Test: Flujo completo usuario existente** (parcial)

**Estimación restante**: ~16 horas (2 días)

---

### 2. Performance - Optimizaciones Pendientes

#### Database Query Optimization
- [ ] **Indexes review** - Verificar todos los queries usan indexes
- [ ] **Agregar indexes faltantes** (property searches, signals)
- [ ] **Query optimization** - Select solo campos necesarios
- [ ] **Paginación en listas grandes** (no implementado)
- [ ] **Batch queries** cuando sea posible

#### Frontend Performance
- [ ] **Bundle size analysis** - Usar webpack-bundle-analyzer
- [ ] **Eliminar dependencias no usadas**
- [ ] **Memoización de componentes pesados** (React.memo)
- [ ] **Virtual scrolling** para listas largas
- [ ] **Skeleton loaders** en lugar de spinners

#### API Response Caching
- [ ] **Cache headers en API routes** (Next.js)
- [ ] **Cache de propiedades** (5 min stale)
- [ ] **Cache de señales** (1 min stale, invalidar on update)

**Estimación restante**: ~14 horas (2 días)

---

### 3. Analytics - Configuración Pendiente

#### Setup Analytics Provider
- [ ] **Elegir plataforma** (PostHog recomendado)
- [ ] **Configurar PostHog/Mixpanel**
  - Variables de entorno
  - SDK integration
  - Identificación de usuarios

#### Eventos Pendientes (Faltan ~15 de 20+)
- [x] Registro/Login (base)
- [x] Onboarding events (completado)
- [ ] **Búsqueda de propiedades**
- [ ] **Ver detalle de propiedad**
- [ ] **Crear ruta**
- [ ] **Agregar propiedad a ruta**
- [ ] **Optimizar ruta**
- [ ] **Exportar/compartir ruta**
- [ ] **Reportar señal**
- [ ] **Señal confirmada**
- [ ] **Decay aplicado**
- [ ] **Crear oferta**
- [ ] **Agregar a favoritos**
- [ ] **Ruta creada**
- [ ] **Stops agregados**
- [ ] **Ruta optimizada**
- [ ] **Deep link usado**

#### Dashboards
- [ ] **Dashboard de uso** (DAU/MAU, eventos por día)
- [ ] **Dashboard de señales** (más reportadas, tasa confirmación)
- [ ] **Dashboard de rutas** (creadas, tiempo ahorrado)

#### Privacy & Compliance
- [ ] **GDPR compliance** (consentimiento, opt-out)
- [ ] **IP anonymization**
- [ ] **Data retention policies**

**Estimación restante**: ~18 horas (2.5 días)

---

## 📊 Resumen de Pendiente

| Área | Completado | Pendiente | Estimación |
|------|------------|-----------|------------|
| **Testing E2E** | 40% | 60% | ~16 horas |
| **Performance** | 50% | 50% | ~14 horas |
| **Analytics** | 30% | 70% | ~18 horas |
| **Notificaciones** | 100% | 0% | ✅ |
| **TOTAL** | **55%** | **45%** | **~48 horas (6 días)** |

---

## 🎯 Priorización Recomendada

### Semana 1 (Días 1-3)
1. **Testing E2E** - Completar tests críticos
   - Confirmación de señales (3 usuarios)
   - Drag & Drop en rutas
   - Deep links
   - Flujos completos

2. **Performance DB** - Optimizaciones críticas
   - Revisar indexes
   - Agregar indexes faltantes
   - Implementar paginación

### Semana 2 (Días 4-6)
3. **Analytics** - Configurar y trackear
   - Setup PostHog/Mixpanel
   - Implementar 15+ eventos pendientes
   - Crear dashboards básicos

4. **Performance Frontend** - Optimizaciones finales
   - Bundle analysis
   - Memoización
   - Skeleton loaders

---

## 🚀 Próximos Pasos Inmediatos

### Opción A: Completar Testing E2E (Recomendado)
**Razón**: Crítico para calidad, previene regresiones

**Tareas**:
1. Test de confirmación de señales (3 usuarios)
2. Test de drag & drop en rutas
3. Test de deep links
4. Test de flujo completo usuario nuevo

**Tiempo**: ~16 horas (2 días)

### Opción B: Configurar Analytics Provider
**Razón**: Necesario para medir éxito del onboarding

**Tareas**:
1. Setup PostHog
2. Integrar SDK
3. Configurar eventos clave
4. Dashboard básico

**Tiempo**: ~8 horas (1 día)

### Opción C: Optimizar Performance DB
**Razón**: Impacto directo en UX, escalabilidad

**Tareas**:
1. Revisar queries lentos
2. Agregar indexes faltantes
3. Implementar paginación

**Tiempo**: ~6 horas (1 día)

---

## 📝 Notas

- **Testing E2E**: Tests base funcionan, falta completar casos edge
- **Performance**: Lazy loading ya implementado, falta DB y bundle optimization
- **Analytics**: Sistema base listo, falta provider y eventos específicos
- **Notificaciones**: ✅ 100% completado

---

**Estado**: 🟡 55% Completado  
**Tiempo estimado restante**: ~48 horas (6 días de trabajo)  
**Recomendación**: Enfocarse en Testing E2E primero (crítico para calidad)

