# DevOps & CI/CD Documentation

## Overview

PriceWaze utiliza GitHub Actions para automatizar el proceso de CI/CD, incluyendo build, tests, seguridad y deployment a Vercel.

## Workflows

### 1. CI/CD Pipeline (`.github/workflows/ci-cd.yml`)

**Trigger:** Push a `main`/`develop` o Pull Requests

**Jobs:**
- **Frontend**: Build & Lint de Next.js
- **Backend**: Tests de Python (CrewAI) con pytest
- **Typecheck**: Verificación de tipos TypeScript
- **Deploy**: Deployment automático a Vercel (solo en `main`)

**Duración estimada:** ~5-8 minutos

### 2. CrewAI Testing Agents (`.github/workflows/test-crewai.yml`)

**Trigger:** Manual (`workflow_dispatch`) o diario a las 2 AM UTC

**Opciones de test:**
- `smoke`: Quick smoke test (5 agentes críticos)
- `ui`: UI/UX testing squad (7 agentes)
- `e2e`: E2E testing squad (8 agentes)
- `backend`: Backend integration squad (5 agentes)
- `full`: Todos los 25 agentes

**Uso manual:**
```bash
# En GitHub: Actions > CrewAI Testing Agents > Run workflow
```

### 3. Security Scan (`.github/workflows/security-scan.yml`)

**Trigger:** Push a `main`, PRs, o semanal (Lunes 3 AM UTC)

**Checks:**
- `pnpm audit` para dependencias npm
- `safety check` para dependencias Python

## Secrets Requeridos

Configurar en GitHub: Settings > Secrets and variables > Actions

### Frontend
- `NEXT_PUBLIC_SUPABASE_URL`: URL de Supabase
- `NEXT_PUBLIC_MAPBOX_TOKEN`: Token de Mapbox
- `NEXT_PUBLIC_MARKET_CODE`: Código de mercado (DO, US, MX, etc.)

### Backend
- `DEEPSEEK_API_KEY`: API key de DeepSeek
- `SUPABASE_URL`: URL de Supabase
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key de Supabase

### Deployment
- `VERCEL_TOKEN`: Token de Vercel
- `VERCEL_ORG_ID`: Organization ID de Vercel
- `VERCEL_PROJECT_ID`: Project ID de Vercel

## Dependabot

Configurado en `.github/dependabot.yml`:
- **npm**: Actualizaciones semanales (Lunes 9 AM)
- **pip**: Actualizaciones semanales (Lunes 9 AM)

## Deployment

### Automático (CI/CD)
- Push a `main` → Deploy automático a Vercel Production
- Pull Requests → Preview deployments en Vercel

### Manual
```bash
# Instalar Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

## Environments

### Development
- Branch: `develop`
- Vercel: Preview deployment
- Tests: Smoke tests

### Production
- Branch: `main`
- Vercel: Production deployment
- Tests: Full test suite

## Monitoring

### Build Status
Ver en: GitHub > Actions

### Deployment Status
Ver en: Vercel Dashboard

### Test Reports
- Artifacts disponibles en GitHub Actions
- CrewAI test reports: `crewai/test-reports/`

## Troubleshooting

### Build Fails
1. Revisar logs en GitHub Actions
2. Verificar secrets configurados
3. Ejecutar localmente: `pnpm build`

### Tests Fails
1. Revisar logs específicos del job
2. Ejecutar localmente:
   ```bash
   cd crewai
   pytest tests/ -v
   ```

### Deployment Fails
1. Verificar `VERCEL_TOKEN` y IDs
2. Revisar logs en Vercel Dashboard
3. Verificar variables de entorno en Vercel

## Best Practices

1. **Siempre hacer PRs** antes de merge a `main`
2. **Revisar CI/CD** antes de merge
3. **Tests deben pasar** antes de deployment
4. **Actualizar dependencias** regularmente (Dependabot)
5. **Monitorear security scans** semanales

