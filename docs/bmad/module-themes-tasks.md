# Module → Theme → Task Mapping

> Estructura jerarquica siguiendo metodologia Edward Honour para desarrollo SaaS

---

## Hierarchia de Trabajo

```
Module (Dominio)
└── Theme (Objetivo de usuario)
    └── Task (Accion atomica)
```

**Definiciones**:
- **Module**: Dominio funcional de la aplicacion (AUTH, PROP, MAP, etc.)
- **Theme**: Objetivo o resultado que el usuario quiere lograr
- **Task**: Accion atomica completable en una sesion de trabajo

---

## AUTH - Autenticacion

### Theme: User Registration
**Objetivo**: Usuario puede crear una cuenta nueva

| Task ID | Descripcion | Status | Archivos |
|---------|-------------|--------|----------|
| AUTH-001-T1 | Form de registro con validacion | ✅ Done | `(auth)/register/page.tsx` |
| AUTH-001-T2 | Integracion Supabase signUp | ✅ Done | `lib/supabase/client.ts` |
| AUTH-001-T3 | Redirect post-registro | ✅ Done | `(auth)/register/page.tsx` |

### Theme: User Login
**Objetivo**: Usuario puede iniciar sesion

| Task ID | Descripcion | Status | Archivos |
|---------|-------------|--------|----------|
| AUTH-002-T1 | Form de login | ✅ Done | `(auth)/login/page.tsx` |
| AUTH-002-T2 | Integracion Supabase signIn | ✅ Done | `lib/supabase/client.ts` |
| AUTH-002-T3 | Middleware de proteccion | ✅ Done | `middleware.ts` |

### Theme: User Session Management
**Objetivo**: Usuario mantiene sesion activa

| Task ID | Descripcion | Status | Archivos |
|---------|-------------|--------|----------|
| AUTH-003-T1 | Auth store (Zustand) | ✅ Done | `stores/auth-store.ts` |
| AUTH-003-T2 | Session refresh automatico | ✅ Done | `providers.tsx` |
| AUTH-003-T3 | Logout con cleanup | ✅ Done | `auth-store.ts` |

---

## PROP - Propiedades

### Theme: Property Listing
**Objetivo**: Usuario puede ver listado de propiedades

| Task ID | Descripcion | Status | Archivos |
|---------|-------------|--------|----------|
| PROP-001-T1 | Grid view de propiedades | ✅ Done | `properties/page.tsx` |
| PROP-001-T2 | Filtros basicos | ✅ Done | `PropertyFilters.tsx` |
| PROP-001-T3 | Paginacion | ✅ Done | `api/properties/` |

### Theme: Property Detail
**Objetivo**: Usuario puede ver detalles de una propiedad

| Task ID | Descripcion | Status | Archivos |
|---------|-------------|--------|----------|
| PROP-002-T1 | Pagina de detalle | ✅ Done | `properties/[id]/page.tsx` |
| PROP-002-T2 | Galeria de imagenes | ✅ Done | `PropertyGallery.tsx` |
| PROP-002-T3 | Info de zona | ✅ Done | `PropertyZoneInfo.tsx` |

### Theme: Property Creation
**Objetivo**: Usuario puede publicar una propiedad

| Task ID | Descripcion | Status | Archivos |
|---------|-------------|--------|----------|
| PROP-003-T1 | Form de creacion | ✅ Done | `properties/new/page.tsx` |
| PROP-003-T2 | Upload de imagenes | ✅ Done | `ImageUploader.tsx` |
| PROP-003-T3 | Geocoding de direccion | ✅ Done | `api/properties/` |

### Theme: Property Favorites
**Objetivo**: Usuario puede guardar propiedades favoritas

| Task ID | Descripcion | Status | Archivos |
|---------|-------------|--------|----------|
| PROP-004-T1 | Toggle favorito | ✅ Done | `FavoriteButton.tsx` |
| PROP-004-T2 | Lista de favoritos | ✅ Done | `favorites/page.tsx` |
| PROP-004-T3 | Store persistido | ✅ Done | `property-store.ts` |

---

## MAP - Mapas y Geolocalizacion

### Theme: Property Map View
**Objetivo**: Usuario puede ver propiedades en mapa

| Task ID | Descripcion | Status | Archivos |
|---------|-------------|--------|----------|
| MAP-001-T1 | Mapa con marcadores | ✅ Done | `PropertyMap.tsx` |
| MAP-001-T2 | Popups de propiedad | ✅ Done | `PropertyMapPopup.tsx` |
| MAP-001-T3 | Clustering | ✅ Done | `PropertyMap.tsx` |

### Theme: Zone Visualization
**Objetivo**: Usuario puede ver zonas geograficas

| Task ID | Descripcion | Status | Archivos |
|---------|-------------|--------|----------|
| MAP-002-T1 | Polygonos de zona | ✅ Done | `ZonePolygon.tsx` |
| MAP-002-T2 | Heat map de precios | ✅ Done | `PriceHeatmap.tsx` |
| MAP-002-T3 | Zone stats popup | ✅ Done | `ZoneStatsPopup.tsx` |

---

## PRICE - Analisis de Precios AI

### Theme: Fairness Scoring
**Objetivo**: Usuario puede ver si un precio es justo

| Task ID | Descripcion | Status | Archivos |
|---------|-------------|--------|----------|
| PRICE-001-T1 | Calculo de fairness | ✅ Done | `lib/ai/pricing.ts` |
| PRICE-001-T2 | UI de fairness score | ✅ Done | `FairnessPanel.tsx` |
| PRICE-001-T3 | Comparables de zona | ✅ Done | `ComparableProperties.tsx` |

### Theme: Offer Suggestions
**Objetivo**: Usuario recibe sugerencias de oferta

| Task ID | Descripcion | Status | Archivos |
|---------|-------------|--------|----------|
| PRICE-002-T1 | Generacion de tiers | ✅ Done | `lib/ai/pricing.ts` |
| PRICE-002-T2 | UI de sugerencias | ✅ Done | `OfferSuggestions.tsx` |
| PRICE-002-T3 | Justificacion AI | ✅ Done | `PricingRationale.tsx` |

---

## OFFER - Sistema de Ofertas

### Theme: Offer Creation
**Objetivo**: Usuario puede crear una oferta

| Task ID | Descripcion | Status | Archivos |
|---------|-------------|--------|----------|
| OFFER-001-T1 | Form de oferta | ✅ Done | `OfferForm.tsx` |
| OFFER-001-T2 | Validacion de monto | ✅ Done | `api/offers/route.ts` |
| OFFER-001-T3 | Confirmacion | ✅ Done | `OfferConfirmation.tsx` |

### Theme: Offer Negotiation
**Objetivo**: Usuario puede negociar una oferta

| Task ID | Descripcion | Status | Archivos |
|---------|-------------|--------|----------|
| OFFER-002-T1 | Counter-offer flow | ✅ Done | `CounterOfferForm.tsx` |
| OFFER-002-T2 | Timeline de negociacion | ✅ Done | `NegotiationTimeline.tsx` |
| OFFER-002-T3 | Accept/Reject actions | ✅ Done | `OfferActions.tsx` |

### Theme: Offer History
**Objetivo**: Usuario puede ver historial de ofertas

| Task ID | Descripcion | Status | Archivos |
|---------|-------------|--------|----------|
| OFFER-003-T1 | Lista de ofertas | ✅ Done | `offers/page.tsx` |
| OFFER-003-T2 | Filtros por estado | ✅ Done | `OfferFilters.tsx` |
| OFFER-003-T3 | Exportar historial | ⏳ Pending | - |

---

## VISIT - Visitas y Verificacion

### Theme: Visit Scheduling
**Objetivo**: Usuario puede agendar visitas

| Task ID | Descripcion | Status | Archivos |
|---------|-------------|--------|----------|
| VISIT-001-T1 | Calendario de visitas | ✅ Done | `VisitCalendar.tsx` |
| VISIT-001-T2 | Seleccion de slots | ✅ Done | `TimeSlotPicker.tsx` |
| VISIT-001-T3 | Confirmacion | ✅ Done | `VisitConfirmation.tsx` |

### Theme: Visit Verification
**Objetivo**: Sistema verifica que visita ocurrio

| Task ID | Descripcion | Status | Archivos |
|---------|-------------|--------|----------|
| VISIT-002-T1 | GPS verification | ✅ Done | `api/visits/[id]/verify/` |
| VISIT-002-T2 | Photo evidence | ✅ Done | `VisitPhotoUpload.tsx` |
| VISIT-002-T3 | Badge de verificacion | ✅ Done | `VerifiedVisitBadge.tsx` |

### Theme: Visit Routes
**Objetivo**: Usuario puede planificar rutas de visitas

| Task ID | Descripcion | Status | Archivos |
|---------|-------------|--------|----------|
| VISIT-003-T1 | Crear ruta | ✅ Done | `routes/page.tsx` |
| VISIT-003-T2 | Optimizar orden | ✅ Done | `api/routes/[id]/optimize/` |
| VISIT-003-T3 | Navegacion en mapa | ✅ Done | `RouteMap.tsx` |

---

## CONTRACT - Contratos AI

### Theme: Contract Generation
**Objetivo**: Usuario puede generar contrato de compra

| Task ID | Descripcion | Status | Archivos |
|---------|-------------|--------|----------|
| CONTRACT-001-T1 | Template selection | ✅ Done | `ContractTemplates.tsx` |
| CONTRACT-001-T2 | AI generation | ✅ Done | `lib/ai/contracts.ts` |
| CONTRACT-001-T3 | Preview UI | ⏳ WIP | `ContractPreview.tsx` |
| CONTRACT-001-T4 | Export PDF | ⏳ Pending | - |

### Theme: Contract Review
**Objetivo**: Usuario puede revisar contrato con AI

| Task ID | Descripcion | Status | Archivos |
|---------|-------------|--------|----------|
| CONTRACT-002-T1 | Clause highlighting | ⏳ Pending | - |
| CONTRACT-002-T2 | Risk indicators | ⏳ Pending | - |
| CONTRACT-002-T3 | Suggestions panel | ⏳ Pending | - |

---

## CREW - Multi-Agent System

### Theme: Analysis Workflows
**Objetivo**: Sistema ejecuta analisis multi-agente

| Task ID | Descripcion | Status | Archivos |
|---------|-------------|--------|----------|
| CREW-001-T1 | PricingCrew setup | ✅ Done | `crewai/crews/pricing.py` |
| CREW-001-T2 | NegotiationCrew | ✅ Done | `crewai/crews/negotiation.py` |
| CREW-001-T3 | ContractCrew | ✅ Done | `crewai/crews/contracts.py` |
| CREW-001-T4 | FullAnalysisCrew | ✅ Done | `crewai/crews/full.py` |

### Theme: API Integration
**Objetivo**: Frontend puede invocar CrewAI

| Task ID | Descripcion | Status | Archivos |
|---------|-------------|--------|----------|
| CREW-002-T1 | /api/crewai/pricing | ✅ Done | `api/crewai/pricing/` |
| CREW-002-T2 | /api/crewai/negotiation | ✅ Done | `api/crewai/negotiation/` |
| CREW-002-T3 | /api/crewai/contracts | ✅ Done | `api/crewai/contracts/` |
| CREW-002-T4 | /api/crewai/analysis | ✅ Done | `api/crewai/analysis/` |

---

## ALERTS - Alertas y Senales

### Theme: Market Alerts
**Objetivo**: Usuario recibe alertas de mercado

| Task ID | Descripcion | Status | Archivos |
|---------|-------------|--------|----------|
| ALERTS-001-T1 | Alert feed UI | ✅ Done | `MarketAlertsFeed.tsx` |
| ALERTS-001-T2 | Rule builder | ✅ Done | `AlertRuleBuilder.tsx` |
| ALERTS-001-T3 | i18n support | ✅ Done | `alerts/page.tsx` |

### Theme: Saved Searches
**Objetivo**: Usuario puede guardar busquedas

| Task ID | Descripcion | Status | Archivos |
|---------|-------------|--------|----------|
| ALERTS-002-T1 | Save search flow | ✅ Done | `SavedSearches.tsx` |
| ALERTS-002-T2 | Notification on match | ✅ Done | `api/alerts/` |
| ALERTS-002-T3 | Manage searches | ✅ Done | `SavedSearches.tsx` |

---

## COPILOT - AI Assistant

### Theme: Chat Interface
**Objetivo**: Usuario puede chatear con AI

| Task ID | Descripcion | Status | Archivos |
|---------|-------------|--------|----------|
| COPILOT-001-T1 | Chat UI | ✅ Done | `CopilotPanel.tsx` |
| COPILOT-001-T2 | Message history | ✅ Done | `CopilotMessages.tsx` |
| COPILOT-001-T3 | Context awareness | ✅ Done | `api/copilot/chat/` |

### Theme: Negotiation Assistance
**Objetivo**: AI ayuda en negociaciones

| Task ID | Descripcion | Status | Archivos |
|---------|-------------|--------|----------|
| COPILOT-002-T1 | Offer advice | ✅ Done | `api/copilot/negotiate/` |
| COPILOT-002-T2 | Counter suggestions | ✅ Done | `NegotiationCoherencePanel.tsx` |
| COPILOT-002-T3 | Proactive alerts | ✅ Done | `api/copilot/alerts/` |

---

## Metricas de Completitud

| Modulo | Themes | Tasks Done | Tasks Total | % |
|--------|--------|------------|-------------|---|
| AUTH | 3 | 9 | 9 | 100% |
| PROP | 4 | 12 | 12 | 100% |
| MAP | 2 | 6 | 6 | 100% |
| PRICE | 2 | 6 | 6 | 100% |
| OFFER | 3 | 8 | 9 | 89% |
| VISIT | 3 | 9 | 9 | 100% |
| CONTRACT | 2 | 2 | 7 | 29% |
| CREW | 2 | 8 | 8 | 100% |
| ALERTS | 2 | 6 | 6 | 100% |
| COPILOT | 2 | 6 | 6 | 100% |
| **TOTAL** | **25** | **72** | **78** | **92%** |

---

## Proximo Trabajo

### Prioridad Alta
1. CONTRACT-001-T3: Preview UI
2. CONTRACT-001-T4: Export PDF

### Prioridad Media
3. OFFER-003-T3: Export historial
4. CONTRACT-002-*: Contract Review theme

---

*Ultima actualizacion: 2026-01-08*
