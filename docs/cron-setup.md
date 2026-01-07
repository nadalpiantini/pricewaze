# Cron Job Setup - Market Alerts Processing

El sistema de alertas necesita un cron job que ejecute `/api/alerts/process` cada 15 minutos para evaluar señales y generar alertas.

## ✅ Opción 1: Vercel Cron Jobs (Recomendado)

Ya está configurado en `vercel.json`:

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

### Activar en Vercel

1. **Deploy a Vercel** (si no está deployado)
2. **Verificar en Dashboard**: Vercel detectará automáticamente el cron job
3. **Ver logs**: En Vercel Dashboard > Cron Jobs

### Verificación

El endpoint detecta automáticamente cuando es llamado por Vercel Cron (usa header `x-vercel-signature`).

## 🔄 Opción 2: Supabase pg_cron (Alternativa)

Si prefieres usar Supabase pg_cron:

### Requisitos

1. **Habilitar extensión pg_cron** en Supabase:
   ```sql
   -- En Supabase Dashboard > Database > Extensions
   -- O ejecutar:
   CREATE EXTENSION IF NOT EXISTS pg_cron;
   ```

2. **Configurar variables** (opcional, para usar en la función):
   ```sql
   -- Configurar URL y service role key
   ALTER DATABASE postgres SET app.settings.supabase_url = 'https://YOUR_PROJECT.supabase.co';
   -- Nota: No guardar service role key en la DB, mejor usar API route
   ```

3. **Ejecutar migración**:
   ```bash
   # La migración 20260108000006_setup_alert_cron.sql intentará configurar el cron
   # Si pg_cron no está disponible, mostrará un mensaje
   ```

### Configuración Manual de pg_cron

Si la migración automática no funciona:

```sql
-- 1. Verificar que pg_cron está habilitado
SELECT * FROM pg_extension WHERE extname = 'pg_cron';

-- 2. Eliminar job existente si existe
SELECT cron.unschedule('process-market-alerts');

-- 3. Crear nuevo job (cada 15 minutos)
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

**Nota**: Para usar pg_cron con Next.js API routes, necesitas:
- Crear una Supabase Edge Function que llame a tu API
- O usar el endpoint directamente con autenticación por token

## 🔐 Autenticación

El endpoint `/api/alerts/process` acepta:

1. **Vercel Cron**: Automático (detecta `x-vercel-signature` header)
2. **Token**: `Authorization: Bearer ${INTERNAL_API_TOKEN}`
   - Configurar `INTERNAL_API_TOKEN` en variables de entorno

### Configurar Token (Opcional)

Si quieres llamar el endpoint manualmente o desde otro servicio:

```bash
# En Vercel: Settings > Environment Variables
INTERNAL_API_TOKEN=tu_token_secreto_aqui
```

Luego llamar:
```bash
curl -X POST https://tu-app.vercel.app/api/alerts/process \
  -H "Authorization: Bearer tu_token_secreto_aqui"
```

## 🧪 Probar Manualmente

Puedes probar el endpoint manualmente:

```bash
# Con token (si está configurado)
curl -X POST http://localhost:3000/api/alerts/process \
  -H "Authorization: Bearer ${INTERNAL_API_TOKEN}"

# O desde código (para testing)
fetch('/api/alerts/process', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.INTERNAL_API_TOKEN}`
  }
})
```

## 📊 Monitoreo

### Vercel

- Dashboard > Cron Jobs > Ver ejecuciones y logs
- Cada ejecución muestra:
  - Status (success/error)
  - Tiempo de ejecución
  - Logs del endpoint

### Logs del Endpoint

El endpoint loggea:
- Número de señales procesadas
- Número de reglas evaluadas
- Número de alertas creadas

Ver logs en:
- Vercel Dashboard > Functions > `/api/alerts/process`
- O en tu sistema de logging

## ⚠️ Troubleshooting

### Cron no se ejecuta

1. **Verificar vercel.json**: Debe tener la sección `crons`
2. **Verificar deploy**: El cron se activa después del deploy
3. **Verificar schedule**: Formato cron válido (`*/15 * * * *` = cada 15 min)

### Errores 401 Unauthorized

1. **Vercel Cron**: Debe funcionar automáticamente
2. **Llamada manual**: Necesita `INTERNAL_API_TOKEN` en headers
3. **Verificar**: El endpoint loggea el error

### No se crean alertas

1. **Verificar señales**: Debe haber señales recientes en `pricewaze_market_signals`
2. **Verificar reglas**: Debe haber reglas activas en `pricewaze_alert_rules`
3. **Verificar evaluación**: Las reglas deben hacer match con las señales
4. **Ver logs**: El endpoint retorna estadísticas de procesamiento

## 📝 Notas

- **Frecuencia recomendada**: 15 minutos (balance entre tiempo real y carga)
- **Costo**: Vercel Cron Jobs son gratuitos en plan Hobby
- **Alternativas**: GitHub Actions, external cron services (cron-job.org, etc.)

