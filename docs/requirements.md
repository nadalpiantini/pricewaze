# Requirements - PriceWaze

> Requisitos funcionales y no funcionales siguiendo metodolog铆a Edward Honour

## Functional Requirements

### M贸dulo: Autenticaci贸n (AUTH)

| ID | User Story | Acceptance Criteria | Status |
|----|------------|---------------------|--------|
| FR-AUTH-001 | Como usuario, quiero registrarme con email para acceder a la plataforma | Email v谩lido requerido, password 8+ chars, confirmaci贸n enviada | 鉁 |
| FR-AUTH-002 | Como usuario, quiero iniciar sesi贸n para acceder a mis datos | Login con email/password, redirect a dashboard | 鉁 |
| FR-AUTH-003 | Como usuario, quiero recuperar mi contrase帽a si la olvido | Email de recuperaci贸n, link v谩lido 24h | 鉁 |
| FR-AUTH-004 | Como usuario, quiero cerrar sesi贸n de forma segura | Clear session, redirect a login | 鉁 |

### M贸dulo: Propiedades (PROP)

| ID | User Story | Acceptance Criteria | Status |
|----|------------|---------------------|--------|
| FR-PROP-001 | Como comprador, quiero ver listado de propiedades disponibles | Grid/List view, pagination, filtros b谩sicos | 鉁 |
| FR-PROP-002 | Como comprador, quiero filtrar por precio, zona y tipo | Filtros combinables, resultados en tiempo real | 鉁 |
| FR-PROP-003 | Como comprador, quiero ver propiedades en un mapa | Mapbox con markers, clusters, zoom | 鉁 |
| FR-PROP-004 | Como comprador, quiero ver detalle de una propiedad | Gallery, specs, ubicaci贸n, historial | 鉁 |
| FR-PROP-005 | Como comprador, quiero guardar propiedades favoritas | Add/remove favorites, persistido | 鉁 |
| FR-PROP-006 | Como vendedor, quiero listar mi propiedad | Form con validaci贸n, upload fotos, geolocalizaci贸n | 鉁 |
| FR-PROP-007 | Como vendedor, quiero editar mi listado | Edici贸n inline, historial de cambios | 鈿 |

### M贸dulo: An谩lisis de Precios (PRICE)

| ID | User Story | Acceptance Criteria | Status |
|----|------------|---------------------|--------|
| FR-PRICE-001 | Como comprador, quiero saber si un precio es justo | Fairness score 0-100, comparables, justificaci贸n | 鉁 |
| FR-PRICE-002 | Como comprador, quiero sugerencias de oferta | 3 tiers (conservador, moderado, agresivo) | 鉁 |
| FR-PRICE-003 | Como vendedor, quiero conocer el valor de mercado de mi propiedad | Estimaci贸n basada en zona, tipo, tama帽o | 鉁 |
| FR-PRICE-004 | Como usuario, quiero an谩lisis de zona | Estad铆sticas, tendencias, comparables cercanos | 鉁 |

### M贸dulo: Ofertas (OFFER)

| ID | User Story | Acceptance Criteria | Status |
|----|------------|---------------------|--------|
| FR-OFFER-001 | Como comprador, quiero hacer una oferta en una propiedad | Form con monto, condiciones, expiraci贸n | 鉁 |
| FR-OFFER-002 | Como vendedor, quiero ver ofertas recibidas | Lista ordenada, filtros por estado | 鉁 |
| FR-OFFER-003 | Como vendedor, quiero aceptar/rechazar ofertas | Acci贸n con confirmaci贸n, notificaci贸n | 鉁 |
| FR-OFFER-004 | Como vendedor, quiero hacer contraofertas | Cadena de ofertas, historial visible | 鉁 |
| FR-OFFER-005 | Como usuario, quiero asistencia AI para negociar | Sugerencias contextuales, estrategias | 鉁 |

### M贸dulo: Visitas (VISIT)

| ID | User Story | Acceptance Criteria | Status |
|----|------------|---------------------|--------|
| FR-VISIT-001 | Como comprador, quiero agendar visita a una propiedad | Calendario, horarios disponibles | 鉁 |
| FR-VISIT-002 | Como vendedor, quiero confirmar/rechazar solicitudes de visita | Notificaci贸n, acci贸n r谩pida | 鉁 |
| FR-VISIT-003 | Como usuario, quiero verificar visita con GPS | Check-in geolocalizaci贸n, radius 100m | 鉁 |
| FR-VISIT-004 | Como usuario, quiero ver historial de visitas | Lista con estados, timestamps | 鉁 |

### M贸dulo: Contratos (CONTRACT)

| ID | User Story | Acceptance Criteria | Status |
|----|------------|---------------------|--------|
| FR-CONTRACT-001 | Como usuario, quiero generar contrato de compraventa | AI-generated, datos auto-filled | 鉁 |
| FR-CONTRACT-002 | Como usuario, quiero revisar t茅rminos legales | Highlights de cl谩usulas importantes | 鉁 |
| FR-CONTRACT-003 | Como usuario, quiero descargar contrato en PDF | Export funcional, formato legal | 鈿 |

---

## Non-Functional Requirements

### Performance (NFR-PERF)

| ID | Requisito | M茅trica | Target |
|----|-----------|---------|--------|
| NFR-PERF-001 | Tiempo de carga inicial | LCP | < 2.5s |
| NFR-PERF-002 | Interactividad | FID | < 100ms |
| NFR-PERF-003 | Estabilidad visual | CLS | < 0.1 |
| NFR-PERF-004 | Respuesta API | P95 latency | < 500ms |
| NFR-PERF-005 | AI pricing analysis | Response time | < 5s |
| NFR-PERF-006 | Mapa interactivo | Frame rate | 60fps |

### Security (NFR-SEC)

| ID | Requisito | Implementaci贸n |
|----|-----------|----------------|
| NFR-SEC-001 | Autenticaci贸n segura | Supabase Auth, JWT tokens |
| NFR-SEC-002 | Autorizaci贸n por recurso | RLS policies en todas las tablas |
| NFR-SEC-003 | Protecci贸n de datos | HTTPS obligatorio, env vars cifradas |
| NFR-SEC-004 | Input validation | Zod schemas en todos los endpoints |
| NFR-SEC-005 | Rate limiting | Vercel built-in + custom para AI |

### Scalability (NFR-SCALE)

| ID | Requisito | Target |
|----|-----------|--------|
| NFR-SCALE-001 | Usuarios concurrentes | 1,000 |
| NFR-SCALE-002 | Propiedades en DB | 100,000 |
| NFR-SCALE-003 | API requests/min | 10,000 |

### Availability (NFR-AVAIL)

| ID | Requisito | Target |
|----|-----------|--------|
| NFR-AVAIL-001 | Uptime | 99.9% |
| NFR-AVAIL-002 | Recovery time | < 5min |
| NFR-AVAIL-003 | Data backup | Daily, 30d retention |

### Usability (NFR-UX)

| ID | Requisito | Target |
|----|-----------|--------|
| NFR-UX-001 | Mobile responsive | 100% de features |
| NFR-UX-002 | Accessibility | WCAG 2.1 AA |
| NFR-UX-003 | Browser support | Chrome, Safari, Firefox (latest 2) |
| NFR-UX-004 | Onboarding completion | > 80% |

---

## Constraints

### T茅cnicas
- Supabase como 煤nico backend (proyecto compartido `sujeto10`)
- DeepSeek como AI provider (costo-efectivo)
- Vercel para hosting (integraci贸n con Next.js)

### Presupuesto
- API AI: $50/mes m谩ximo en MVP
- Supabase: Free tier hasta validaci贸n
- Mapbox: Free tier (50k loads/mes)

### Regulatorias
- GDPR compliance (datos de usuarios EU)
- Ley 172-13 (Protecci贸n datos RD)

### Temporales
- MVP: 4 semanas
- Beta launch: 6 semanas
- Production: 8 semanas

---

## MVP Scope (Must Haves)

- [x] Registro/Login de usuarios
- [x] Listado de propiedades con mapa
- [x] B煤squeda y filtros
- [x] An谩lisis de precio AI
- [x] Sistema de ofertas b谩sico
- [x] Visitas con GPS verification
- [ ] Generaci贸n de contratos

## Nice to Haves (Post-MVP)

- [ ] OAuth providers (Google, Apple)
- [ ] Push notifications
- [ ] Chat entre comprador/vendedor
- [ ] Comparador de propiedades
- [ ] Alertas de precio
- [ ] Multi-idioma (i18n)
- [ ] Mobile app (React Native)
- [ ] Integration MLS feeds
