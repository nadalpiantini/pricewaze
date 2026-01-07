# 🚀 Plan de Implementación - Funcionalidades Open Source

## 📋 Resumen Ejecutivo

Este plan detalla la implementación de funcionalidades identificadas en repositorios open source, priorizadas por impacto y esfuerzo, integradas con la arquitectura actual de PriceWaze.

**Duración Total**: 9-12 meses  
**Fases**: 3 fases principales  
**Enfoque**: Incremental, con entregas funcionales en cada fase

---

## 🎯 Fase 1: MVP Plus (Meses 1-3)

### Objetivo
Mejorar la experiencia de usuario con funcionalidades de comparación, alertas y visualización mejorada.

---

### 1.1 Sistema de Comparación de Propiedades
**Prioridad**: 🔥 Alta  
**Esfuerzo**: 2-3 semanas  
**Impacto**: Alto

#### Tareas Técnicas

**Backend (Supabase + API Routes)**
- [ ] Crear tabla `pricewaze_comparisons`
  ```sql
  CREATE TABLE pricewaze_comparisons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    property_ids UUID[] NOT NULL CHECK (array_length(property_ids, 1) <= 3),
    name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );
  ```
- [ ] Crear RLS policies para comparaciones
- [ ] Crear API route `/api/comparisons`
  - `GET /api/comparisons` - Listar comparaciones del usuario
  - `POST /api/comparisons` - Crear nueva comparación
  - `PUT /api/comparisons/[id]` - Actualizar comparación
  - `DELETE /api/comparisons/[id]` - Eliminar comparación
  - `GET /api/comparisons/[id]/export` - Exportar a PDF

**Frontend (React + Next.js)**
- [ ] Crear componente `PropertyComparison.tsx`
  - Vista lado a lado de hasta 3 propiedades
  - Tabla comparativa de características
  - Botones de acción (agregar/quitar propiedades)
- [ ] Crear página `/comparison` o modal de comparación
- [ ] Agregar botón "Comparar" en `PropertyCard.tsx`
- [ ] Integrar con `property-store.ts` (Zustand)
  - Estado de propiedades seleccionadas para comparar
  - Persistencia en localStorage
- [ ] Crear componente `ComparisonTable.tsx`
  - Columnas: Propiedad 1, Propiedad 2, Propiedad 3
  - Filas: Precio, Área, Habitaciones, Baños, Zona, etc.
- [ ] Implementar exportación a PDF
  - Usar `react-pdf` o `jspdf`
  - Template con branding de PriceWaze

**Integración**
- [ ] Agregar hook `useComparison` para gestión de estado
- [ ] Actualizar `PropertyCard` para mostrar badge cuando está en comparación
- [ ] Agregar notificación cuando se alcanza el límite de 3 propiedades

**Testing**
- [ ] Tests unitarios para lógica de comparación
- [ ] Tests E2E para flujo completo de comparación
- [ ] Validar exportación PDF en diferentes navegadores

**Archivos a Crear/Modificar**
```
src/
├── app/
│   └── (dashboard)/
│       └── comparison/
│           └── page.tsx                    # Nueva página
├── components/
│   └── properties/
│       ├── PropertyComparison.tsx          # Nuevo componente
│       ├── ComparisonTable.tsx              # Nuevo componente
│       └── PropertyCard.tsx                # Modificar (agregar botón comparar)
├── hooks/
│   └── useComparison.ts                    # Nuevo hook
├── lib/
│   └── pdf/
│       └── exportComparison.ts             # Nueva utilidad
├── stores/
│   └── comparison-store.ts                 # Nuevo store (opcional)
└── app/
    └── api/
        └── comparisons/
            └── route.ts                    # Nueva API route
```

---

### 1.2 Sistema de Alertas Inteligentes
**Prioridad**: 🔥 Alta  
**Esfuerzo**: 3-4 semanas  
**Impacto**: Alto

#### Tareas Técnicas

**Backend (Supabase + API Routes + Workers)**
- [ ] Crear tabla `pricewaze_saved_searches`
  ```sql
  CREATE TABLE pricewaze_saved_searches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    filters JSONB NOT NULL, -- Almacena PropertyFilters
    email_notifications BOOLEAN DEFAULT true,
    push_notifications BOOLEAN DEFAULT false,
    frequency TEXT DEFAULT 'daily', -- 'realtime', 'daily', 'weekly'
    last_notified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );
  ```
- [ ] Crear tabla `pricewaze_price_alerts`
  ```sql
  CREATE TABLE pricewaze_price_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    property_id UUID REFERENCES pricewaze_properties(id) ON DELETE CASCADE,
    alert_type TEXT NOT NULL, -- 'price_drop', 'price_increase', 'status_change'
    threshold_value NUMERIC,
    notified BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  ```
- [ ] Crear trigger en `pricewaze_properties` para detectar cambios de precio
  ```sql
  CREATE OR REPLACE FUNCTION check_price_changes()
  RETURNS TRIGGER AS $$
  BEGIN
    IF OLD.price != NEW.price THEN
      -- Insertar alerta para usuarios que siguen esta propiedad
      INSERT INTO pricewaze_price_alerts (user_id, property_id, alert_type, threshold_value)
      SELECT user_id, NEW.id, 'price_drop', NEW.price
      FROM pricewaze_favorites
      WHERE property_id = NEW.id;
    END IF;
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;
  ```
- [ ] Crear API routes
  - `POST /api/alerts/searches` - Crear búsqueda guardada
  - `GET /api/alerts/searches` - Listar búsquedas guardadas
  - `DELETE /api/alerts/searches/[id]` - Eliminar búsqueda
  - `POST /api/alerts/properties` - Crear alerta de propiedad
  - `GET /api/alerts` - Listar todas las alertas del usuario
- [ ] Crear worker/cron job para procesar alertas
  - Opción 1: Supabase Edge Functions (cron)
  - Opción 2: Next.js API route con `node-cron` (solo en servidor dedicado)
  - Opción 3: Vercel Cron Jobs
  - Lógica: Comparar búsquedas guardadas con propiedades nuevas/cambios

**Frontend (React + Next.js)**
- [ ] Crear componente `SavedSearches.tsx`
  - Lista de búsquedas guardadas
  - Botones para editar/eliminar
  - Indicador de nuevas propiedades encontradas
- [ ] Crear componente `AlertSettings.tsx`
  - Configuración de frecuencia de notificaciones
  - Preferencias de email/push
- [ ] Agregar botón "Guardar búsqueda" en `PropertyFilters.tsx`
- [ ] Crear página `/alerts` o sección en dashboard
- [ ] Integrar con sistema de notificaciones
  - Email: Usar Resend o SendGrid
  - Push: Usar service workers + Web Push API
- [ ] Crear componente `AlertBadge.tsx` para mostrar alertas pendientes

**Integración**
- [ ] Conectar con `PropertyFilters` para guardar estado de filtros
- [ ] Integrar con `property-store.ts` para alertas de favoritos
- [ ] Agregar notificaciones en tiempo real usando Supabase Realtime

**Testing**
- [ ] Tests para lógica de matching de búsquedas
- [ ] Tests para triggers de cambios de precio
- [ ] Tests E2E para flujo completo de alertas

**Archivos a Crear/Modificar**
```
src/
├── app/
│   └── (dashboard)/
│       └── alerts/
│           └── page.tsx                     # Nueva página
├── components/
│   └── alerts/
│       ├── SavedSearches.tsx               # Nuevo componente
│       ├── AlertSettings.tsx               # Nuevo componente
│       └── AlertBadge.tsx                  # Nuevo componente
├── components/
│   └── properties/
│       └── PropertyFilters.tsx             # Modificar (agregar guardar búsqueda)
├── app/
│   └── api/
│       ├── alerts/
│       │   ├── route.ts                    # Nueva API route
│       │   ├── searches/
│       │   │   └── route.ts                # Nueva API route
│       │   └── properties/
│       │       └── route.ts               # Nueva API route
│       └── cron/
│           └── process-alerts/
│               └── route.ts                # Nueva API route (cron)
├── lib/
│   ├── alerts/
│   │   ├── matcher.ts                      # Lógica de matching
│   │   └── notifier.ts                     # Envío de notificaciones
│   └── email/
│       └── templates/
│           └── alert.tsx                   # Template de email
└── supabase/
    └── migrations/
        └── YYYYMMDD_create_alerts.sql      # Nueva migración
```

---

### 1.3 Galería Mejorada con Tours Virtuales
**Prioridad**: 🔥 Alta  
**Esfuerzo**: 2-3 semanas  
**Impacto**: Alto

#### Tareas Técnicas

**Backend (Supabase Storage)**
- [ ] Configurar buckets en Supabase Storage
  - `property-images` - Imágenes regulares
  - `property-videos` - Videos 360° y tours virtuales
- [ ] Crear tabla `pricewaze_property_media`
  ```sql
  CREATE TABLE pricewaze_property_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID REFERENCES pricewaze_properties(id) ON DELETE CASCADE,
    media_type TEXT NOT NULL, -- 'image', 'video_360', 'virtual_tour'
    category TEXT, -- 'exterior', 'interior', 'floor_plan', 'amenities'
    url TEXT NOT NULL,
    thumbnail_url TEXT,
    order_index INTEGER DEFAULT 0,
    metadata JSONB, -- {duration, resolution, etc}
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  ```
- [ ] Crear API routes
  - `POST /api/properties/[id]/media` - Subir media
  - `GET /api/properties/[id]/media` - Listar media
  - `DELETE /api/properties/[id]/media/[mediaId]` - Eliminar media
  - `PUT /api/properties/[id]/media/[mediaId]/reorder` - Reordenar

**Frontend (React + Next.js)**
- [ ] Crear componente `PropertyGallery.tsx`
  - Grid de imágenes con lightbox
  - Navegación con teclado (flechas)
  - Indicador de posición (1/10)
  - Botones de navegación
- [ ] Crear componente `VirtualTour.tsx`
  - Integración con librerías 360°:
    - Opción 1: `react-360-view` (imágenes 360°)
    - Opción 2: `@react-three/fiber` + `drei` (3D avanzado)
    - Opción 3: `react-pannellum` (Pannellum wrapper)
  - Controles de navegación
  - Soporte para videos 360°
- [ ] Crear componente `MediaUploader.tsx`
  - Drag & drop
  - Preview antes de subir
  - Progreso de upload
  - Categorización (exterior/interior/planos)
- [ ] Mejorar `PropertyDetail.tsx` para usar nueva galería
- [ ] Agregar organización por categorías
  - Tabs: Todas, Exterior, Interior, Planos, Amenidades

**Integración**
- [ ] Actualizar schema de `pricewaze_properties` para usar `property_media` en lugar de `images[]`
- [ ] Migrar datos existentes de `images[]` a nueva tabla
- [ ] Integrar con Supabase Storage para uploads

**Testing**
- [ ] Tests para upload de media
- [ ] Tests para reordenamiento
- [ ] Tests E2E para galería completa

**Archivos a Crear/Modificar**
```
src/
├── components/
│   └── properties/
│       ├── PropertyGallery.tsx             # Nuevo componente
│       ├── VirtualTour.tsx                 # Nuevo componente
│       ├── MediaUploader.tsx               # Nuevo componente
│       └── PropertyDetail.tsx             # Modificar (usar nueva galería)
├── app/
│   └── api/
│       └── properties/
│           └── [id]/
│               └── media/
│                   └── route.ts           # Nueva API route
├── lib/
│   └── storage/
│       └── uploadMedia.ts                 # Nueva utilidad
└── supabase/
    └── migrations/
        └── YYYYMMDD_create_property_media.sql
```

---

### 1.4 Sistema de Reviews y Ratings
**Prioridad**: 🔥 Alta  
**Esfuerzo**: 2-3 semanas  
**Impacto**: Alto

#### Tareas Técnicas

**Backend (Supabase)**
- [ ] Crear tabla `pricewaze_reviews`
  ```sql
  CREATE TABLE pricewaze_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID REFERENCES pricewaze_properties(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title TEXT,
    comment TEXT,
    verified_visit BOOLEAN DEFAULT false, -- Solo si tiene visita GPS verificada
    visit_id UUID REFERENCES pricewaze_visits(id),
    helpful_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(property_id, user_id) -- Un usuario solo puede review una vez
  );
  ```
- [ ] Crear tabla `pricewaze_agent_ratings`
  ```sql
  CREATE TABLE pricewaze_agent_ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID REFERENCES pricewaze_profiles(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(agent_id, user_id)
  );
  ```
- [ ] Crear función para calcular ratings promedio
  ```sql
  CREATE OR REPLACE FUNCTION calculate_property_rating(property_uuid UUID)
  RETURNS TABLE (avg_rating NUMERIC, total_reviews INTEGER) AS $$
  BEGIN
    RETURN QUERY
    SELECT 
      ROUND(AVG(rating)::NUMERIC, 2) as avg_rating,
      COUNT(*)::INTEGER as total_reviews
    FROM pricewaze_reviews
    WHERE property_id = property_uuid;
  END;
  $$ LANGUAGE plpgsql;
  ```
- [ ] Crear API routes
  - `POST /api/reviews/properties` - Crear review de propiedad
  - `GET /api/reviews/properties/[id]` - Listar reviews de propiedad
  - `PUT /api/reviews/[id]` - Actualizar review
  - `DELETE /api/reviews/[id]` - Eliminar review
  - `POST /api/reviews/agents` - Crear rating de agente
  - `GET /api/reviews/agents/[id]` - Listar ratings de agente

**Frontend (React + Next.js)**
- [ ] Crear componente `PropertyReviews.tsx`
  - Lista de reviews con paginación
  - Filtros (más recientes, más útiles, mejor rating)
  - Botón "Escribir review" (solo si visitó la propiedad)
- [ ] Crear componente `ReviewForm.tsx`
  - Formulario con rating stars
  - Campos: título, comentario, rating
  - Validación
- [ ] Crear componente `RatingStars.tsx`
  - Estrellas interactivas
  - Visualización de rating promedio
- [ ] Crear componente `AgentRating.tsx`
  - Rating de agentes en perfil
  - Lista de reviews de agentes
- [ ] Agregar sección de reviews en `PropertyDetail.tsx`
- [ ] Mostrar rating promedio en `PropertyCard.tsx`

**Integración**
- [ ] Conectar con sistema de visitas para verificación
- [ ] Integrar con `pricewaze_visits` para marcar reviews como verificadas
- [ ] Agregar notificaciones cuando se recibe un review

**Testing**
- [ ] Tests para creación de reviews
- [ ] Tests para cálculo de ratings
- [ ] Tests E2E para flujo completo

**Archivos a Crear/Modificar**
```
src/
├── components/
│   └── reviews/
│       ├── PropertyReviews.tsx            # Nuevo componente
│       ├── ReviewForm.tsx                  # Nuevo componente
│       ├── RatingStars.tsx                 # Nuevo componente
│       └── AgentRating.tsx                 # Nuevo componente
├── components/
│   └── properties/
│       ├── PropertyCard.tsx                # Modificar (agregar rating)
│       └── PropertyDetail.tsx             # Modificar (agregar sección reviews)
├── app/
│   └── api/
│       └── reviews/
│           ├── route.ts                    # Nueva API route
│           ├── properties/
│           │   └── [id]/
│           │       └── route.ts           # Nueva API route
│           └── agents/
│               └── [id]/
│                   └── route.ts          # Nueva API route
└── supabase/
    └── migrations/
        └── YYYYMMDD_create_reviews.sql
```

---

## 🚀 Fase 2: Growth Features (Meses 4-7)

### Objetivo
Agregar funcionalidades avanzadas de comunicación, análisis y CRM.

---

### 2.1 Chat en Tiempo Real
**Prioridad**: ⚡ Media  
**Esfuerzo**: 4-5 semanas  
**Impacto**: Alto

#### Tareas Técnicas

**Backend (Supabase Realtime)**
- [ ] Crear tabla `pricewaze_conversations`
  ```sql
  CREATE TABLE pricewaze_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID REFERENCES pricewaze_properties(id) ON DELETE CASCADE,
    buyer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    seller_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    last_message_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(property_id, buyer_id, seller_id)
  );
  ```
- [ ] Crear tabla `pricewaze_messages`
  ```sql
  CREATE TABLE pricewaze_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES pricewaze_conversations(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    message_type TEXT DEFAULT 'text', -- 'text', 'image', 'file', 'offer_link'
    metadata JSONB,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  ```
- [ ] Habilitar Realtime en Supabase para `pricewaze_messages`
- [ ] Crear API routes
  - `GET /api/conversations` - Listar conversaciones del usuario
  - `GET /api/conversations/[id]` - Obtener conversación con mensajes
  - `POST /api/conversations` - Crear nueva conversación
  - `POST /api/messages` - Enviar mensaje
  - `PUT /api/messages/[id]/read` - Marcar como leído
  - `GET /api/conversations/unread-count` - Contador de no leídos

**Frontend (React + Next.js + Supabase Realtime)**
- [ ] Crear componente `ChatWindow.tsx`
  - Lista de conversaciones
  - Ventana de chat activa
  - Input de mensaje
  - Indicador de "escribiendo..."
  - Timestamps y estados de lectura
- [ ] Crear componente `ConversationList.tsx`
  - Lista de conversaciones con preview
  - Badge de mensajes no leídos
  - Indicador de última actividad
- [ ] Crear componente `MessageBubble.tsx`
  - Burbujas de mensaje (enviado/recibido)
  - Soporte para imágenes y archivos
  - Timestamps relativos
- [ ] Crear hook `useRealtimeChat.ts`
  - Suscripción a Supabase Realtime
  - Gestión de estado de mensajes
  - Manejo de conexión/desconexión
- [ ] Crear página `/messages` o modal de chat
- [ ] Agregar botón "Contactar" en `PropertyCard` y `PropertyDetail`
- [ ] Integrar notificaciones push para nuevos mensajes

**Integración**
- [ ] Conectar con sistema de ofertas (enviar link a oferta en chat)
- [ ] Integrar con sistema de visitas (sugerir agendar visita)
- [ ] Agregar notificaciones en tiempo real

**Testing**
- [ ] Tests para envío/recepción de mensajes
- [ ] Tests para Realtime subscriptions
- [ ] Tests E2E para flujo completo de chat

**Archivos a Crear/Modificar**
```
src/
├── app/
│   └── (dashboard)/
│       └── messages/
│           └── page.tsx                    # Nueva página
├── components/
│   └── chat/
│       ├── ChatWindow.tsx                 # Nuevo componente
│       ├── ConversationList.tsx           # Nuevo componente
│       └── MessageBubble.tsx              # Nuevo componente
├── components/
│   └── properties/
│       ├── PropertyCard.tsx               # Modificar (agregar botón contactar)
│       └── PropertyDetail.tsx             # Modificar (agregar botón contactar)
├── hooks/
│   └── useRealtimeChat.ts                 # Nuevo hook
├── app/
│   └── api/
│       ├── conversations/
│       │   ├── route.ts                   # Nueva API route
│       │   └── [id]/
│       │       └── route.ts               # Nueva API route
│       └── messages/
│           ├── route.ts                   # Nueva API route
│           └── [id]/
│               └── read/
│                   └── route.ts          # Nueva API route
└── supabase/
    └── migrations/
        └── YYYYMMDD_create_chat.sql
```

---

### 2.2 Estimación Automática de Valor (Zestimate)
**Prioridad**: ⚡ Media  
**Esfuerzo**: 5-6 semanas  
**Impacto**: Alto

#### Tareas Técnicas

**Backend (CrewAI + ML Model)**
- [ ] Crear tabla `pricewaze_estimates`
  ```sql
  CREATE TABLE pricewaze_estimates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID REFERENCES pricewaze_properties(id) ON DELETE CASCADE,
    estimated_value NUMERIC NOT NULL,
    confidence_score NUMERIC CHECK (confidence_score >= 0 AND confidence_score <= 1),
    methodology TEXT, -- 'ml_model', 'comparable_sales', 'hybrid'
    comparable_properties UUID[],
    factors JSONB, -- {location_score, condition_score, market_trend, etc}
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ -- Las estimaciones expiran después de X días
  );
  ```
- [ ] Crear CrewAI agent `ValuationAgent`
  - Analizar características de propiedad
  - Buscar propiedades comparables
  - Calcular estimación basada en múltiples factores
- [ ] Crear modelo ML básico (opcional, para MVP usar reglas)
  - Opción 1: Regresión lineal con características clave
  - Opción 2: Random Forest para mejor precisión
  - Opción 3: Integrar con API externa (Zillow API si disponible)
- [ ] Crear API route `/api/ai/valuation`
  - Input: property_id o características de propiedad
  - Output: estimación, confianza, metodología, comparables
- [ ] Crear función para encontrar propiedades comparables
  ```sql
  CREATE OR REPLACE FUNCTION find_comparable_properties(
    target_property_id UUID,
    max_distance_km NUMERIC DEFAULT 5,
    max_price_diff_percent NUMERIC DEFAULT 20
  )
  RETURNS TABLE (property_id UUID, similarity_score NUMERIC) AS $$
  -- Lógica para encontrar propiedades similares
  $$ LANGUAGE plpgsql;
  ```

**Frontend (React + Next.js)**
- [ ] Crear componente `PropertyEstimate.tsx`
  - Muestra estimación con rango de confianza
  - Gráfico de estimación vs precio listado
  - Botón "Ver detalles" para metodología
- [ ] Crear componente `EstimateDetails.tsx`
  - Desglose de factores (ubicación, condición, mercado)
  - Lista de propiedades comparables
  - Historial de estimaciones
- [ ] Crear componente `ComparableProperties.tsx`
  - Grid de propiedades similares
  - Indicadores de similitud
- [ ] Agregar estimación en `PropertyDetail.tsx`
- [ ] Agregar badge de estimación en `PropertyCard.tsx` (opcional)

**Integración**
- [ ] Conectar con CrewAI `PricingCrew` existente
- [ ] Usar datos de `pricewaze_zones` para contexto de mercado
- [ ] Integrar con historial de precios para tendencias

**Testing**
- [ ] Tests para cálculo de estimaciones
- [ ] Tests para búsqueda de comparables
- [ ] Tests E2E para flujo completo

**Archivos a Crear/Modificar**
```
src/
├── components/
│   └── properties/
│       ├── PropertyEstimate.tsx            # Nuevo componente
│       ├── EstimateDetails.tsx             # Nuevo componente
│       └── ComparableProperties.tsx         # Nuevo componente
├── components/
│   └── properties/
│       └── PropertyDetail.tsx             # Modificar (agregar estimación)
├── crewai/
│   └── agents/
│       └── valuation_agent.py              # Nuevo agent
├── app/
│   └── api/
│       └── ai/
│           └── valuation/
│               └── route.ts                # Nueva API route
└── supabase/
    └── migrations/
        └── YYYYMMDD_create_estimates.sql
```

---

### 2.3 Heatmaps de Precios en Mapa
**Prioridad**: ⚡ Media  
**Esfuerzo**: 3-4 semanas  
**Impacto**: Medio

#### Tareas Técnicas

**Backend (Supabase + PostGIS)**
- [ ] Crear función para calcular precios promedio por zona
  ```sql
  CREATE OR REPLACE FUNCTION get_price_heatmap_data(
    bounds_box BOX,
    property_type_filter TEXT DEFAULT NULL
  )
  RETURNS TABLE (
    zone_id UUID,
    zone_name TEXT,
    avg_price_m2 NUMERIC,
    property_count INTEGER,
    geometry GEOMETRY
  ) AS $$
  BEGIN
    RETURN QUERY
    SELECT 
      z.id,
      z.name,
      z.avg_price_m2,
      COUNT(p.id)::INTEGER as property_count,
      z.boundary
    FROM pricewaze_zones z
    LEFT JOIN pricewaze_properties p ON ST_Contains(z.boundary, p.location)
    WHERE z.boundary && bounds_box
      AND (property_type_filter IS NULL OR p.property_type = property_type_filter)
    GROUP BY z.id, z.name, z.avg_price_m2, z.boundary;
  END;
  $$ LANGUAGE plpgsql;
  ```
- [ ] Crear API route `/api/map/heatmap`
  - Input: bounds, property_type, filters
  - Output: GeoJSON con datos de precios por zona

**Frontend (React + Mapbox)**
- [ ] Crear componente `PriceHeatmap.tsx`
  - Integración con Mapbox GL
  - Capa de heatmap usando `mapbox-gl-heatmap` o custom layer
  - Leyenda de colores (verde = barato, rojo = caro)
  - Slider de tiempo para ver tendencias (opcional)
- [ ] Agregar controles en `PropertyMap.tsx`
  - Toggle para mostrar/ocultar heatmap
  - Selector de tipo de propiedad
  - Selector de métrica (precio/m², precio total)
- [ ] Crear hook `useHeatmapData.ts`
  - Fetch de datos de heatmap
  - Caché de datos
  - Actualización cuando cambian filtros

**Integración**
- [ ] Integrar con `PropertyMap.tsx` existente
- [ ] Conectar con filtros de búsqueda
- [ ] Usar datos de `pricewaze_zones` para boundaries

**Testing**
- [ ] Tests para cálculo de heatmap
- [ ] Tests para renderizado en mapa
- [ ] Tests E2E para interacción con heatmap

**Archivos a Crear/Modificar**
```
src/
├── components/
│   └── map/
│       ├── PriceHeatmap.tsx               # Nuevo componente
│       └── PropertyMap.tsx                 # Modificar (agregar heatmap)
├── hooks/
│   └── useHeatmapData.ts                  # Nuevo hook
├── app/
│   └── api/
│       └── map/
│           └── heatmap/
│               └── route.ts               # Nueva API route
└── lib/
    └── mapbox/
        └── heatmapLayer.ts                # Nueva utilidad
```

---

### 2.4 Sistema de Leads y CRM Básico
**Prioridad**: ⚡ Media  
**Esfuerzo**: 3-4 semanas  
**Impacto**: Medio

#### Tareas Técnicas

**Backend (Supabase)**
- [ ] Crear tabla `pricewaze_leads`
  ```sql
  CREATE TABLE pricewaze_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID REFERENCES pricewaze_properties(id) ON DELETE SET NULL,
    user_id UUID REFERENCES auth.users(id), -- Lead puede o no ser usuario
    agent_id UUID REFERENCES pricewaze_profiles(id), -- Agente asignado
    source TEXT, -- 'property_inquiry', 'search_form', 'contact_form'
    status TEXT DEFAULT 'new', -- 'new', 'contacted', 'qualified', 'converted', 'lost'
    score INTEGER DEFAULT 0, -- Lead scoring
    contact_info JSONB NOT NULL, -- {name, email, phone}
    notes TEXT,
    metadata JSONB, -- {interested_in, budget, timeline, etc}
    last_contacted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );
  ```
- [ ] Crear tabla `pricewaze_lead_activities`
  ```sql
  CREATE TABLE pricewaze_lead_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES pricewaze_leads(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL, -- 'email_sent', 'call_made', 'meeting_scheduled', 'note_added'
    description TEXT,
    performed_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  ```
- [ ] Crear función para calcular lead score
  ```sql
  CREATE OR REPLACE FUNCTION calculate_lead_score(lead_uuid UUID)
  RETURNS INTEGER AS $$
  DECLARE
    score INTEGER := 0;
  BEGIN
    -- Lógica de scoring basada en:
    -- - Interacciones con propiedades
    -- - Tiempo en plataforma
    -- - Formularios completados
    -- - Presupuesto indicado
    RETURN score;
  END;
  $$ LANGUAGE plpgsql;
  ```
- [ ] Crear API routes
  - `POST /api/leads` - Crear lead
  - `GET /api/leads` - Listar leads (con filtros)
  - `GET /api/leads/[id]` - Obtener lead con actividades
  - `PUT /api/leads/[id]` - Actualizar lead
  - `POST /api/leads/[id]/activities` - Agregar actividad
  - `GET /api/leads/analytics` - Analytics de leads

**Frontend (React + Next.js)**
- [ ] Crear página `/leads` o `/crm`
  - Lista de leads con filtros
  - Vista de kanban (nuevo, contactado, calificado, etc.)
  - Vista de tabla con sorting
- [ ] Crear componente `LeadCard.tsx`
  - Información del lead
  - Score visual
  - Acciones rápidas
- [ ] Crear componente `LeadDetail.tsx`
  - Información completa
  - Timeline de actividades
  - Formulario para agregar actividad
- [ ] Crear componente `LeadForm.tsx`
  - Formulario de captura de leads
  - Integración con formularios de contacto
- [ ] Crear componente `LeadScoring.tsx`
  - Visualización de score
  - Factores que afectan el score
- [ ] Agregar formulario de contacto en `PropertyDetail.tsx`

**Integración**
- [ ] Conectar con formularios de contacto existentes
- [ ] Integrar con sistema de propiedades (leads por propiedad)
- [ ] Conectar con sistema de chat (leads desde conversaciones)

**Testing**
- [ ] Tests para creación de leads
- [ ] Tests para cálculo de score
- [ ] Tests E2E para flujo completo de CRM

**Archivos a Crear/Modificar**
```
src/
├── app/
│   └── (dashboard)/
│       └── leads/
│           └── page.tsx                    # Nueva página
├── components/
│   └── crm/
│       ├── LeadCard.tsx                   # Nuevo componente
│       ├── LeadDetail.tsx                 # Nuevo componente
│       ├── LeadForm.tsx                   # Nuevo componente
│       ├── LeadScoring.tsx                # Nuevo componente
│       └── LeadKanban.tsx                 # Nuevo componente
├── components/
│   └── properties/
│       └── PropertyDetail.tsx            # Modificar (agregar formulario contacto)
├── app/
│   └── api/
│       └── leads/
│           ├── route.ts                  # Nueva API route
│           ├── [id]/
│           │   ├── route.ts              # Nueva API route
│           │   └── activities/
│           │       └── route.ts          # Nueva API route
│           └── analytics/
│               └── route.ts              # Nueva API route
└── supabase/
    └── migrations/
        └── YYYYMMDD_create_leads.sql
```

---

## 🚀 Fase 3: Scale Features (Meses 8-12)

### Objetivo
Funcionalidades avanzadas para escalar y abrir la plataforma a integraciones.

---

### 3.1 Market Insights Dashboard
**Prioridad**: 💡 Baja  
**Esfuerzo**: 4-5 semanas  
**Impacto**: Medio

#### Tareas Técnicas

**Backend (Supabase + CrewAI)**
- [ ] Crear tabla `pricewaze_market_insights`
  ```sql
  CREATE TABLE pricewaze_market_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zone_id UUID REFERENCES pricewaze_zones(id) ON DELETE CASCADE,
    insight_type TEXT NOT NULL, -- 'trend', 'forecast', 'comparison'
    title TEXT NOT NULL,
    description TEXT,
    data JSONB NOT NULL, -- {charts_data, metrics, etc}
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    valid_until TIMESTAMPTZ
  );
  ```
- [ ] Crear CrewAI crew `MarketInsightsCrew`
  - Analizar tendencias de mercado
  - Generar predicciones
  - Comparar zonas
- [ ] Crear API routes
  - `GET /api/insights/zones/[id]` - Insights de zona
  - `GET /api/insights/trends` - Tendencias generales
  - `GET /api/insights/forecast` - Predicciones

**Frontend (React + Next.js + Charts)**
- [ ] Crear página `/insights` o `/market`
  - Dashboard con múltiples widgets
  - Gráficos interactivos
  - Filtros por zona, tipo, período
- [ ] Crear componente `TrendChart.tsx`
  - Gráfico de líneas de precios en el tiempo
  - Usar `recharts` o `chart.js`
- [ ] Crear componente `MarketComparison.tsx`
  - Comparación de múltiples zonas
  - Gráficos de barras
- [ ] Crear componente `ForecastWidget.tsx`
  - Predicciones de precio
  - Intervalos de confianza
- [ ] Crear componente `NeighborhoodAnalysis.tsx`
  - Análisis detallado de vecindario
  - Métricas clave

**Integración**
- [ ] Conectar con datos históricos de propiedades
- [ ] Usar CrewAI para generar insights
- [ ] Integrar con sistema de zonas

**Archivos a Crear/Modificar**
```
src/
├── app/
│   └── (dashboard)/
│       └── insights/
│           └── page.tsx                   # Nueva página
├── components/
│   └── insights/
│       ├── TrendChart.tsx                # Nuevo componente
│       ├── MarketComparison.tsx          # Nuevo componente
│       ├── ForecastWidget.tsx             # Nuevo componente
│       └── NeighborhoodAnalysis.tsx       # Nuevo componente
├── crewai/
│   └── crews/
│       └── market_insights_crew.py       # Nuevo crew
└── app/
    └── api/
        └── insights/
            └── route.ts                  # Nueva API route
```

---

### 3.2 API REST Pública
**Prioridad**: 💡 Baja  
**Esfuerzo**: 3-4 semanas  
**Impacto**: Medio

#### Tareas Técnicas

**Backend (Next.js API Routes)**
- [ ] Crear sistema de autenticación API
  - API keys en tabla `pricewaze_api_keys`
  - Rate limiting por key
  - Scopes/permissions
- [ ] Crear documentación OpenAPI/Swagger
  - Usar `swagger-ui-react` o similar
  - Endpoints documentados
- [ ] Crear endpoints públicos
  - `GET /api/public/properties` - Listar propiedades públicas
  - `GET /api/public/properties/[id]` - Detalle de propiedad
  - `GET /api/public/zones` - Listar zonas
  - `GET /api/public/market-stats` - Estadísticas de mercado
- [ ] Implementar webhooks
  - `POST /api/webhooks` - Registrar webhook
  - Eventos: `property.created`, `property.updated`, `offer.created`
- [ ] Implementar rate limiting
  - Usar `@upstash/ratelimit` o similar
  - Diferentes límites por plan

**Frontend (React + Next.js)**
- [ ] Crear página `/api-docs` (pública)
  - Documentación interactiva
  - Ejemplos de código
  - Sandbox para probar endpoints
- [ ] Crear página `/dashboard/api-keys`
  - Gestión de API keys
  - Ver uso y límites
  - Regenerar keys

**Archivos a Crear/Modificar**
```
src/
├── app/
│   ├── api-docs/
│   │   └── page.tsx                      # Nueva página pública
│   └── api/
│       ├── public/
│       │   ├── properties/
│       │   │   └── route.ts              # Nueva API route
│       │   └── zones/
│       │       └── route.ts              # Nueva API route
│       └── webhooks/
│           └── route.ts                  # Nueva API route
├── lib/
│   └── api/
│       ├── auth.ts                       # Autenticación API
│       └── rateLimit.ts                  # Rate limiting
└── supabase/
    └── migrations/
        └── YYYYMMDD_create_api_keys.sql
```

---

## 📊 Resumen de Estimaciones

### Fase 1: MVP Plus (Meses 1-3)
| Funcionalidad | Esfuerzo | Prioridad |
|--------------|----------|-----------|
| Comparación de Propiedades | 2-3 semanas | 🔥 Alta |
| Alertas Inteligentes | 3-4 semanas | 🔥 Alta |
| Galería Mejorada | 2-3 semanas | 🔥 Alta |
| Reviews y Ratings | 2-3 semanas | 🔥 Alta |
| **Total Fase 1** | **9-13 semanas** | |

### Fase 2: Growth Features (Meses 4-7)
| Funcionalidad | Esfuerzo | Prioridad |
|--------------|----------|-----------|
| Chat en Tiempo Real | 4-5 semanas | ⚡ Media |
| Estimación Automática | 5-6 semanas | ⚡ Media |
| Heatmaps de Precios | 3-4 semanas | ⚡ Media |
| CRM Básico | 3-4 semanas | ⚡ Media |
| **Total Fase 2** | **15-19 semanas** | |

### Fase 3: Scale Features (Meses 8-12)
| Funcionalidad | Esfuerzo | Prioridad |
|--------------|----------|-----------|
| Market Insights | 4-5 semanas | 💡 Baja |
| API REST Pública | 3-4 semanas | 💡 Baja |
| **Total Fase 3** | **7-9 semanas** | |

**Total General**: 31-41 semanas (7.5-10 meses)

---

## 🛠️ Stack Tecnológico Adicional Necesario

### Librerías a Agregar

```json
{
  "dependencies": {
    // Chat en tiempo real
    "@supabase/supabase-js": "^2.x", // Ya existe, pero verificar versión
    
    // PDF Generation
    "jspdf": "^2.5.1",
    "html2canvas": "^1.4.1",
    
    // Charts
    "recharts": "^2.10.0",
    
    // Virtual Tours
    "react-360-view": "^1.0.0",
    
    // Notificaciones
    "react-hot-toast": "^2.4.1", // Ya existe
    
    // Rate Limiting
    "@upstash/ratelimit": "^1.0.0",
    "@upstash/redis": "^1.0.0",
    
    // API Documentation
    "swagger-ui-react": "^5.0.0"
  }
}
```

---

## 📝 Consideraciones Importantes

### Performance
- Implementar caché para estimaciones y heatmaps
- Usar React Query para data fetching (ya existe)
- Optimizar imágenes con Next.js Image (ya implementado)
- Lazy loading para componentes pesados

### Seguridad
- Validar todos los inputs con Zod (ya implementado)
- RLS policies en todas las tablas nuevas
- Rate limiting en APIs públicas
- Sanitizar contenido de reviews y mensajes

### Escalabilidad
- Considerar CDN para media (Supabase Storage)
- Usar background jobs para procesamiento pesado
- Implementar paginación en todas las listas
- Optimizar queries SQL con índices apropiados

### UX/UI
- Mantener consistencia con diseño actual
- Responsive en todos los componentes nuevos
- Loading states y error handling
- Accesibilidad (ARIA labels, keyboard navigation)

---

## ✅ Checklist de Inicio

Antes de comenzar cada fase:

- [ ] Revisar y actualizar dependencias
- [ ] Crear branch de feature
- [ ] Configurar migraciones de base de datos
- [ ] Establecer ambiente de testing
- [ ] Documentar decisiones de diseño
- [ ] Configurar monitoring/analytics

---

**Última actualización**: [Fecha]  
**Versión del plan**: 1.0

