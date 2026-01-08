'use client';

import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

interface RouteMapProps {
  geometry?: {
    type: 'LineString';
    coordinates: [number, number][];
  };
  stops?: Array<{
    id: string;
    location: { lat: number; lng: number };
    address: string;
    order_index: number;
  }>;
  className?: string;
}

export function RouteMap({ geometry, stops = [], className = '' }: RouteMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    // Calculate center from stops or use default
    let center: [number, number] = [0, 0];
    if (stops.length > 0) {
      const avgLat = stops.reduce((sum, s) => sum + s.location.lat, 0) / stops.length;
      const avgLng = stops.reduce((sum, s) => sum + s.location.lng, 0) / stops.length;
      center = [avgLng, avgLat];
    }

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center,
      zoom: stops.length > 1 ? 12 : 14,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    map.current.on('load', () => {
      setMapLoaded(true);
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [stops]);

  // Update route line
  useEffect(() => {
    if (!map.current || !mapLoaded || !geometry) return;

    const sourceId = 'route';
    const layerId = 'route-line';

    // Remove existing source/layer if they exist
    if (map.current.getLayer(layerId)) {
      map.current.removeLayer(layerId);
    }
    if (map.current.getSource(sourceId)) {
      map.current.removeSource(sourceId);
    }

    // Add route line
    map.current.addSource(sourceId, {
      type: 'geojson',
      data: {
        type: 'Feature',
        geometry,
        properties: {},
      },
    });

    map.current.addLayer({
      id: layerId,
      type: 'line',
      source: sourceId,
      layout: {
        'line-join': 'round',
        'line-cap': 'round',
      },
      paint: {
        'line-color': '#2563eb',
        'line-width': 6,
        'line-opacity': 0.9,
        'line-dasharray': [0.5, 0.5],
      },
    });

    // Fit bounds to route
    if (geometry.coordinates.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      geometry.coordinates.forEach((coord) => {
        bounds.extend(coord as [number, number]);
      });
      map.current.fitBounds(bounds, { padding: 50, maxZoom: 15 });
    }
  }, [geometry, mapLoaded]);

  // Update markers for stops
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    // Add markers for each stop
    stops.forEach((stop) => {
      const el = document.createElement('div');
      el.className = 'route-stop-marker';
      // Color gradient based on order
      const colors = ['#2563eb', '#059669', '#dc2626', '#ea580c', '#7c3aed', '#db2777'];
      const colorIndex = stop.order_index % colors.length;
      const bgColor = colors[colorIndex];
      el.innerHTML = `
        <div class="text-white rounded-full w-10 h-10 flex items-center justify-center font-bold text-sm shadow-xl transition-transform hover:scale-110" style="background-color: ${bgColor};">
          ${stop.order_index + 1}
        </div>
      `;

      const popup = new mapboxgl.Popup({ offset: 25, closeButton: false }).setHTML(`
        <div class="p-2 min-w-[200px]">
          <div class="font-semibold text-sm">Stop ${stop.order_index + 1}</div>
          <p class="text-gray-600 text-xs mt-1">${stop.address}</p>
        </div>
      `);

      const marker = new mapboxgl.Marker(el)
        .setLngLat([stop.location.lng, stop.location.lat])
        .setPopup(popup)
        .addTo(map.current!);

      markersRef.current.push(marker);
    });

    // Fit bounds to all stops if no route geometry
    if (!geometry && stops.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      stops.forEach((stop) => {
        bounds.extend([stop.location.lng, stop.location.lat]);
      });
      map.current.fitBounds(bounds, { padding: 50, maxZoom: 15 });
    }
  }, [stops, mapLoaded, geometry]);

  return (
    <div ref={mapContainer} data-testid="mapbox-map" className={`w-full ${className}`} style={{ minHeight: '400px' }} />
  );
}

