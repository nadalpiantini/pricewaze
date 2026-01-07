-- FIX DEFINITIVO: Actualizar función del trigger para que NUNCA bloquee usuarios
-- Esta es la versión final y segura de la función

CREATE OR REPLACE FUNCTION pricewaze_handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Intentar crear perfil, pero NUNCA bloquear la creación del usuario
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
      -- Ignorar TODOS los errores - la creación del usuario DEBE continuar
      NULL;
  END;
  
  -- CRÍTICO: Siempre retornar NEW para permitir la creación del usuario
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Última línea de defensa - incluso si algo catastrófico pasa
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION pricewaze_handle_new_user() IS 
'Función segura que crea perfiles automáticamente. 
NUNCA bloquea la creación de usuarios, incluso si la creación del perfil falla.
Versión definitiva - 2026-01-10';

