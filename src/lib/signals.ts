import type { PropertySignalType } from '@/types/database';

/**
 * Signal Icons Mapping (Waze-style)
 * Each signal type has an emoji icon for visual display
 */
export const SIGNAL_ICONS: Record<PropertySignalType, string> = {
  high_activity: '👀',
  many_visits: '🧭',
  competing_offers: '🥊',
  noise: '🔊',
  humidity: '💧',
  misleading_photos: '📸',
  price_issue: '⚠️',
};

/**
 * Signal Labels (human-readable names)
 */
export const SIGNAL_LABELS: Record<PropertySignalType, string> = {
  high_activity: 'Alta actividad',
  many_visits: 'Muchas visitas',
  competing_offers: 'Ofertas competidoras',
  noise: 'Zona ruidosa',
  humidity: 'Posible humedad',
  misleading_photos: 'Fotos engañosas',
  price_issue: 'Precio discutido',
};

/**
 * Signal Descriptions (tooltips/help text)
 */
export const SIGNAL_DESCRIPTIONS: Record<PropertySignalType, string> = {
  high_activity: 'Esta propiedad ha recibido muchas visualizaciones recientemente',
  many_visits: 'Varios usuarios han verificado visitas a esta propiedad',
  competing_offers: 'Hay ofertas activas en esta propiedad',
  noise: 'Usuarios reportaron que la zona es ruidosa',
  humidity: 'Usuarios reportaron posible problema de humedad',
  misleading_photos: 'Usuarios indicaron que las fotos no reflejan la realidad',
  price_issue: 'Usuarios cuestionaron el precio de la propiedad',
};

/**
 * User-reportable signal types
 * These are the signals that users can report after a verified visit
 */
export const USER_REPORTABLE_SIGNALS: PropertySignalType[] = [
  'noise',
  'humidity',
  'misleading_photos',
  'price_issue',
];

/**
 * System-generated signal types
 * These are automatically created by the system
 */
export const SYSTEM_SIGNALS: PropertySignalType[] = [
  'high_activity',
  'many_visits',
  'competing_offers',
];

/**
 * Get signal icon
 */
export function getSignalIcon(signalType: PropertySignalType): string {
  return SIGNAL_ICONS[signalType] || '📊';
}

/**
 * Get signal label
 */
export function getSignalLabel(signalType: PropertySignalType): string {
  return SIGNAL_LABELS[signalType] || signalType;
}

/**
 * Get signal description
 */
export function getSignalDescription(signalType: PropertySignalType): string {
  return SIGNAL_DESCRIPTIONS[signalType] || '';
}

/**
 * Check if signal is user-reportable
 */
export function isUserReportable(signalType: PropertySignalType): boolean {
  return USER_REPORTABLE_SIGNALS.includes(signalType);
}

/**
 * Check if signal is system-generated
 */
export function isSystemSignal(signalType: PropertySignalType): boolean {
  return SYSTEM_SIGNALS.includes(signalType);
}

