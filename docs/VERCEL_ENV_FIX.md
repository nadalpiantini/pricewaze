# 🔧 Fix: Variable de Entorno en Vercel con Salto de Línea

## 🚨 Problema

Si después del deploy sigues viendo `%0A` en la URL del WebSocket:

```
WebSocket connection to 'wss://xxx.supabase.co/realtime/v1/websocket?apikey=xxx%0A&vsn=1.0.0' failed
```

**Causa:** La variable `NEXT_PUBLIC_SUPABASE_ANON_KEY` en Vercel tiene un salto de línea.

---

## ✅ Solución: Limpiar Variable en Vercel

### Paso 1: Ve a Vercel Dashboard

1. Abre [Vercel Dashboard](https://vercel.com/dashboard)
2. Selecciona tu proyecto **pricewaze**
3. Ve a **Settings** → **Environment Variables**

### Paso 2: Encuentra la Variable

Busca `NEXT_PUBLIC_SUPABASE_ANON_KEY` en la lista.

### Paso 3: Edita la Variable

1. Haz clic en los **3 puntos** (⋯) al lado de la variable
2. Selecciona **Edit**
3. **COPIA** el valor completo (sin espacios al inicio/final)
4. **BORRA** todo el contenido del campo
5. **PEGA** el valor de nuevo (esto elimina saltos de línea ocultos)
6. **Verifica** que no haya espacios o saltos de línea visibles
7. Haz clic en **Save**

### Paso 4: Verifica el Formato

El valor debe verse así (todo en una línea):

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xemh4dWt1dm1kbHBld3F5dHB2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY2NTk0MDksImV4cCI6MjA2MjIzNTQwOX0.9raKtf_MAUoZ7lUOek4lazhWTfmxPvufW1-al82UHmk
```

❌ **NO debe tener:**
- Espacios al inicio
- Espacios al final
- Saltos de línea (ENTER)
- Retornos de carro

### Paso 5: Forzar Nuevo Deploy

Después de guardar:

1. Ve a **Deployments**
2. Encuentra el último deployment
3. Haz clic en los **3 puntos** (⋯)
4. Selecciona **Redeploy**
5. Espera a que complete el build

**O** simplemente haz un push vacío:

```bash
git commit --allow-empty -m "trigger: force redeploy after env var fix"
git push
```

---

## 🧪 Verificación Post-Fix

Después del redeploy, en DevTools Console:

1. **Hard refresh:** `Cmd+Shift+R` (Mac) o `Ctrl+Shift+R` (Windows)
2. **Verifica la URL del WebSocket:**
   - Debe ser: `wss://xxx.supabase.co/realtime/v1/websocket?apikey=xxx&vsn=1.0.0`
   - **NO debe tener** `%0A` al final

3. **Si Realtime está configurado**, deberías ver conexión exitosa

---

## 🔍 Alternativa: Usar Vercel CLI

Si prefieres usar la CLI:

```bash
# Instala Vercel CLI si no lo tienes
npm i -g vercel

# Login
vercel login

# Lista variables
vercel env ls

# Edita variable (esto abrirá editor)
vercel env pull .env.local

# Edita .env.local manualmente, luego:
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
# Pega el valor limpio cuando te lo pida
```

---

## ⚠️ Importante

- **Todas las variables `NEXT_PUBLIC_*` se inyectan en BUILD TIME**
- Si la variable tiene salto de línea, se bakea en el bundle
- **Siempre** verifica que el valor esté en una sola línea
- Después de editar, **siempre** haz redeploy

---

## 📚 Referencias

- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [Next.js Environment Variables](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables)

---

💪 **Después de limpiar la variable y redeploy, el `%0A` debería desaparecer.**
