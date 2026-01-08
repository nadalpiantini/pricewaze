/**
 * Deep Links for Navigation Apps
 * Clean, production-ready implementation
 */

export interface Stop {
  lat: number;
  lng: number;
  address?: string;
}

/**
 * Open Waze navigation to a single location
 */
export function openWaze(lat: number, lng: number): void {
  const url = `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
  window.open(url, '_blank');
}

/**
 * Open Google Maps with multi-stop route
 * Supports origin, destination, and waypoints
 */
export function openGoogleMaps(stops: Stop[]): void {
  if (!Array.isArray(stops) || stops.length === 0) return;

  if (stops.length === 1) {
    // Single destination
    const stop = stops[0];
    const url = `https://www.google.com/maps/dir/?api=1&destination=${stop.lat},${stop.lng}&travelmode=driving`;
    window.open(url, '_blank');
    return;
  }

  // Multi-stop route
  const origin = `${stops[0].lat},${stops[0].lng}`;
  const destination = `${stops[stops.length - 1].lat},${stops[stops.length - 1].lng}`;
  
  // Waypoints are all stops except first and last
  const waypoints = stops.slice(1, -1)
    .map((stop) => `${stop.lat},${stop.lng}`)
    .join('|');

  const url = waypoints
    ? `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${waypoints}&travelmode=driving`
    : `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`;

  window.open(url, '_blank');
}

/**
 * Open Apple Maps (iOS/Safari)
 */
export function openAppleMaps(stops: Stop[]): void {
  if (stops.length === 0) return;

  if (stops.length === 1) {
    const stop = stops[0];
    const url = `http://maps.apple.com/?daddr=${stop.lat},${stop.lng}`;
    window.open(url, '_blank');
    return;
  }

  // For multi-stop, Apple Maps doesn't support waypoints in URL
  // So we'll use the first stop as destination
  const firstStop = stops[0];
  const url = `http://maps.apple.com/?daddr=${firstStop.lat},${firstStop.lng}`;
  window.open(url, '_blank');
}

