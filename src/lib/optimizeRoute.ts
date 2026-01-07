/**
 * Route Optimization using OSRM (Open Source Routing Machine)
 * Clean, production-ready implementation
 */

export type Point = { lat: number; lng: number };

export interface OptimizeRouteResult {
  geometry: {
    type: 'LineString';
    coordinates: [number, number][];
  };
  order: number[];
  distance?: number;
  duration?: number;
}

/**
 * Optimize route order using OSRM Trip service
 * Returns optimized order and route geometry
 */
export async function optimizeRoute(points: Point[]): Promise<OptimizeRouteResult> {
  if (points.length < 2) {
    throw new Error('At least 2 points are required for route optimization');
  }

  // Format coordinates as "lng,lat;lng,lat;..."
  const coords = points.map((p) => `${p.lng},${p.lat}`).join(';');

  // OSRM Trip service (optimizes order for round trip or one-way)
  // Request GeoJSON geometry format for easier parsing
  const url = `https://router.project-osrm.org/trip/v1/driving/${coords}?roundtrip=false&source=any&destination=any&geometries=geojson`;

  try {
    const res = await fetch(url);
    
    if (!res.ok) {
      throw new Error(`OSRM API error: ${res.status} ${res.statusText}`);
    }

    const json = await res.json();

    if (json.code !== 'Ok') {
      throw new Error(`OSRM error: ${json.code}`);
    }

    const trip = json.trips[0];
    const waypoints = json.waypoints;

    // Extract optimized order
    const order = waypoints.map((w: { waypoint_index: number }) => w.waypoint_index);

    // OSRM returns GeoJSON geometry when geometries=geojson is requested
    const geometry = trip.geometry;

    return {
      geometry: {
        type: 'LineString',
        coordinates: geometry.coordinates as [number, number][],
      },
      order,
      distance: trip.distance, // meters
      duration: trip.duration, // seconds
    };
  } catch (error) {
    console.error('Route optimization error:', error);
    throw error;
  }
}


