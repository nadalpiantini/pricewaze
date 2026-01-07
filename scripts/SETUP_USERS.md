# Setup de Usuarios de Prueba

## Problema Actual

El proyecto de Supabase tiene restricciones que impiden crear usuarios directamente mediante la API admin. Esto es común en proyectos compartidos.

## Solución: Registro Manual + Script de Completado

### Paso 1: Registrar Usuario Manualmente

1. Abre http://localhost:3000/register
2. Registra un usuario con estos datos:
   - **Email**: maria@test.com
   - **Password**: Test123!
   - **Full Name**: Maria Garcia

### Paso 2: Completar Datos del Usuario

Después del registro, ejecuta:

```bash
tsx scripts/complete-user-data.ts maria@test.com "Maria Garcia" "+1-809-555-0101" buyer
```

### Paso 3: Crear Más Usuarios (Opcional)

Repite el proceso para otros usuarios de prueba:

```bash
# Juan (buyer)
# 1. Registrar en UI: juan@test.com / Test123!
# 2. Completar datos:
tsx scripts/complete-user-data.ts juan@test.com "Juan Perez" "+1-809-555-0102" buyer

# Carlos (seller)
# 1. Registrar en UI: carlos@test.com / Test123!
# 2. Completar datos:
tsx scripts/complete-user-data.ts carlos@test.com "Carlos Mendez" "+1-809-555-0104" seller
```

## Alternativa: Usar el Seed Script Mejorado

El script `seed.ts` creará todas las zonas y propiedades. Los usuarios deben crearse manualmente primero.

```bash
# 1. Crear usuarios manualmente (ver arriba)
# 2. Ejecutar seed (creará propiedades, ofertas, etc.)
pnpm seed
```

## Nota

Si necesitas crear muchos usuarios, considera:
1. Usar la interfaz de Supabase Dashboard directamente
2. O configurar el proyecto para permitir creación de usuarios via API

