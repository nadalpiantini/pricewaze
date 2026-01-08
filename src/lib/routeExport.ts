/**
 * Export and Share Route functionality
 */

export interface RouteExportData {
  routeName: string;
  stops: Array<{
    order: number;
    address: string;
    propertyTitle?: string;
    price?: number;
  }>;
  distance?: number;
  duration?: number;
}

/**
 * Generate a shareable link for the route
 */
export function generateRouteShareLink(routeId: string): string {
  if (typeof window === 'undefined') return '';
  return `${window.location.origin}/routes/${routeId}`;
}

/**
 * Copy route link to clipboard
 */
export async function copyRouteLink(routeId: string): Promise<boolean> {
  try {
    const link = generateRouteShareLink(routeId);
    await navigator.clipboard.writeText(link);
    return true;
  } catch (error) {
    console.error('Failed to copy link:', error);
    return false;
  }
}

/**
 * Export route as text
 */
export function exportRouteAsText(data: RouteExportData): string {
  let text = `${data.routeName}\n`;
  text += '='.repeat(50) + '\n\n';
  
  if (data.distance && data.duration) {
    text += `Total Distance: ${(data.distance / 1000).toFixed(1)} km\n`;
    text += `Estimated Time: ${Math.round(data.duration / 60)} minutes\n\n`;
  }

  text += 'Stops:\n';
  text += '-'.repeat(50) + '\n';
  
  data.stops.forEach((stop, index) => {
    text += `${index + 1}. ${stop.address}\n`;
    if (stop.propertyTitle) {
      text += `   Property: ${stop.propertyTitle}\n`;
    }
    if (stop.price) {
      text += `   Price: $${stop.price.toLocaleString()}\n`;
    }
    text += '\n';
  });

  return text;
}

/**
 * Download route as text file
 */
export function downloadRouteAsText(data: RouteExportData, filename?: string): void {
  const text = exportRouteAsText(data);
  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `${data.routeName.replace(/\s+/g, '_')}_route.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Share route via Web Share API (mobile)
 */
export async function shareRoute(
  data: RouteExportData,
  routeId: string
): Promise<boolean> {
  if (!navigator.share) {
    return false;
  }

  try {
    const link = generateRouteShareLink(routeId);
    await navigator.share({
      title: data.routeName,
      text: `Check out my property visit route: ${data.routeName}`,
      url: link,
    });
    return true;
  } catch {
    // User cancelled or error
    return false;
  }
}

