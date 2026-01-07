/**
 * FASE 1 - Catálogo simple de señales (Waze-style)
 * Solo las 3 señales negativas básicas para empezar
 */
export const SIGNALS = {
  noise: { icon: "🔊", label: "Zona ruidosa" },
  humidity: { icon: "💧", label: "Humedad visible" },
  misleading_photos: { icon: "📸", label: "Fotos engañosas" }
} as const;

export type SimpleSignalType = keyof typeof SIGNALS;

// Señales que los usuarios pueden reportar después de una visita verificada
export const USER_REPORTABLE_SIGNALS_NEGATIVE: SimpleSignalType[] = [
  'noise',
  'humidity',
  'misleading_photos'
];

export const USER_REPORTABLE_SIGNALS_POSITIVE: SimpleSignalType[] = [
  // Por ahora vacío, se agregarán señales positivas más adelante
];

// Helpers para compatibilidad con código existente
export function getSignalIcon(signalType: string): string {
  return SIGNALS[signalType as SimpleSignalType]?.icon || '📊';
}

export function getSignalLabel(signalType: string): string {
  return SIGNALS[signalType as SimpleSignalType]?.label || signalType;
}

export function getSignalDescription(signalType: string): string {
  return SIGNALS[signalType as SimpleSignalType]?.label || '';
}

export function isPositiveSignal(signalType: string): boolean {
  return false; // Por ahora solo negativas
}

