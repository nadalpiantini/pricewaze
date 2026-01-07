# Market Alerts System - Waze-Style Real-Time Alerts

Sistema completo de alertas inteligentes tipo Waze para PriceWaze. Permite a los usuarios crear reglas personalizadas usando JSON Logic y recibir notificaciones en tiempo real cuando cambian las condiciones del mercado.

## 🎯 Características

- **Reglas Personalizables**: Los usuarios pueden crear alertas usando JSON Logic
- **Tiempo Real**: Alertas en vivo usando Supabase Realtime
- **Multi-Canal**: In-app, email, push (extensible)
- **Señales de Mercado**: Sistema automático de detección de cambios
- **UI Tipo Waze**: Feed visual con badges, colores por severidad

## 📋 Arquitectura

```
Market Events (Price Changes, New Listings)
        ↓
Market Signals (pricewaze_market_signals)
        ↓
Alert Rules Engine (JSON Logic Evaluation)
        ↓
Alert Events (pricewaze_alert_events)
        ↓
Supabase Realtime → Frontend (Waze-style feed)
```

## 🗄️ Base de Datos

### Tablas Principales

1. **pricewaze_market_signals**: Eventos de mercado (cambios de precio, inventario, tendencias)
2. **pricewaze_alert_rules**: Reglas personalizadas de usuarios (JSON Logic)
3. **pricewaze_alert_events**: Alertas disparadas
4. **pricewaze_notification_preferences**: Preferencias de notificación por usuario

Ver migración: `supabase/migrations/20260108000005_create_market_signals.sql`

## 🔧 Backend

### Evaluador de Reglas

```typescript
import { evaluateRule } from '@/lib/alerts/evaluateRule';

const rule = {
  and: [
    { '>': [{ var: 'price_drop_pct' }, 5] },
    { '<': [{ var: 'days' }, 90] },
  ],
};

const data = { price_drop_pct: 7, days: 45 };
const result = evaluateRule(rule, data); // { matches: true }
```

### Generar Señales

```typescript
import { generatePriceDropSignal } from '@/lib/alerts/generateSignals';

// Cuando cambia el precio de una propiedad
await generatePriceDropSignal(propertyId, zoneId, oldPrice, newPrice);
```

### Procesar Señales

El endpoint `/api/alerts/process` evalúa todas las reglas activas contra señales recientes. Debe ejecutarse cada 15 minutos vía cron.

**Ejemplo de cron (Vercel):**

```json
{
  "crons": [
    {
      "path": "/api/alerts/process",
      "schedule": "*/15 * * * *"
    }
  ]
}
```

O usando Supabase pg_cron:

```sql
SELECT cron.schedule(
  'process-market-alerts',
  '*/15 * * * *',
  $$ 
    SELECT net.http_post(
      url := 'https://YOUR_PROJECT.supabase.co/functions/v1/process-alerts',
      headers := '{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
    );
  $$
);
```

## 🎨 Frontend

### Hook de Alertas

```typescript
import { useMarketAlerts } from '@/hooks/useMarketAlerts';

function MyComponent() {
  const { alerts, unreadCount, markAsRead } = useMarketAlerts(userId);
  
  return (
    <div>
      {alerts.map(alert => (
        <div key={alert.id}>{alert.message}</div>
      ))}
    </div>
  );
}
```

### Componentes UI

- **MarketAlertsFeed**: Feed tipo Waze con alertas en tiempo real
- **AlertRuleBuilder**: Constructor visual de reglas

### Página

`/market-alerts` - Página completa de gestión de alertas

## 📝 Ejemplos de Reglas JSON Logic

### Precio Baja Más de 5% en 90 Días

```json
{
  "and": [
    { ">": [{ "var": "price_drop_pct" }, 5] },
    { "<": [{ "var": "days" }, 90] }
  ]
}
```

### Inventario Sube Más de 10%

```json
{
  ">": [{ "var": "inventory_change" }, 10]
}
```

### Tendencia Cambia (Score Negativo)

```json
{
  "<": [{ "var": "trend_score" }, -0.4]
}
```

### Zona Sube Precio Más de 5% en 3 Meses

```json
{
  "and": [
    { ">": [{ "var": "zone_price_change_pct" }, 5] },
    { "<": [{ "var": "days" }, 90] }
  ]
}
```

## 🔌 Integración con Triggers

Para generar señales automáticamente cuando cambian precios:

```sql
CREATE OR REPLACE FUNCTION generate_price_signal()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.price != NEW.price AND OLD.price > 0 THEN
    -- Llamar a función que genera señal
    -- (implementar en Edge Function o API route)
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER property_price_change
  AFTER UPDATE ON pricewaze_properties
  FOR EACH ROW
  WHEN (OLD.price IS DISTINCT FROM NEW.price)
  EXECUTE FUNCTION generate_price_signal();
```

## 🚀 Próximos Pasos

1. **Cron Job**: Configurar procesamiento automático cada 15 min
2. **Email Notifications**: Integrar Resend/SendGrid para emails
3. **Push Notifications**: Implementar Web Push API
4. **Tendencia Avanzada**: Integrar Prophet o análisis de series temporales
5. **UI Builder Avanzado**: Constructor visual de reglas sin JSON

## 📚 Referencias

- [JSON Logic Documentation](https://jsonlogic.com/)
- [Supabase Realtime](https://supabase.com/docs/guides/realtime)
- [Apache Flink CEP](https://nightlies.apache.org/flink/flink-docs-release-1.17/docs/libs/cep/) (para escala enterprise)

