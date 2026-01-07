-- FIX DEFINITIVO DEL TRIGGER - NUNCA BLOQUEARÁ LA CREACIÓN DE USUARIOS
-- Esta migración asegura que el trigger sea completamente seguro

-- ============================================================================
-- PASO 1: Actualizar la función del trigger con máxima seguridad
-- ============================================================================

CREATE OR REPLACE FUNCTION pricewaze_handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- CAPA 1: Intentar crear el perfil, pero con manejo de errores completo
  -- Si falla, simplemente ignoramos y continuamos
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
    -- Capturar TODOS los errores posibles y ignorarlos silenciosamente
    WHEN unique_violation THEN
      NULL; -- Perfil ya existe, no hacer nada
    WHEN foreign_key_violation THEN
      NULL; -- Error de foreign key, ignorar
    WHEN check_violation THEN
      NULL; -- Error de constraint, ignorar
    WHEN insufficient_privilege THEN
      NULL; -- Error de permisos, ignorar
    WHEN OTHERS THEN
      NULL; -- Cualquier otro error, ignorar
  END;
  
  -- CAPA 2: SIEMPRE retornar NEW - esto es CRÍTICO
  -- Sin importar qué pase, debemos retornar NEW para permitir la creación del usuario
  RETURN NEW;
  
EXCEPTION
  -- CAPA 3: Última línea de defensa
  -- Incluso si algo catastrófico pasa, retornamos NEW
  WHEN OTHERS THEN
    RETURN NEW;
END;
$$;

-- ============================================================================
-- PASO 2: Asegurar políticas RLS que permitan inserts del trigger
-- ============================================================================

-- Eliminar políticas conflictivas
DROP POLICY IF EXISTS "Users can insert own profile" ON pricewaze_profiles;
DROP POLICY IF EXISTS "Trigger can insert profiles" ON pricewaze_profiles;
DROP POLICY IF EXISTS "Allow profile inserts" ON pricewaze_profiles;

-- Crear política única y comprensiva que permita:
-- 1. Usuarios insertando su propio perfil
-- 2. Trigger insertando perfiles (cuando el id existe en auth.users)
CREATE POLICY "Allow profile inserts" ON pricewaze_profiles 
  FOR INSERT 
  WITH CHECK (
    -- Permitir si el usuario está insertando su propio perfil
    auth.uid() = id
    OR
    -- Permitir si el id existe en auth.users (contexto del trigger)
    EXISTS (
      SELECT 1 
      FROM auth.users 
      WHERE auth.users.id = pricewaze_profiles.id
    )
  );

-- ============================================================================
-- PASO 3: Asegurar permisos necesarios
-- ============================================================================

-- La función corre como SECURITY DEFINER (rol postgres), así que tiene permisos
-- Pero nos aseguramos explícitamente
GRANT USAGE ON SCHEMA public TO postgres;
GRANT INSERT ON pricewaze_profiles TO postgres;

-- ============================================================================
-- PASO 4: Verificar que el trigger existe y está habilitado
-- ============================================================================

DO $$
DECLARE
  v_trigger_exists boolean;
  v_trigger_enabled boolean;
BEGIN
  -- Verificar si el trigger existe
  SELECT EXISTS(
    SELECT 1 
    FROM pg_trigger 
    WHERE tgname = 'pricewaze_on_auth_user_created'
    AND tgrelid = 'auth.users'::regclass
  ) INTO v_trigger_exists;
  
  -- Verificar si está habilitado
  SELECT EXISTS(
    SELECT 1 
    FROM pg_trigger 
    WHERE tgname = 'pricewaze_on_auth_user_created'
    AND tgrelid = 'auth.users'::regclass
    AND tgenabled = 'O'
  ) INTO v_trigger_enabled;
  
  IF NOT v_trigger_exists THEN
    RAISE NOTICE '⚠️  Trigger pricewaze_on_auth_user_created no existe.';
    RAISE NOTICE '   El trigger debería existir de migraciones anteriores.';
    RAISE NOTICE '   Si no existe, puede necesitarse crear manualmente o contactar a Supabase support.';
  ELSE
    RAISE NOTICE '✅ Trigger existe';
  END IF;
  
  IF v_trigger_exists AND NOT v_trigger_enabled THEN
    RAISE NOTICE '⚠️  Trigger existe pero está deshabilitado.';
    RAISE NOTICE '   Para habilitarlo, ejecuta: ALTER TABLE auth.users ENABLE TRIGGER pricewaze_on_auth_user_created;';
  ELSIF v_trigger_enabled THEN
    RAISE NOTICE '✅ Trigger está habilitado';
  END IF;
END $$;

-- ============================================================================
-- PASO 5: Comentario en la función para documentación
-- ============================================================================

COMMENT ON FUNCTION pricewaze_handle_new_user() IS 
'FUNCIÓN SEGURA: Crea un perfil cuando se crea un nuevo usuario. 
Diseñada para NUNCA bloquear la creación de usuarios, incluso si la creación del perfil falla.
Usa múltiples capas de manejo de errores y siempre retorna NEW.
Versión definitiva - 2026-01-10';

-- ============================================================================
-- VERIFICACIÓN FINAL
-- ============================================================================

-- Mostrar el código de la función para verificar
SELECT 
  proname as function_name,
  LEFT(prosrc, 500) as function_preview,
  prosecdef as security_definer
FROM pg_proc 
WHERE proname = 'pricewaze_handle_new_user';

-- Mostrar políticas de inserción
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename = 'pricewaze_profiles' 
AND cmd = 'INSERT';

