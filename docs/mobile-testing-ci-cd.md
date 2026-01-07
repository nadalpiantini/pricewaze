# Mobile Testing CI/CD Integration

## 📋 Overview

Los tests móviles de PriceWaze están integrados en CI/CD para validar automáticamente el diseño responsive en cada push y pull request.

## 🔄 Workflows de GitHub Actions

### 1. Mobile Design Tests (Completo)
**Archivo**: `.github/workflows/mobile-tests.yml`

**Cuándo se ejecuta**:
- Push a `main` o `develop`
- Pull requests a `main` o `develop`
- Manualmente (workflow_dispatch)
- Cuando cambian archivos en `src/`, `tests/mobile/`, o configuración

**Qué hace**:
- Ejecuta todos los tests móviles en 5 dispositivos
- Genera reportes HTML completos
- Sube screenshots de fallos
- Comenta en PRs con resultados

**Tiempo estimado**: ~15 minutos

### 2. Mobile Tests Quick Check (Rápido)
**Archivo**: `.github/workflows/mobile-tests-quick.yml`

**Cuándo se ejecuta**:
- Pull requests a `main` o `develop`
- Solo cuando cambian archivos relevantes
- Manualmente (workflow_dispatch)

**Qué hace**:
- Ejecuta tests solo en iPhone SE (más rápido)
- Validación rápida de cambios
- Ideal para PRs

**Tiempo estimado**: ~10 minutos

## 🚀 Configuración Requerida

### Secrets de GitHub

Configura estos secrets en tu repositorio (Settings → Secrets and variables → Actions):

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

### Variables de Entorno Opcionales

Si necesitas más configuración, agrega al workflow:

```yaml
- name: Setup environment variables
  run: |
    echo "NEXT_PUBLIC_SUPABASE_URL=${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}" >> .env.local
    echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}" >> .env.local
    echo "NEXT_PUBLIC_APP_URL=http://localhost:3000" >> .env.local
    # Agregar más variables aquí si es necesario
```

## 📊 Ver Resultados

### En GitHub Actions
1. Ve a la pestaña "Actions" en tu repositorio
2. Selecciona el workflow "Mobile Design Tests"
3. Haz clic en el run específico
4. Descarga el artifact "playwright-report-mobile" para ver el reporte HTML

### En Pull Requests
- Los resultados se comentan automáticamente en PRs
- Incluye estadísticas de éxito/fallo
- Link al reporte completo

### Reporte HTML Local
```bash
# Después de ejecutar tests localmente
npx playwright show-report playwright-report-mobile
```

## 🔧 Troubleshooting

### Tests fallan en CI pero pasan localmente

1. **Verificar variables de entorno**: Asegúrate de que los secrets estén configurados
2. **Revisar logs**: Los logs completos están en la pestaña "Actions"
3. **Screenshots**: Descarga el artifact "test-screenshots" para ver qué falló

### El servidor no inicia

El workflow espera 10 segundos y hace retry. Si falla:
- Verifica que el build de Next.js sea exitoso
- Revisa los logs del step "Start Next.js server"
- Aumenta el timeout si es necesario

### Tests muy lentos

- Usa el workflow "Quick Check" para PRs (solo iPhone SE)
- Reduce el número de dispositivos en `playwright.mobile.config.ts`
- Aumenta el timeout del job si es necesario

## 📈 Métricas y Reportes

### Estadísticas Automáticas
- Tasa de éxito por dispositivo
- Tiempo de ejecución
- Tests fallidos con screenshots

### Integración con Badges
Puedes agregar un badge de estado a tu README:

```markdown
![Mobile Tests](https://github.com/USERNAME/REPO/workflows/Mobile%20Design%20Tests/badge.svg)
```

## 🎯 Mejores Prácticas

1. **Ejecutar tests localmente antes de push**
   ```bash
   pnpm test:mobile
   ```

2. **Revisar reportes antes de merge**
   - Siempre revisa los resultados en PRs
   - Descarga y revisa screenshots de fallos

3. **Mantener tests actualizados**
   - Actualiza selectores cuando cambies componentes
   - Agrega tests para nuevas páginas móviles

4. **Usar Quick Check para iteración rápida**
   - El workflow rápido es ideal durante desarrollo
   - El workflow completo valida todo antes de merge

## 🔄 Actualización de Workflows

Para modificar los workflows:

1. Edita `.github/workflows/mobile-tests.yml`
2. Los cambios se aplican en el próximo push
3. Prueba con `workflow_dispatch` primero

## 📝 Notas

- Los tests no requieren autenticación (validan diseño responsive)
- Los screenshots se guardan solo en fallos
- Los reportes se mantienen por 30 días (quick check: 7 días)
- El workflow completo ejecuta ~130 validaciones (26 tests × 5 dispositivos)

