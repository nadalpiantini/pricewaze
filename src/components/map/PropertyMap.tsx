'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import type { Property } from '@/types/database';
import { getMarketConfig } from '@/config/market';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

// Get market-specific map configuration
const marketConfig = getMarketConfig();
const DEFAULT_CENTER: [number, number] = marketConfig.map.center;
const DEFAULT_ZOOM = marketConfig.map.zoom;

interface PropertyMapProps {
  properties: Property[];
  onPropertyClick?: (property: Property) => void;
  onMapClick?: (lngLat: { lng: number; lat: number }) => void;
  center?: [number, number];
  zoom?: number;
  className?: string;
}

export function PropertyMap({
  properties,
  onPropertyClick,
  onMapClick,
  center = DEFAULT_CENTER,
  zoom = DEFAULT_ZOOM,
  className = '',
}: PropertyMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center,
      zoom,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
    map.current.addControl(
      new mapboxgl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
      }),
      'top-right'
    );

    map.current.on('load', () => {
      setMapLoaded(true);
    });

    if (onMapClick) {
      map.current.on('click', (e) => {
        onMapClick({ lng: e.lngLat.lng, lat: e.lngLat.lat });
      });
    }

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [center, zoom, onMapClick]);

  // Format price for display
  const formatPrice = useCallback((price: number) => {
    if (price >= 1000000) {
      return `$${(price / 1000000).toFixed(1)}M`;
    }
    return `$${(price / 1000).toFixed(0)}K`;
  }, []);

  // Update markers when properties change
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    // Ensure properties is always an array (defensive programming)
    const safeProperties = Array.isArray(properties) ? properties : [];
    if (safeProperties.length === 0) return;

    // Add new markers
    safeProperties.forEach((property) => {
      // Create custom marker element
      const el = document.createElement('div');
      el.className = 'property-marker';
      el.innerHTML = `
        <div class="bg-primary text-primary-foreground px-2 py-1 rounded-full text-xs font-semibold shadow-lg cursor-pointer hover:scale-110 transition-transform">
          ${formatPrice(property.price)}
        </div>
      `;

      // Create popup
      const popup = new mapboxgl.Popup({ offset: 25, closeButton: false }).setHTML(`
        <div class="p-2 min-w-[200px]">
          <h3 class="font-semibold text-sm">${property.title}</h3>
          <p class="text-gray-600 text-xs">${property.address}</p>
          <div class="flex justify-between mt-2 text-xs">
            <span>${property.area_m2} m²</span>
            <span class="font-semibold">$${property.price.toLocaleString()}</span>
          </div>
          <p class="text-xs text-gray-500 mt-1">$${property.price_per_m2.toLocaleString()}/m²</p>
        </div>
      `);

      const marker = new mapboxgl.Marker(el)
        .setLngLat([property.longitude, property.latitude])
        .setPopup(popup)
        .addTo(map.current!);

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        onPropertyClick?.(property);
      });

      markersRef.current.push(marker);
    });

    // Fit bounds if we have properties
    if (safeProperties.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      safeProperties.forEach((p) => {
        bounds.extend([p.longitude, p.latitude]);
      });
      map.current.fitBounds(bounds, { padding: 50, maxZoom: 15 });
    }
  }, [properties, mapLoaded, formatPrice, onPropertyClick]);

  return (
    <div className={`relative ${className}`}>
      <div ref={mapContainer} className="w-full h-full min-h-[400px] rounded-lg" />
      <style jsx global>{`
        .property-marker {
          z-index: 1;
        }
        .mapboxgl-popup-content {
          padding: 0;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
      `}</style>
    </div>
  );
}
