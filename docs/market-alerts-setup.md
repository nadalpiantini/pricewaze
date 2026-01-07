# Market Alerts System - Setup Guide

Guía completa para configurar el sistema de alertas de mercado tipo Waze en PriceWaze.

## 📋 Requisitos Previos

- Supabase project configurado
- Migraciones aplicadas (`20260108000005_create_market_signals.sql`)
- `json-logic-js` instalado (ya está en `package.json`)

## 🔧 Configuración Paso a Paso

### 1. Habilitar Realtime en Supabase

El sistema necesita Realtime habilitado para las actualizaciones en vivo tipo Waze.

#### Opción A: Via Supabase Dashboard (Recomendado)

1. Ve a tu proyecto en Supabase Dashboard
2. Navega a **Database > Replication**
3. Busca la tabla `pricewaze_alert_events`
4. Habilita el toggle de **Realtime** para esta tabla

#### Opción B: Via SQL (Alternativa)

Si prefieres hacerlo por SQL, ejecuta:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE pricewaze_alert_events;
```

**Nota:** La migración intenta hacer esto automáticamente, pero si falla, usa el Dashboard.

### 2. Configurar Cron Job para Procesar Alertas

El sistema necesita ejecutar `/api/alerts/process` cada 15 minutos para evaluar reglas contra señales de mercado.

#### Opción A: Vercel Cron Jobs (Recomendado para Vercel)

Agrega esto a `vercel.json`:

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

**Autenticación:** El endpoint requiere:
- Header `x-vercel-signature` (automático en Vercel Cron)
- O token `INTERNAL_API_TOKEN` en header `Authorization: Bearer <token>`

Configura `INTERNAL_API_TOKEN` en Vercel Environment Variables si usas token.

#### Opción B: pg_cron (Si usas Supabase directamente)

Si tienes acceso a `pg_cron` en tu instancia de Supabase:

```sql
-- Primero, habilita la extensión (requiere permisos de superusuario)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Luego, programa el job
SELECT cron.schedule(
  'process-market-alerts',
  '*/15 * * * *', -- Cada 15 minutos
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT_ID.supabase.co/functions/v1/process-signals',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    )
  );
  $$
);
```

**Nota:** `pg_cron` requiere permisos especiales. Si no tienes acceso, usa Vercel Cron.

#### Opción C: External Cron Service

Puedes usar cualquier servicio de cron (cron-job.org, EasyCron, etc.) para hacer POST a:

```
POST https://your-domain.com/api/alerts/process
Authorization: Bearer YOUR_INTERNAL_API_TOKEN
```

### 3. Variables de Entorno

Asegúrate de tener estas variables configuradas:

```env
# Supabase (ya deberías tenerlas)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Opcional: Para autenticación del cron job
INTERNAL_API_TOKEN=your_secret_token
```

### 4. Verificar Instalación

#### Verificar Realtime

1. Abre la consola del navegador en tu app
2. Ve a la página `/alerts`
3. Deberías ver en la consola conexiones WebSocket a Supabase

#### Verificar Cron Job

1. Crea una regla de alerta en `/alerts`
2. Genera una señal de mercado manualmente (o espera a que se genere automáticamente)
3. Espera hasta 15 minutos
4. Deberías ver una alerta aparecer en tiempo real

#### Test Manual del Procesador

Puedes probar manualmente el procesador:

```bash
curl -X POST https://your-domain.com/api/alerts/process \
  -H "Authorization: Bearer YOUR_INTERNAL_API_TOKEN"
```

O desde el código:

```typescript
// En una consola o script de prueba
const response = await fetch('/api/alerts/process', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.INTERNAL_API_TOKEN}`
  }
});
```

## 🧪 Generar Señales de Prueba

Para probar el sistema, puedes generar señales manualmente:

```typescript
import { generatePriceDropSignal } from '@/lib/alerts/generateSignals';

// Ejemplo: Generar señal de caída de precio
await generatePriceDropSignal(
  'property-id',
  'zone-id',
  100000, // precio anterior
  95000   // precio nuevo (5% de caída)
);
```

O directamente en la base de datos:

```sql
INSERT INTO pricewaze_market_signals (
  zone_id,
  signal_type,
  severity,
  payload
) VALUES (
  'your-zone-id',
  'price_drop',
  'warning',
  '{"price_drop_pct": 7, "days": 45}'::jsonb
);
```

## 📊 Monitoreo

### Ver Alertas Generadas

```sql
SELECT 
  ae.id,
  ae.message,
  ae.severity,
  ae.read,
  ae.created_at,
  ar.name as rule_name
FROM pricewaze_alert_events ae
JOIN pricewaze_alert_rules ar ON ae.rule_id = ar.id
ORDER BY ae.created_at DESC
LIMIT 50;
```

### Ver Señales Recientes

```sql
SELECT 
  id,
  signal_type,
  severity,
  payload,
  created_at
FROM pricewaze_market_signals
ORDER BY created_at DESC
LIMIT 50;
```

### Ver Reglas Activas

```sql
SELECT 
  id,
  name,
  active,
  zone_id,
  created_at
FROM pricewaze_alert_rules
WHERE active = true;
```

## 🚨 Troubleshooting

### Las alertas no aparecen en tiempo real

1. **Verifica Realtime:** Ve a Supabase Dashboard > Database > Replication y confirma que `pricewaze_alert_events` está habilitado
2. **Verifica la conexión WebSocket:** Abre DevTools > Network > WS y busca conexiones a Supabase
3. **Verifica RLS:** Asegúrate de que las políticas RLS permiten al usuario ver sus alertas

### El cron job no procesa alertas

1. **Verifica logs:** Revisa los logs de Vercel o tu servicio de cron
2. **Verifica autenticación:** Confirma que el token `INTERNAL_API_TOKEN` está configurado correctamente
3. **Test manual:** Ejecuta el endpoint manualmente para verificar que funciona

### Las reglas no se disparan

1. **Verifica la regla:** Asegúrate de que la regla JSON Logic es válida
2. **Verifica el payload:** Confirma que el payload de la señal contiene los campos que la regla espera
3. **Verifica el cron:** Asegúrate de que el cron job está ejecutándose

## 📚 Recursos

- [JSON Logic Documentation](https://jsonlogic.com/)
- [Supabase Realtime Docs](https://supabase.com/docs/guides/realtime)
- [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs)
- [pg_cron Documentation](https://github.com/citusdata/pg_cron)

## ✅ Checklist de Setup

- [ ] Migraciones aplicadas
- [ ] Realtime habilitado para `pricewaze_alert_events`
- [ ] Cron job configurado (Vercel, pg_cron, o externo)
- [ ] Variables de entorno configuradas
- [ ] Test manual del procesador exitoso
- [ ] Señal de prueba generada y procesada
- [ ] Alerta apareció en tiempo real en la UI

---

**¿Problemas?** Revisa los logs y la sección de Troubleshooting. Si persisten, verifica que todas las dependencias estén instaladas y configuradas correctamente.

