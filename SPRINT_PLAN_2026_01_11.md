# 🚀 Sprint Plan: Testing, Performance & Analytics

**Fecha de inicio**: 2026-01-11  
**Duración estimada**: 1-2 semanas  
**Prioridad**: Alta

---

## 📋 Objetivos del Sprint

1. **Testing E2E** - Asegurar calidad y confiabilidad
2. **Performance** - Optimizar experiencia de usuario
3. **Analytics** - Medir y entender uso
4. **Notificaciones** - Mejorar engagement

---

## 1️⃣ Testing E2E con Playwright

### Objetivo
Cubrir flujos críticos con tests E2E automatizados para prevenir regresiones.

### Tareas

#### Setup y Configuración
- [ ] Configurar Playwright para desktop (además de mobile)
- [ ] Setup de test database/seeding para tests
- [ ] Configurar CI/CD para ejecutar tests E2E
- [ ] Crear helpers/utilities para tests (login, data setup)

#### Tests Críticos - Signals
- [ ] **Test: Reportar señal después de visita**
  - Crear usuario → Crear visita → Verificar visita → Reportar señal → Verificar que aparece
- [ ] **Test: Confirmación de señal (3 usuarios)**
  - 3 usuarios reportan misma señal → Verificar que se confirma → Verificar badge cambia
- [ ] **Test: Decay temporal**
  - Crear señal antigua → Ejecutar recálculo → Verificar strength disminuye
- [ ] **Test: Mapa con señales**
  - Verificar que pins cambian de color según señales confirmadas

#### Tests Críticos - Routes
- [ ] **Test: Crear ruta completa**
  - Crear ruta → Agregar stops → Optimizar → Verificar mapa → Exportar
- [ ] **Test: Drag & Drop reordenamiento**
  - Crear ruta con 3+ stops → Reordenar → Verificar que order_index se actualiza
- [ ] **Test: Deep links**
  - Crear ruta → Abrir en Waze → Abrir en Google Maps (verificar URLs)
- [ ] **Test: Add to Route desde PropertyDetail**
  - Ver propiedad → Agregar a ruta → Verificar que aparece en ruta

#### Tests Críticos - Auth & Onboarding
- [ ] **Test: Registro completo**
  - Registro → Email verification → Onboarding → Dashboard
- [ ] **Test: Login/Logout**
  - Login → Verificar sesión → Logout → Verificar redirect

#### Tests de Integración
- [ ] **Test: Flujo completo usuario nuevo**
  - Registro → Onboarding → Buscar propiedades → Crear ruta → Reportar señal
- [ ] **Test: Flujo completo usuario existente**
  - Login → Ver dashboard → Ver propiedades → Crear oferta

### Criterios de Éxito
- ✅ 80%+ cobertura de flujos críticos
- ✅ Tests ejecutan en < 5 minutos
- ✅ CI/CD ejecuta tests en cada PR
- ✅ Tests son determinísticos (no flaky)

### Estimación
- **Setup**: 4 horas
- **Tests Signals**: 8 horas
- **Tests Routes**: 8 horas
- **Tests Auth**: 4 horas
- **Tests Integración**: 6 horas
- **Total**: ~30 horas (4 días)

---

## 2️⃣ Performance Optimization

### Objetivo
Mejorar tiempos de carga y experiencia de usuario con optimizaciones de performance.

### Tareas

#### Caching Strategy
- [ ] **React Query cache configuration**
  - Configurar staleTime y cacheTime apropiados
  - Implementar cache invalidation estratégica
  - Cache de rutas optimizadas (no recalcular si no cambió)
- [ ] **API Response caching**
  - Cache headers en API routes (Next.js)
  - Cache de propiedades (5 min stale)
  - Cache de señales (1 min stale, invalidar on update)
- [ ] **Mapbox tiles caching**
  - Verificar que Mapbox cachea tiles automáticamente
  - Preload de tiles para área visible

#### Lazy Loading
- [ ] **Component lazy loading**
  - Lazy load de PropertyDetail (modal pesado)
  - Lazy load de RouteMap (solo cuando se necesita)
  - Lazy load de PropertyGallery (imágenes grandes)
- [ ] **Route-based code splitting**
  - Verificar que Next.js está haciendo code splitting
  - Analizar bundle size con `@next/bundle-analyzer`
- [ ] **Image optimization**
  - Usar `next/image` para todas las imágenes
  - Lazy loading de imágenes fuera de viewport
  - WebP/AVIF format support

#### Database Query Optimization
- [ ] **Indexes review**
  - Verificar que todos los queries usan indexes
  - Agregar indexes faltantes (property searches, signals)
- [ ] **Query optimization**
  - Optimizar queries de propiedades (select solo campos necesarios)
  - Paginación en listas grandes
  - Batch queries cuando sea posible
- [ ] **Supabase connection pooling**
  - Verificar configuración de pooling
  - Reusar conexiones cuando sea posible

#### Frontend Performance
- [ ] **Bundle size optimization**
  - Analizar bundle con webpack-bundle-analyzer
  - Eliminar dependencias no usadas
  - Tree-shaking verification
- [ ] **Render optimization**
  - Memoización de componentes pesados (React.memo)
  - useMemo/useCallback para cálculos costosos
  - Virtual scrolling para listas largas
- [ ] **Loading states**
  - Skeleton loaders en lugar de spinners
  - Progressive loading (mostrar datos parciales)

### Métricas Objetivo
- ⚡ First Contentful Paint: < 1.5s
- ⚡ Time to Interactive: < 3s
- ⚡ Largest Contentful Paint: < 2.5s
- ⚡ Bundle size: < 200KB (gzipped)
- ⚡ API response time: < 200ms (p95)

### Estimación
- **Caching**: 6 horas
- **Lazy Loading**: 4 horas
- **Database**: 4 horas
- **Frontend**: 6 horas
- **Testing & Measurement**: 4 horas
- **Total**: ~24 horas (3 días)

---

## 3️⃣ Analytics y Métricas

### Objetivo
Implementar tracking de eventos y métricas clave para entender uso y mejorar producto.

### Tareas

#### Setup Analytics
- [ ] **Elegir plataforma**
  - Opciones: PostHog (open source), Mixpanel, Amplitude, Google Analytics 4
  - Recomendación: PostHog (privacy-friendly, open source)
- [ ] **Configurar tracking**
  - Setup de PostHog/Mixpanel
  - Configurar eventos base (page views, user actions)
  - Configurar identificación de usuarios

#### Eventos a Trackear

**User Actions**
- [ ] Registro/Login
- [ ] Búsqueda de propiedades
- [ ] Ver detalle de propiedad
- [ ] Crear ruta
- [ ] Agregar propiedad a ruta
- [ ] Optimizar ruta
- [ ] Exportar/compartir ruta
- [ ] Reportar señal
- [ ] Crear oferta
- [ ] Agregar a favoritos

**Signals Events**
- [ ] Señal reportada (tipo, propiedad)
- [ ] Señal confirmada (tipo, propiedad, usuarios)
- [ ] Decay aplicado (tipo, propiedad, factor)

**Routes Events**
- [ ] Ruta creada
- [ ] Stops agregados (cantidad)
- [ ] Ruta optimizada (tiempo ahorrado)
- [ ] Deep link usado (Waze/Google Maps)

**Business Metrics**
- [ ] Propiedades vistas por usuario
- [ ] Rutas creadas por usuario
- [ ] Señales reportadas por usuario
- [ ] Tasa de conversión (vista → oferta)
- [ ] Tiempo en plataforma
- [ ] Retención (D1, D7, D30)

#### Dashboards
- [ ] **Dashboard de uso**
  - Usuarios activos (DAU/MAU)
  - Eventos por día
  - Propiedades más vistas
  - Rutas más usadas
- [ ] **Dashboard de señales**
  - Señales más reportadas
  - Tasa de confirmación
  - Señales por zona
- [ ] **Dashboard de rutas**
  - Rutas creadas
  - Tiempo promedio ahorrado
  - Uso de deep links

#### Privacy & Compliance
- [ ] **GDPR compliance**
  - Consentimiento explícito para tracking
  - Opt-out mechanism
  - Data retention policies
- [ ] **Anonymization**
  - IP anonymization
  - User ID hashing (opcional)
  - No tracking de datos sensibles

### Estimación
- **Setup**: 4 horas
- **Eventos**: 8 horas
- **Dashboards**: 6 horas
- **Privacy**: 4 horas
- **Total**: ~22 horas (3 días)

---

## 4️⃣ Notificaciones Push para Señales Confirmadas

### Objetivo
Notificar usuarios cuando señales se confirman para aumentar engagement.

### Tareas

#### Backend - Notifications System
- [ ] **Crear tabla de notificaciones**
  ```sql
  CREATE TABLE pricewaze_notifications (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES auth.users,
    type TEXT, -- 'signal_confirmed', 'new_offer', etc.
    title TEXT,
    body TEXT,
    data JSONB, -- { property_id, signal_type, etc. }
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
  );
  ```
- [ ] **Trigger de notificaciones**
  - Modificar `pricewaze_notify_signal_confirmed()` para crear notificaciones
  - Notificar a usuarios que reportaron la señal
  - Notificar a usuarios que tienen la propiedad en favoritos
- [ ] **API endpoints**
  - `GET /api/notifications` - Listar notificaciones
  - `PUT /api/notifications/[id]/read` - Marcar como leída
  - `GET /api/notifications/unread-count` - Contador de no leídas

#### Frontend - UI Components
- [ ] **NotificationBell component**
  - Badge con contador de no leídas
  - Dropdown con lista de notificaciones
  - Marcar como leída al hacer click
- [ ] **NotificationItem component**
  - Mostrar título, cuerpo, timestamp
  - Link a propiedad/ruta relevante
  - Botón de "marcar como leída"
- [ ] **NotificationToast (opcional)**
  - Toast cuando llega notificación en tiempo real
  - Auto-dismiss después de 5s

#### Realtime Integration
- [ ] **Supabase Realtime para notificaciones**
  - Suscribirse a cambios en `pricewaze_notifications`
  - Actualizar contador en tiempo real
  - Mostrar toast cuando llega nueva notificación
- [ ] **Web Push Notifications (opcional)**
  - Service Worker para push notifications
  - Permisos del navegador
  - Notificaciones cuando app está cerrada

#### User Preferences
- [ ] **Settings para notificaciones**
  - Toggle para cada tipo de notificación
  - Preferencias de frecuencia (inmediato, diario, semanal)
  - Preferencias de canal (in-app, email, push)

### Criterios de Éxito
- ✅ Notificaciones se crean cuando señal se confirma
- ✅ Usuarios ven notificaciones en tiempo real
- ✅ Contador de no leídas funciona
- ✅ Links a propiedades/rutas funcionan
- ✅ Preferencias guardadas

### Estimación
- **Backend**: 8 horas
- **Frontend UI**: 6 horas
- **Realtime**: 4 horas
- **Web Push (opcional)**: 8 horas
- **Total**: ~18 horas (2.5 días) | ~26 horas con Web Push (3.5 días)

---

## 📊 Resumen del Sprint

### Timeline
- **Semana 1**: Testing E2E + Performance (días 1-4)
- **Semana 2**: Analytics + Notificaciones (días 5-7)

### Estimación Total
- **Testing E2E**: 30 horas (4 días)
- **Performance**: 24 horas (3 días)
- **Analytics**: 22 horas (3 días)
- **Notificaciones**: 18 horas (2.5 días)
- **Total**: ~94 horas (~12 días de trabajo)

### Priorización
1. **Alta**: Testing E2E (crítico para calidad)
2. **Alta**: Performance (impacto directo en UX)
3. **Media**: Analytics (importante para decisiones)
4. **Media**: Notificaciones (mejora engagement)

### Dependencias
- Testing E2E puede empezar inmediatamente
- Performance puede empezar en paralelo
- Analytics necesita definir eventos primero
- Notificaciones depende de backend de signals (ya existe)

---

## 🎯 Métricas de Éxito del Sprint

### Testing
- ✅ 80%+ cobertura de flujos críticos
- ✅ Tests ejecutan en CI/CD
- ✅ 0 tests flaky

### Performance
- ⚡ LCP < 2.5s
- ⚡ TTI < 3s
- ⚡ Bundle < 200KB

### Analytics
- ✅ 20+ eventos trackeados
- ✅ Dashboard funcional
- ✅ GDPR compliant

### Notificaciones
- ✅ Notificaciones en tiempo real
- ✅ 80%+ usuarios ven notificaciones
- ✅ Preferencias funcionando

---

## 📝 Notas

- **Testing**: Empezar con flujos más críticos (auth, signals)
- **Performance**: Medir antes y después con Lighthouse
- **Analytics**: Empezar simple, agregar eventos gradualmente
- **Notificaciones**: MVP primero (in-app), push después

---

**Estado**: 📋 Planificado  
**Próximo paso**: Asignar tareas y comenzar con Testing E2E

