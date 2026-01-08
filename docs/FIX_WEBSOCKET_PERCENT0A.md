# 🔧 Fix: WebSocket con `%0A` (salto de línea)

## 🚨 Problema

Si ves este error en la consola:

```
WebSocket connection to 'wss://xxx.supabase.co/realtime/v1/websocket?apikey=xxx%0A&vsn=1.0.0' failed
```

El `%0A` es un salto de línea (`\n`) codificado en la URL. Esto rompe los WebSockets.

---

## 🔍 Causa

**Next.js inyecta variables `NEXT_PUBLIC_*` en BUILD TIME**, no en runtime.

Si tu `.env.local` tenía un salto de línea cuando hiciste el build:

```env
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6...
<ENTER AQUÍ>
```

El salto de línea se **bakea en el bundle JavaScript** y queda ahí hasta que hagas un rebuild.

---

## ✅ Solución

### Paso 1: Limpia `.env.local`

Abre `.env.local` y asegúrate de que la API key esté en **UNA SOLA LÍNEA**:

```env
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

❌ **NO así:**
```
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
<ENTER>
```

### Paso 2: Verifica con el script

```bash
pnpm tsx scripts/verify-env-keys.ts
```

Debe mostrar: `✅ Todas las variables están correctas`

### Paso 3: **REBUILD OBLIGATORIO**

El código ya tiene protección con `cleanApiKey()`, pero **necesitas rebuild** porque el bundle viejo tiene el salto de línea hardcodeado.

**Para desarrollo:**
```bash
# Detén el servidor
# Borra .next
rm -rf .next

# Reinicia
pnpm dev
```

**Para producción (Vercel):**
```bash
# Hacer push y Vercel hará rebuild automático
git add .
git commit -m "fix: clean API keys to remove newlines"
git push
```

O desde Vercel Dashboard:
- Ve a tu proyecto
- **Deployments** → **Redeploy** (último deployment)

---

## 🛡️ Protección Aplicada

El código ahora tiene `cleanApiKey()` que elimina:
- `\r\n` (Windows line endings)
- `\n` (Unix line endings)
- `\r` (Mac line endings)
- Espacios al inicio/final

**Archivos protegidos:**
- `src/lib/supabase/client.ts`
- `src/lib/supabase/server.ts`
- `src/middleware.ts`
- `src/lib/env.ts`

---

## 🧪 Verificación Post-Fix

Después del rebuild, en DevTools Console:

1. **No deberías ver `%0A` en la URL del WebSocket**
2. **WebSocket debería conectar:**
   ```
   WebSocket connection to 'wss://xxx.supabase.co/realtime/v1/websocket?apikey=xxx&vsn=1.0.0'
   ```
   (Sin `%0A`)

3. **Si Realtime está configurado**, deberías ver:
   ```
   [Realtime] Connection established
   ```

---

## ⚠️ Si Persiste

Si después del rebuild sigues viendo `%0A`:

1. **Verifica que `.env.local` esté limpio:**
   ```bash
   cat .env.local | grep NEXT_PUBLIC_SUPABASE_ANON_KEY
   ```
   No debe haber saltos de línea visibles

2. **Verifica variables en Vercel:**
   - Ve a Vercel Dashboard → Tu proyecto → **Settings** → **Environment Variables**
   - Verifica que `NEXT_PUBLIC_SUPABASE_ANON_KEY` esté en una sola línea
   - Si tiene salto de línea, edítala y guarda

3. **Limpia cache del navegador:**
   - Hard refresh: `Cmd+Shift+R` (Mac) o `Ctrl+Shift+R` (Windows)
   - O desregistra Service Worker: DevTools → Application → Service Workers → Unregister

---

## 📚 Referencias

- [Next.js Environment Variables](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables)
- [Supabase Realtime WebSockets](https://supabase.com/docs/guides/realtime)

---

💪 **Después del rebuild, el problema debería estar resuelto.**
