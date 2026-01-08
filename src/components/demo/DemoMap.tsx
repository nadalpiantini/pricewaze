'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import type { Property, PropertySignalTypeState } from '@/types/database';
import { getMarketConfig } from '@/config/market';
import { DEMO_PROPERTIES, getDemoSignals } from '@/lib/demo-data';
import { isPositiveSignal } from '@/lib/signals';
import { buildSignalsPopup } from '@/lib/buildSignalsPopup';
import { analytics } from '@/lib/analytics';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

const marketConfig = getMarketConfig();
const DEFAULT_CENTER: [number, number] = marketConfig.map.center;
const DEFAULT_ZOOM = marketConfig.map.zoom;

interface PropertyWithSignals extends Property {
  signalStates?: PropertySignalTypeState[];
  signalStrength?: number;
  hasConfirmedSignals?: boolean;
  hasPositiveSignals?: boolean;
}

/**
 * Demo Map Component
 * Shows 3 demo properties with different signal states
 */
export function DemoMap() {
  const router = useRouter();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [propertiesWithSignals, setPropertiesWithSignals] = useState<PropertyWithSignals[]>([]);

  // Enhance properties with demo signals
  useEffect(() => {
    const enhanced = DEMO_PROPERTIES.map((property) => {
      const signals = getDemoSignals(property.id);
      const maxStrength = Math.max(...signals.map(s => s.strength), 0);
      const hasConfirmed = signals.some(s => s.confirmed);
      const hasPositive = signals.some(s => s.confirmed && isPositiveSignal(s.signal_type));

      return {
        ...property,
        signalStates: signals,
        signalStrength: maxStrength,
        hasConfirmedSignals: hasConfirmed,
        hasPositiveSignals: hasPositive,
      };
    });

    setPropertiesWithSignals(enhanced);
  }, []);

  // Track demo start
  useEffect(() => {
    analytics.track('demo_started');
  }, []);

  // Handle property click
  const handlePropertyClick = useCallback((property: Property) => {
    analytics.track('demo_property_clicked', { property_id: property.id });
    router.push(`/demo/property/${property.id}`);
  }, [router]);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    map.current.on('load', () => {
      setMapLoaded(true);
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Get pin color based on signal state
  const getPinColor = useCallback((property: PropertyWithSignals): string => {
    if (property.hasPositiveSignals) {
      return '#16a34a'; // Green
    }
    if (property.hasConfirmedSignals) {
      return '#dc2626'; // Red (high pressure)
    }
    if (property.signalStrength && property.signalStrength > 0) {
      return '#9ca3af'; // Gray (weak signal)
    }
    return '#2563eb'; // Blue (clean)
  }, []);

  // Get pin size based on signal strength
  const getPinSize = useCallback((property: PropertyWithSignals): number => {
    if (!property.signalStrength || property.signalStrength === 0) {
      return 8; // Default size
    }
    return Math.min(8 + (property.signalStrength * 0.6), 14);
  }, []);

  // Update markers when properties change
  useEffect(() => {
    if (!map.current || !mapLoaded || propertiesWithSignals.length === 0) return;

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    // Add markers
    propertiesWithSignals.forEach((property) => {
      const pinColor = getPinColor(property);
      const pinSize = getPinSize(property);
      
      const el = document.createElement('div');
      el.className = 'property-marker';
      el.style.width = `${pinSize}px`;
      el.style.height = `${pinSize}px`;
      el.style.borderRadius = '50%';
      el.style.backgroundColor = pinColor;
      el.style.border = '2px solid white';
      el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
      el.style.cursor = 'pointer';
      el.style.transition = 'transform 0.2s';
      
      el.addEventListener('mouseenter', () => {
        el.style.transform = 'scale(1.2)';
      });
      el.addEventListener('mouseleave', () => {
        el.style.transform = 'scale(1)';
      });

      // Build popup content
      const signalsHtml = property.signalStates && property.signalStates.length > 0
        ? buildSignalsPopup(property.signalStates)
        : '';

      // Demo-specific tooltip copy (W1.1 exact copy)
      let tooltipCopy = '';
      if (property.id === 'demo-prop-1') {
        tooltipCopy = '<div class="mt-2 pt-2 border-t border-gray-200"><p class="text-xs font-semibold text-red-600">🔴 High pressure</p><p class="text-xs text-gray-600">3 active offers</p><p class="text-xs text-gray-600">7 recent visits</p></div>';
      } else if (property.id === 'demo-prop-2') {
        tooltipCopy = '<div class="mt-2 pt-2 border-t border-gray-200"><p class="text-xs font-semibold text-gray-600">⚪ Moderate activity</p><p class="text-xs text-gray-600">Some recent visits</p></div>';
      } else {
        tooltipCopy = '<div class="mt-2 pt-2 border-t border-gray-200"><p class="text-xs font-semibold text-blue-600">🔵 Quiet market</p><p class="text-xs text-gray-600">No relevant signals</p></div>';
      }

      const popupContent = `
        <div class="p-2 min-w-[200px]">
          <h3 class="font-semibold text-sm cursor-pointer hover:underline">${property.title}</h3>
          <p class="text-gray-600 text-xs">${property.address}</p>
          <div class="flex justify-between mt-2 text-xs">
            <span>${property.area_m2} m²</span>
            <span class="font-semibold">$${property.price.toLocaleString()}</span>
          </div>
          ${signalsHtml ? `<div class="mt-2 pt-2 border-t border-gray-200">${signalsHtml}</div>` : ''}
          ${tooltipCopy}
        </div>
      `;

      const popup = new mapboxgl.Popup({ 
        closeButton: false, 
        offset: 12 
      }).setHTML(popupContent);

      const marker = new mapboxgl.Marker(el)
        .setLngLat([property.longitude, property.latitude])
        .addTo(map.current!);

      el.addEventListener('mouseenter', () => {
        popup.setLngLat([property.longitude, property.latitude]).addTo(map.current!);
        map.current!.getCanvas().style.cursor = 'pointer';
      });

      el.addEventListener('mouseleave', () => {
        popup.remove();
        map.current!.getCanvas().style.cursor = '';
      });

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        handlePropertyClick(property);
      });

      markersRef.current.push(marker);
    });

    // Fit bounds
    if (propertiesWithSignals.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      propertiesWithSignals.forEach((p) => {
        bounds.extend([p.longitude, p.latitude]);
      });
      map.current.fitBounds(bounds, { padding: 50, maxZoom: 15 });
    }
  }, [propertiesWithSignals, mapLoaded, getPinColor, getPinSize, handlePropertyClick]);

  return (
    <div className="relative w-full h-full min-h-[500px]">
      <div ref={mapContainer} className="w-full h-full rounded-lg" />
      
      {/* Floating CTA */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-lg p-4 text-center z-10 max-w-md">
        <p className="text-sm text-gray-700">
          👉 Click on a property
        </p>
      </div>

      {/* Legend */}
      <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-3 text-xs space-y-1 z-10">
        <p className="font-semibold mb-2">Legend:</p>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500"></div>
          <span>Quiet market</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-gray-400"></div>
          <span>Moderate activity</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <span>High pressure</span>
        </div>
      </div>
    </div>
  );
}

