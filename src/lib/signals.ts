/**
 * FASE 4 - Catálogo completo de señales (Waze-style)
 * Señales negativas y positivas que los usuarios pueden reportar
 */
import { SIGNAL_ICONS } from './signalIcons';

export const SIGNALS = {
  // Señales negativas
  noise: { icon: "🔊", label: "Zona ruidosa" },
  humidity: { icon: "💧", label: "Humedad visible" },
  misleading_photos: { icon: "📸", label: "Fotos engañosas" },
  // Señales positivas
  quiet_area: { icon: "🟢", label: "Zona tranquila" },
  good_condition: { icon: "✨", label: "Bien mantenida" },
  transparent_listing: { icon: "📋", label: "Descripción fiel" }
} as const;

export type SimpleSignalType = keyof typeof SIGNALS;

// Señales que los usuarios pueden reportar después de una visita verificada
export const USER_REPORTABLE_SIGNALS_NEGATIVE: SimpleSignalType[] = [
  'noise',
  'humidity',
  'misleading_photos'
];

export const USER_REPORTABLE_SIGNALS_POSITIVE: SimpleSignalType[] = [
  'quiet_area',
  'good_condition',
  'transparent_listing'
];

// Helpers para compatibilidad con código existente
export function getSignalIcon(signalType: string): string {
  // Primero intenta desde SIGNALS, luego desde SIGNAL_ICONS (para señales del sistema)
  return SIGNALS[signalType as SimpleSignalType]?.icon || SIGNAL_ICONS[signalType] || '📊';
}

export function getSignalLabel(signalType: string): string {
  return SIGNALS[signalType as SimpleSignalType]?.label || signalType;
}

export function getSignalDescription(signalType: string): string {
  return SIGNALS[signalType as SimpleSignalType]?.label || signalType;
}

export function isPositiveSignal(signalType: string): boolean {
  return USER_REPORTABLE_SIGNALS_POSITIVE.includes(signalType as SimpleSignalType);
}

