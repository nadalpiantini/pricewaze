# 🔌 Configuración de Supabase Realtime

Esta guía te ayuda a verificar que Realtime esté configurado correctamente para que los WebSockets funcionen.

---

## ✅ Checklist de Verificación

### 1. Variables de Entorno

**Ejecuta el script de verificación:**

```bash
pnpm tsx scripts/verify-env-keys.ts
```

**O verifica manualmente:**

Abre `.env.local` y asegúrate de que:

```env
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6...
```

❌ **NO así:**
```
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6...
<ENTER AQUÍ>
```

💡 **Regla de oro:** La API key debe estar en **UNA SOLA LÍNEA** sin saltos de línea.

---

### 2. Supabase Dashboard - Replication

1. Ve a **Supabase Dashboard** → Tu proyecto
2. **Database** → **Replication**
3. Verifica que **Realtime** esté **ON** ✅

Si está OFF:
- Actívalo
- Espera 1-2 minutos
- Reinicia tu aplicación

---

### 3. Tablas con Realtime

Las siguientes tablas deben tener Realtime habilitado:

- `pricewaze_property_signal_state` - Señales de propiedades
- `pricewaze_property_follows` - Seguimientos de propiedades
- `pricewaze_alert_events` - Alertas de mercado
- `pricewaze_notifications` - Notificaciones

**Para verificar:**

1. **Database** → **Replication**
2. Busca cada tabla en la lista
3. Verifica que el toggle esté **ON** ✅

---

### 4. REPLICA IDENTITY

Las tablas que usan Realtime deben tener `REPLICA IDENTITY FULL`:

```sql
-- Ejecuta en Supabase SQL Editor
ALTER TABLE pricewaze_property_signal_state REPLICA IDENTITY FULL;
ALTER TABLE pricewaze_property_follows REPLICA IDENTITY FULL;
ALTER TABLE pricewaze_alert_events REPLICA IDENTITY FULL;
ALTER TABLE pricewaze_notifications REPLICA IDENTITY FULL;
```

**Para verificar:**

```sql
SELECT 
  schemaname,
  tablename,
  CASE 
    WHEN relreplident = 'd' THEN 'DEFAULT'
    WHEN relreplident = 'n' THEN 'NOTHING'
    WHEN relreplident = 'f' THEN 'FULL'
    WHEN relreplident = 'i' THEN 'INDEX'
  END as replica_identity
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN (
    'pricewaze_property_signal_state',
    'pricewaze_property_follows',
    'pricewaze_alert_events',
    'pricewaze_notifications'
  );
```

**Resultado esperado:** Todas deben mostrar `FULL`.

---

### 5. Row Level Security (RLS)

Las tablas deben tener políticas RLS que permitan `SELECT`:

**Ejemplo mínimo:**

```sql
-- Para pricewaze_property_signal_state
CREATE POLICY "public read signals"
ON pricewaze_property_signal_state
FOR SELECT
USING (true);

-- Para pricewaze_property_follows
CREATE POLICY "public read follows"
ON pricewaze_property_follows
FOR SELECT
USING (true);

-- Para pricewaze_alert_events
CREATE POLICY "users read own alerts"
ON pricewaze_alert_events
FOR SELECT
USING (auth.uid() = user_id);

-- Para pricewaze_notifications
CREATE POLICY "users read own notifications"
ON pricewaze_notifications
FOR SELECT
USING (auth.uid() = user_id);
```

**Para verificar:**

```sql
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'pricewaze_property_signal_state',
    'pricewaze_property_follows',
    'pricewaze_alert_events',
    'pricewaze_notifications'
  )
  AND cmd = 'SELECT';
```

**Resultado esperado:** Debe haber al menos una política `SELECT` por tabla.

---

## 🧪 Prueba de Conexión

### En el navegador (DevTools Console):

```javascript
// Abre la consola del navegador
const supabase = window.__SUPABASE_CLIENT__; // O importa desde tu código

const channel = supabase
  .channel('test-channel')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'pricewaze_property_signal_state',
  }, (payload) => {
    console.log('✅ Realtime funcionando!', payload);
  })
  .subscribe((status) => {
    console.log('Estado del canal:', status);
    if (status === 'SUBSCRIBED') {
      console.log('✅ Conectado a Realtime');
    } else if (status === 'CHANNEL_ERROR') {
      console.error('❌ Error de conexión');
    }
  });
```

**Resultado esperado:**
- `Estado del canal: SUBSCRIBED` ✅
- Si ves `CHANNEL_ERROR` o `TIMED_OUT`, revisa los pasos anteriores

---

## 🔧 Troubleshooting

### Error: `WebSocket connection failed`

**Causa:** API key con salto de línea (`%0A`)

**Solución:**
1. Ejecuta `pnpm tsx scripts/verify-env-keys.ts`
2. Sigue las instrucciones del script
3. Reinicia el servidor

---

### Error: `CHANNEL_ERROR` o `TIMED_OUT`

**Causas posibles:**
1. Realtime no está habilitado en Dashboard
2. Tabla no tiene `REPLICA IDENTITY FULL`
3. Falta política RLS `SELECT`

**Solución:**
1. Verifica Dashboard → Database → Replication
2. Ejecuta los SQL de `REPLICA IDENTITY`
3. Verifica/crea políticas RLS

---

### WebSocket conecta pero no recibe eventos

**Causa:** Falta `REPLICA IDENTITY FULL` o política RLS

**Solución:**
1. Ejecuta los SQL de `REPLICA IDENTITY`
2. Verifica políticas RLS con el query de arriba

---

## 📚 Referencias

- [Supabase Realtime Docs](https://supabase.com/docs/guides/realtime)
- [PostgreSQL REPLICA IDENTITY](https://www.postgresql.org/docs/current/sql-altertable.html#SQL-ALTERTABLE-REPLICA-IDENTITY)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)

---

## ✅ Checklist Final

Antes de considerar Realtime "blindado":

- [ ] Variables de entorno verificadas (sin saltos de línea)
- [ ] Realtime ON en Dashboard
- [ ] Tablas con Realtime habilitado
- [ ] `REPLICA IDENTITY FULL` en todas las tablas
- [ ] Políticas RLS `SELECT` configuradas
- [ ] Prueba de conexión exitosa en consola

---

💪 **Cuando todo esté verde, Realtime está blindado.**
