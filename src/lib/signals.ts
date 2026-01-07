import type { PropertySignalType } from '@/types/database';

/**
 * Signal Icons Mapping (Waze-style)
 * Each signal type has an emoji icon for visual display
 */
export const SIGNAL_ICONS: Record<PropertySignalType, string> = {
  // System signals
  high_activity: '👀',
  many_visits: '🧭',
  competing_offers: '🥊',
  long_time_on_market: '⏳',
  recent_price_change: '💲',
  // User negative signals
  noise: '🔊',
  humidity: '💧',
  misleading_photos: '📸',
  poor_parking: '🚗',
  security_concern: '🚨',
  maintenance_needed: '🛠️',
  price_issue: '⚠️',
  // User positive signals
  quiet_area: '🟢',
  good_condition: '🟢',
  transparent_listing: '🟢',
};

/**
 * Signal Labels (human-readable names)
 */
export const SIGNAL_LABELS: Record<PropertySignalType, string> = {
  // System signals
  high_activity: 'Alta actividad',
  many_visits: 'Muchas visitas',
  competing_offers: 'Ofertas competidoras',
  long_time_on_market: 'Mucho tiempo sin cerrar',
  recent_price_change: 'Cambio reciente de precio',
  // User negative signals
  noise: 'Zona ruidosa',
  humidity: 'Humedad visible',
  misleading_photos: 'Fotos no representan la realidad',
  poor_parking: 'Parqueo complicado',
  security_concern: 'Sensación de inseguridad',
  maintenance_needed: 'Mantenimiento evidente',
  price_issue: 'Precio percibido como fuera de mercado',
  // User positive signals
  quiet_area: 'Zona tranquila confirmada',
  good_condition: 'Propiedad bien mantenida',
  transparent_listing: 'Fotos y descripción fieles',
};

/**
 * Signal Descriptions (tooltips/help text)
 */
export const SIGNAL_DESCRIPTIONS: Record<PropertySignalType, string> = {
  // System signals
  high_activity: 'Esta propiedad ha recibido muchas visualizaciones recientemente',
  many_visits: 'Varios usuarios han verificado visitas a esta propiedad',
  competing_offers: 'Hay ofertas activas en esta propiedad',
  long_time_on_market: 'Esta propiedad lleva mucho tiempo en el mercado sin cerrar',
  recent_price_change: 'El precio de esta propiedad cambió recientemente',
  // User negative signals
  noise: 'Usuarios reportaron que la zona es ruidosa',
  humidity: 'Usuarios reportaron humedad visible en la propiedad',
  misleading_photos: 'Usuarios indicaron que las fotos no representan la realidad',
  poor_parking: 'Usuarios reportaron que el parqueo es complicado',
  security_concern: 'Usuarios reportaron sensación de inseguridad en la zona',
  maintenance_needed: 'Usuarios reportaron que la propiedad necesita mantenimiento evidente',
  price_issue: 'Usuarios percibieron que el precio está fuera de mercado',
  // User positive signals
  quiet_area: 'Usuarios confirmaron que la zona es tranquila',
  good_condition: 'Usuarios confirmaron que la propiedad está bien mantenida',
  transparent_listing: 'Usuarios confirmaron que las fotos y descripción son fieles',
};

/**
 * User-reportable signal types (negative)
 * These are the signals that users can report after a verified visit
 */
export const USER_REPORTABLE_SIGNALS_NEGATIVE: PropertySignalType[] = [
  'noise',
  'humidity',
  'misleading_photos',
  'poor_parking',
  'security_concern',
  'maintenance_needed',
  'price_issue',
];

/**
 * User-reportable signal types (positive)
 * These are positive signals that users can report after a verified visit
 */
export const USER_REPORTABLE_SIGNALS_POSITIVE: PropertySignalType[] = [
  'quiet_area',
  'good_condition',
  'transparent_listing',
];

/**
 * All user-reportable signal types
 */
export const USER_REPORTABLE_SIGNALS: PropertySignalType[] = [
  ...USER_REPORTABLE_SIGNALS_NEGATIVE,
  ...USER_REPORTABLE_SIGNALS_POSITIVE,
];

/**
 * System-generated signal types
 * These are automatically created by the system
 */
export const SYSTEM_SIGNALS: PropertySignalType[] = [
  'high_activity',
  'many_visits',
  'competing_offers',
  'long_time_on_market',
  'recent_price_change',
];

/**
 * Check if signal is positive (green)
 */
export function isPositiveSignal(signalType: PropertySignalType): boolean {
  return USER_REPORTABLE_SIGNALS_POSITIVE.includes(signalType);
}

/**
 * Check if signal is negative (red/gray)
 */
export function isNegativeSignal(signalType: PropertySignalType): boolean {
  return USER_REPORTABLE_SIGNALS_NEGATIVE.includes(signalType) || SYSTEM_SIGNALS.includes(signalType);
}

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

