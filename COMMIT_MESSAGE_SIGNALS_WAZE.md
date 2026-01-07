feat: sistema completo de señales tipo Waze con decaimiento y confirmación

Implementa sistema completo de señales comunitarias estilo Waze para propiedades:

🗄️ Base de Datos
- Tablas: pricewaze_property_signals_raw, pricewaze_property_signal_state
- Decaimiento temporal automático (0-7 días: 1.0, 8-14: 0.7, 15-30: 0.4, 30+: 0.1)
- Confirmación comunitaria (≥3 usuarios en 30 días)
- Triggers para recálculo automático y notificaciones
- Realtime habilitado para updates en vivo

🎨 Frontend
- PropertySignals: badges con colores (gris/rojo/verde según confirmación)
- PropertyMapWithSignals: mapa con pins dinámicos que cambian de color
- ReportSignalButtons: reporte rápido post-visita (Waze-style)
- useSignalAlerts: alertas en tiempo real cuando señales se confirman

📊 Catálogo de Señales (15 tipos)
- Sistema: high_activity, many_visits, competing_offers, long_time_on_market, recent_price_change
- Usuario negativas: noise, humidity, misleading_photos, poor_parking, security_concern, maintenance_needed, price_issue
- Usuario positivas: quiet_area, good_condition, transparent_listing

🔧 Backend
- API /api/signals/report: reportar señales post-visita
- API /api/signals/recalculate: recálculo manual con decay
- Validación Zod completa
- Cron job para recálculo periódico (cada 6 horas)

📚 Referencias Open-Source
- OSM Notes pattern (eventos crudos)
- GraphHopper aggregation (estado agregado)
- Elastic ML decay (decaimiento temporal)
- Discourse trust (confirmación comunitaria)
- Mapbox data-driven styling (pins dinámicos)

BREAKING CHANGE: Requiere migración 20260110000001_create_property_signals.sql ejecutada primero

