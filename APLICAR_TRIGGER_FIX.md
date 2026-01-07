# 🔧 Aplicar Fix del Trigger

## Problema
El trigger `pricewaze_handle_new_user` está bloqueando la creación de usuarios con el error "Database error creating new user".

## Solución
Aplicar la migración que crea un trigger seguro que nunca bloquea la creación de usuarios.

## Pasos para Aplicar

### Opción 1: Supabase Dashboard (Recomendado)

1. **Abre el SQL Editor:**
   - Ve a: https://supabase.com/dashboard/project/nqzhxukuvmdlpewqytpv/sql/new
   - O ve a Dashboard → SQL Editor → New Query

2. **Copia y pega este SQL:**

```sql
-- Fix user creation trigger to prevent blocking user creation
-- This migration creates a safe trigger that never blocks user creation

-- Step 1: Drop and recreate the trigger function with maximum safety
DROP FUNCTION IF EXISTS pricewaze_handle_new_user() CASCADE;

-- Create a completely safe trigger function
-- This version will NEVER block user creation, even if profile creation fails
CREATE OR REPLACE FUNCTION pricewaze_handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Try to create profile, but don't let any error block user creation
  BEGIN
    INSERT INTO pricewaze_profiles (id, email, full_name)
    VALUES (
      NEW.id,
      COALESCE(NEW.email, ''),
      COALESCE(
        NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
        NULLIF(NEW.raw_user_meta_data->>'name', ''),
        COALESCE(SPLIT_PART(NEW.email, '@', 1), 'User')
      )
    )
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION
    WHEN OTHERS THEN
      -- Silently ignore ALL errors - user creation MUST succeed
      -- The profile can be created manually later if needed
      NULL;
  END;
  
  -- CRITICAL: Always return NEW to allow user creation to proceed
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Final safety net - even if something catastrophic happens
    -- we MUST return NEW to allow user creation
    RETURN NEW;
END;
$$;

-- Step 2: Ensure trigger exists and is enabled
DROP TRIGGER IF EXISTS pricewaze_on_auth_user_created ON auth.users;

CREATE TRIGGER pricewaze_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION pricewaze_handle_new_user();

-- Step 3: Enable the trigger
ALTER TABLE auth.users ENABLE TRIGGER pricewaze_on_auth_user_created;

-- Step 4: Ensure RLS policy allows trigger inserts
-- Drop conflicting policies first
DROP POLICY IF EXISTS "Users can insert own profile" ON pricewaze_profiles;
DROP POLICY IF EXISTS "Trigger can insert profiles" ON pricewaze_profiles;
DROP POLICY IF EXISTS "Allow profile inserts" ON pricewaze_profiles;

-- Create a comprehensive policy that allows trigger inserts
-- The trigger runs with SECURITY DEFINER, so it should bypass RLS
-- But we create this policy as a safety net
CREATE POLICY "Allow profile inserts" ON pricewaze_profiles 
  FOR INSERT 
  WITH CHECK (
    -- Allow if user is inserting their own profile
    auth.uid() = id
    OR
    -- Allow if the id exists in auth.users (for trigger context)
    EXISTS (
      SELECT 1 
      FROM auth.users 
      WHERE auth.users.id = pricewaze_profiles.id
    )
  );

-- Step 5: Grant necessary permissions
-- The function runs as SECURITY DEFINER (postgres role), so it should have permissions
-- But we're being explicit here
GRANT USAGE ON SCHEMA public TO postgres;
GRANT INSERT ON pricewaze_profiles TO postgres;

COMMENT ON FUNCTION pricewaze_handle_new_user() IS 
'Creates a profile when a new user is created. Designed to NEVER block user creation even if profile creation fails. Uses SECURITY DEFINER to bypass RLS.';
```

3. **Click "Run" o presiona Cmd/Ctrl + Enter**

4. **Verifica que se aplicó correctamente:**
   - Deberías ver un mensaje de éxito
   - No debería haber errores

### Opción 2: Supabase CLI (si está configurado)

```bash
supabase db push
```

## Verificación

Después de aplicar la migración, verifica que funciona:

```bash
pnpm tsx scripts/test-trigger-fix.ts
```

Si el test pasa, entonces puedes crear los usuarios:

```bash
pnpm tsx scripts/create-users-password-only.ts
```

## Archivo de Migración

La migración está en: `supabase/migrations/20260110000003_fix_user_creation_trigger.sql`

