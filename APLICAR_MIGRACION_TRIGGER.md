# 🔧 Aplicar Migración: Fix User Creation Trigger

## ✅ Estado
- ✅ Commit realizado
- ✅ Push realizado
- ⏳ Migración pendiente de aplicar

## 📋 Instrucciones para Aplicar la Migración

### Opción 1: Supabase Dashboard (Recomendado)

1. **Ir al Dashboard de Supabase**:
   - Ve a: https://supabase.com/dashboard
   - Selecciona tu proyecto (sujeto10)

2. **Abrir SQL Editor**:
   - En el menú lateral, haz clic en "SQL Editor"
   - Haz clic en "New query"

3. **Copiar y pegar el SQL**:
   - Abre el archivo: `supabase/migrations/20260110000003_fix_user_creation_trigger.sql`
   - Copia TODO el contenido
   - Pégalo en el SQL Editor

4. **Ejecutar**:
   - Haz clic en "Run" o presiona `Cmd+Enter` (Mac) / `Ctrl+Enter` (Windows)
   - Espera a que se complete

5. **Verificar**:
   - Deberías ver mensajes de éxito
   - El trigger debería estar actualizado

### Opción 2: Supabase CLI

Si tienes Supabase CLI instalado y el proyecto vinculado:

```bash
# Verificar que estás vinculado
supabase projects list

# Aplicar la migración
supabase db push

# O aplicar migración específica
supabase migration up
```

### Opción 3: psql Directo

Si tienes acceso directo a la base de datos:

```bash
# Obtener connection string desde Supabase Dashboard > Settings > Database
# Formato: postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres

psql "postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres" \
  -f supabase/migrations/20260110000003_fix_user_creation_trigger.sql
```

## 📄 Contenido de la Migración

La migración hace lo siguiente:

1. **Actualiza la función `pricewaze_handle_new_user()`**:
   - Añade manejo de errores robusto
   - Garantiza que NUNCA bloquee la creación de usuarios
   - Usa `SECURITY DEFINER` para bypass RLS

2. **Verifica que el trigger existe**:
   - Muestra un mensaje si el trigger no existe
   - El trigger debería existir de migraciones anteriores

3. **Actualiza políticas RLS**:
   - Elimina políticas conflictivas
   - Crea una política que permite inserts del trigger

4. **Otorga permisos necesarios**:
   - Permisos para el rol postgres
   - Permisos para insertar en `pricewaze_profiles`

## ✅ Verificación Post-Migración

Después de aplicar la migración, verifica:

1. **Crear un usuario de prueba**:
   ```typescript
   // En tu aplicación o script
   const { data, error } = await supabase.auth.signUp({
     email: 'test@example.com',
     password: 'Test123!'
   });
   ```

2. **Verificar que el perfil se creó**:
   ```sql
   SELECT * FROM pricewaze_profiles 
   WHERE email = 'test@example.com';
   ```

3. **Verificar que el trigger funciona**:
   - El usuario debería crearse sin errores
   - El perfil debería crearse automáticamente

## 🚨 Notas Importantes

- ⚠️ Esta migración NO crea el trigger si no existe
- ⚠️ Si el trigger no existe, necesitarás crearlo manualmente o contactar a Supabase support
- ✅ La función está diseñada para NUNCA bloquear la creación de usuarios
- ✅ Si la creación del perfil falla, el usuario se crea de todas formas

## 📝 SQL Completo

El SQL completo está en:
`supabase/migrations/20260110000003_fix_user_creation_trigger.sql`

---

**Fecha**: 10 de Enero, 2026  
**Commit**: `45c7551`  
**Estado**: Pendiente de aplicar manualmente

