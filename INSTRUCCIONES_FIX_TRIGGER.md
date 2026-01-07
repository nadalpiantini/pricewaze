# 🔧 Instrucciones para Arreglar el Trigger de Perfiles

## Problema
El trigger que crea perfiles automáticamente cuando se registra un usuario está fallando con error 500. Esto impide crear usuarios tanto en el seed como en la simulación.

## Solución

### Paso 1: Aplicar la Migración en Supabase

1. **Abre Supabase Dashboard**
   - Ve a tu proyecto en https://supabase.com/dashboard
   - Selecciona el proyecto `sujeto10` (o el que estés usando)

2. **Abre el SQL Editor**
   - En el menú lateral, haz clic en "SQL Editor"
   - Haz clic en "New query"

3. **Copia y Pega la Migración**
   - Abre el archivo: `supabase/migrations/20260106000002_fix_profile_trigger.sql`
   - Copia TODO el contenido
   - Pégalo en el SQL Editor de Supabase

4. **Ejecuta la Migración**
   - Haz clic en "Run" o presiona `Cmd+Enter` (Mac) / `Ctrl+Enter` (Windows)
   - Deberías ver un mensaje de éxito

### Paso 2: Verificar que Funcionó

Ejecuta en tu terminal:
```bash
pnpm seed
```

Deberías ver:
```
✅ Created 10 users
```

En lugar de:
```
❌ Failed to create auth user...
✅ Created 0 users
```

### Paso 3: Ejecutar la Simulación

Una vez que el seed funcione:
```bash
pnpm simulate:user
```

## Contenido de la Migración

La migración hace dos cosas:

1. **Agrega una política RLS** que permite al trigger insertar perfiles:
   ```sql
   CREATE POLICY "Trigger can insert profiles" ON pricewaze_profiles 
     FOR INSERT 
     WITH CHECK (
       EXISTS (SELECT 1 FROM auth.users WHERE auth.users.id = pricewaze_profiles.id)
     );
   ```

2. **Mejora el trigger** para manejar errores mejor:
   - Usa `ON CONFLICT DO NOTHING` para evitar duplicados
   - Captura excepciones sin fallar la creación del usuario

## Verificación Manual

Si quieres verificar que el trigger funciona:

1. En Supabase Dashboard > Authentication > Users
2. Crea un usuario manualmente
3. Verifica que se creó un perfil en `pricewaze_profiles`

## Troubleshooting

### Si la migración falla:
- Verifica que tienes permisos de administrador en Supabase
- Asegúrate de estar en el proyecto correcto
- Revisa los logs de error en Supabase

### Si el seed sigue fallando después de la migración:
- Verifica que la política se creó correctamente:
  ```sql
  SELECT * FROM pg_policies WHERE tablename = 'pricewaze_profiles';
  ```
- Verifica que el trigger existe:
  ```sql
  SELECT * FROM pg_trigger WHERE tgname = 'pricewaze_on_auth_user_created';
  ```

## Archivos Relacionados

- Migración: `supabase/migrations/20260106000002_fix_profile_trigger.sql`
- Script de fix: `scripts/fix-trigger.ts` (intenta aplicar automáticamente, pero requiere RPC)
- Script de simulación: `scripts/simulate-complete-user.ts`

