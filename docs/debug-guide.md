# Debug Guide - PriceWaze CI/CD

Guía para debuggear problemas en el pipeline de CI/CD.

## 🔍 Herramientas de Debug

### 1. Script Local (`scripts/debug.sh`)

Ejecuta checks locales antes de hacer push:

```bash
./scripts/debug.sh
```

**Qué verifica:**
- ✅ Node.js y pnpm instalados
- ✅ Archivos críticos presentes (package.json, pnpm-lock.yaml, etc.)
- ✅ Dependencias instalables
- ✅ Configuración de Python/CrewAI
- ✅ Estado de Git

### 2. GitHub Actions Debug Workflow

Workflow manual para debuggear en GitHub Actions:

**Ubicación:** `.github/workflows/debug.yml`

**Cómo usar:**
1. Ve a GitHub > Actions
2. Selecciona "Debug CI/CD Issues"
3. Click en "Run workflow"
4. Elige el tipo de check:
   - `all` - Todos los checks
   - `dependencies` - Solo verificar dependencias
   - `build` - Solo verificar build
   - `types` - Solo verificar TypeScript
   - `python` - Solo verificar Python

### 3. Dependabot Validator

Workflow automático que valida PRs de Dependabot:

**Ubicación:** `.github/workflows/dependabot-validator.yml`

**Qué hace:**
- Detecta actualizaciones de versión mayor
- Intenta build con nuevas dependencias
- Comenta en el PR si hay problemas

## 🐛 Problemas Comunes

### Error: "reference.startsWith is not a function"

**Causa:** Problema con pnpm lockfile o versión de pnpm

**Solución:**
```bash
# Regenerar lockfile
rm pnpm-lock.yaml
pnpm install

# O actualizar pnpm
npm install -g pnpm@latest
```

### Error: Build fails en CI pero funciona localmente

**Causas posibles:**
1. Variables de entorno faltantes
2. Versiones de Node.js diferentes
3. Cache de dependencias corrupto

**Solución:**
1. Verificar que todos los secrets estén configurados
2. Verificar versión de Node.js en CI (debe ser 20)
3. Limpiar cache en GitHub Actions

### Error: Dependabot PRs fallan

**Causa:** Actualizaciones de versión mayor incompatibles

**Solución:**
- Ya configurado: Dependabot ignora actualizaciones mayores automáticamente
- Si aún falla, revisar el PR manualmente
- El validator workflow comentará en el PR si hay problemas

### Error: TypeScript type errors

**Solución:**
```bash
# Verificar tipos localmente
pnpm exec tsc --noEmit

# Si hay errores, revisar:
# - tsconfig.json
# - Versiones de @types/*
```

### Error: Python tests fallan

**Solución:**
```bash
cd crewai
pip install -e ".[dev]"
pytest tests/ -v
```

## 📋 Checklist de Debug

Antes de hacer push, verifica:

- [ ] `./scripts/debug.sh` pasa sin errores
- [ ] `pnpm install` funciona
- [ ] `pnpm build` funciona localmente
- [ ] `pnpm exec tsc --noEmit` no tiene errores
- [ ] Variables de entorno configuradas en GitHub Secrets
- [ ] pnpm-lock.yaml está actualizado

## 🔗 Recursos

- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [pnpm Troubleshooting](https://pnpm.io/troubleshooting)
- [Next.js Deployment](https://nextjs.org/docs/deployment)

## 📞 Soporte

Si el problema persiste:
1. Revisar logs completos en GitHub Actions
2. Ejecutar `./scripts/debug.sh` y compartir output
3. Verificar que todos los secrets estén configurados


