/**
 * FASE 1.5 - Helper de decaimiento temporal (Waze-style)
 * Calcula el factor de decaimiento basado en días desde el último reporte
 * 
 * Reglas:
 * - 0-7 días: 100% (factor 1.0)
 * - 8-14 días: 70% (factor 0.7)
 * - 15-30 días: 40% (factor 0.4)
 * - 31+ días: 10% (factor 0.1)
 */
export function decayFactor(days: number): number {
  if (days <= 7) return 1.0;
  if (days <= 14) return 0.7;
  if (days <= 30) return 0.4;
  return 0.1;
}

