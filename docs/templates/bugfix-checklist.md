# Bugfix Checklist

> Template para correccion sistematica de bugs siguiendo metodologia Edward Honour

---

## Identificacion

| Campo | Valor |
|-------|-------|
| **Bug ID** | BUG-[NUMBER] o Issue #[NUMBER] |
| **Severidad** | 🔴 Critical / 🟠 High / 🟡 Medium / 🟢 Low |
| **Module Afectado** | [AUTH/PROP/MAP/PRICE/OFFER/VISIT/CONTRACT/CREW/ALERTS/COPILOT] |
| **Reportado por** | [Usuario/QA/Monitoring] |
| **Fecha Reporte** | [YYYY-MM-DD] |
| **Asignado a** | [Nombre] |

---

## Diagnostico

### Reproduccion
- [ ] Bug reproducido localmente
- [ ] Pasos de reproduccion documentados:
  1. [Paso 1]
  2. [Paso 2]
  3. [Resultado actual vs esperado]
- [ ] Frecuencia determinada (siempre/intermitente/condiciones especificas)
- [ ] Entorno de reproduccion: [dev/staging/prod]

### Analisis de Causa Raiz
- [ ] Logs revisados (`vercel logs` / browser console / server logs)
- [ ] Stack trace analizado
- [ ] Commit que introdujo el bug identificado (si posible)
- [ ] Root cause documentado:
  ```
  [Explicacion de la causa raiz]
  ```

### Impacto
- [ ] Usuarios afectados cuantificados
- [ ] Funcionalidades impactadas listadas
- [ ] Datos corrompidos? (si/no)
- [ ] Workaround disponible? (si/no - documentar)

---

## Planificacion

### Scope del Fix
- [ ] Archivos a modificar identificados:
  - `[archivo1.ts]`
  - `[archivo2.tsx]`
- [ ] Tests a agregar/modificar identificados
- [ ] Impacto en otros modulos evaluado
- [ ] Branch creado: `fix/[descripcion-corta]` o `hotfix/[descripcion]`

### Risk Assessment
- [ ] Regresiones potenciales identificadas
- [ ] Nivel de riesgo: [Alto/Medio/Bajo]
- [ ] Rollback plan definido

---

## Implementacion

### Codigo
- [ ] Fix implementado
- [ ] Cambios son minimos y focalizados (no refactors oportunistas)
- [ ] No se introdujeron nuevos `any` types
- [ ] Error handling mejorado si fue parte del problema
- [ ] Logging agregado para detectar recurrencia

### Testing
- [ ] Test que reproduce el bug escrito PRIMERO (TDD)
- [ ] Test pasa con el fix aplicado
- [ ] Tests existentes siguen pasando
- [ ] Manual testing completado
- [ ] Edge cases del fix cubiertos

### Validacion
- [ ] `pnpm build` pasa
- [ ] `pnpm lint` pasa
- [ ] No nuevos warnings de TypeScript

---

## Pre-Merge

### PR Requirements
- [ ] PR creado con template de bugfix
- [ ] Descripcion incluye:
  - Causa raiz
  - Solucion implementada
  - Testing realizado
- [ ] Link a issue/ticket original
- [ ] Screenshots del antes/despues (si UI)

### Review
- [ ] Code review completado
- [ ] QA sign-off (si severidad alta)
- [ ] CI pipeline pasando

---

## Post-Merge

### Verificacion
- [ ] Fix verificado en staging/preview
- [ ] Fix verificado en produccion
- [ ] Monitoring muestra resolucion
- [ ] No regresiones detectadas

### Comunicacion
- [ ] Issue cerrado con comentario de resolucion
- [ ] Usuario reportante notificado
- [ ] Postmortem documentado (si Critical)

### Cleanup
- [ ] Branch eliminado
- [ ] Workaround removido (si existia)
- [ ] Documentacion actualizada (si necesario)

---

## Postmortem (Solo para bugs Critical/High)

### Timeline
| Hora | Evento |
|------|--------|
| [HH:MM] | Bug detectado/reportado |
| [HH:MM] | Investigacion iniciada |
| [HH:MM] | Causa raiz identificada |
| [HH:MM] | Fix implementado |
| [HH:MM] | Fix deployed |
| [HH:MM] | Verificacion completada |

### Metricas
- **Time to Detect (TTD)**: [X horas]
- **Time to Resolve (TTR)**: [X horas]
- **Usuarios impactados**: [N]
- **Transacciones afectadas**: [N]

### Lecciones Aprendidas
1. [Leccion 1]
2. [Leccion 2]

### Action Items
- [ ] [Accion preventiva 1]
- [ ] [Accion preventiva 2]

---

## Notas

[Espacio para notas adicionales, decisiones tomadas, observaciones]

---

*Template version: 1.0 | Ultima actualizacion: 2026-01-08*
