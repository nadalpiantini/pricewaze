# Soft Launch - Variables de Entorno

## 🚀 Configuración para Soft Launch

### L1.1 - Checklist Técnico

```bash
# Demo Mode (debe estar en false para prod)
NEXT_PUBLIC_DEMO_MODE=false

# Feature Flags (activar para soft launch)
NEXT_PUBLIC_FEATURE_COPILOT=true
NEXT_PUBLIC_FEATURE_PUSH=true
NEXT_PUBLIC_FEATURE_PAYWALL=true
NEXT_PUBLIC_FEATURE_ADVANCED_TIMELINE=true
NEXT_PUBLIC_FEATURE_ADVANCED_ALERTS=true

# Rate Limits (ya configurados en código)
# Copilot: 10 requests/min
# Otros: 100 requests/min
```

### L2 - Sistema de Invitaciones

```bash
# Activar sistema de invitaciones
NEXT_PUBLIC_INVITATIONS_ENABLED=true

# Token de invitación (cambiar por token único para soft launch)
NEXT_PUBLIC_INVITATION_TOKEN=soft-launch-2026-01-12
```

**Uso del token:**
- Link privado: `https://pricewaze.com?invite=soft-launch-2026-01-12`
- El token se guarda en localStorage automáticamente
- Si `INVITATIONS_ENABLED=false`, acceso libre

### L3 - Push Notifications

```bash
# Activar push notifications
NEXT_PUBLIC_FEATURE_PUSH=true

# VAPID keys (generar con web-push)
# Ver: https://web-push-codelab.glitch.me/
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key
VAPID_SUBJECT=mailto:your-email@example.com
```

### L4 - Paywall y Suscripciones

```bash
# Activar paywall
NEXT_PUBLIC_FEATURE_PAYWALL=true

# Trial de 7 días (configurado en DB)
# No requiere variables adicionales
```

### Analytics (Opcional)

```bash
# PostHog
NEXT_PUBLIC_POSTHOG_KEY=your-posthog-key
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com

# Mixpanel
NEXT_PUBLIC_MIXPANEL_TOKEN=your-mixpanel-token
```

### Logs

```bash
# Nivel de logs (development/production)
NODE_ENV=production

# Logs mínimos (solo errores + eventos clave)
# Configurado en src/lib/logger.ts
```

## 📋 Checklist Pre-Launch

- [ ] `NEXT_PUBLIC_DEMO_MODE=false`
- [ ] Feature flags activos
- [ ] `NEXT_PUBLIC_INVITATIONS_ENABLED=true` (si usas invitaciones)
- [ ] `NEXT_PUBLIC_INVITATION_TOKEN` configurado
- [ ] VAPID keys configuradas (si usas push)
- [ ] Analytics configurado (opcional)
- [ ] Rate limits verificados
- [ ] Logs configurados

## 🔄 Rollback

Para desactivar features rápidamente:

```bash
# Desactivar todo
NEXT_PUBLIC_FEATURE_COPILOT=false
NEXT_PUBLIC_FEATURE_PUSH=false
NEXT_PUBLIC_FEATURE_PAYWALL=false
NEXT_PUBLIC_INVITATIONS_ENABLED=false
```

## 📊 Métricas a Observar

Los siguientes eventos se trackean automáticamente:
- `map_viewed`
- `property_followed`
- `signal_alert_received`
- `copilot_opened`
- `pro_paywall_shown`
- `pro_activated`

Ver `src/lib/analytics.ts` para configuración de provider.

