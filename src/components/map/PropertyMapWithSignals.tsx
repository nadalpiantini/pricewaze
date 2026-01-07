'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import type { Property, PropertySignalTypeState } from '@/types/database';
import { getMarketConfig } from '@/config/market';
import { createClient } from '@/lib/supabase/client';
import { getSignalIcon } from '@/lib/signals';
import { isPositiveSignal } from '@/lib/signals';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

// Get market-specific map configuration
const marketConfig = getMarketConfig();
const DEFAULT_CENTER: [number, number] = marketConfig.map.center;
const DEFAULT_ZOOM = marketConfig.map.zoom;

interface PropertyWithSignals extends Property {
  signalStates?: PropertySignalTypeState[];
  signalStrength?: number;
  hasConfirmedSignals?: boolean;
  hasPositiveSignals?: boolean;
}

interface PropertyMapWithSignalsProps {
  properties: Property[];
  onPropertyClick?: (property: Property) => void;
  onMapClick?: (lngLat: { lng: number; lat: number }) => void;
  center?: [number, number];
  zoom?: number;
  className?: string;
}

/**
 * PropertyMapWithSignals Component (Waze-style)
 * Displays properties on map with dynamic pin colors based on signal states:
 * - Blue: No signals
 * - Gray: Unconfirmed signals
 * - Red: Confirmed negative signals
 * - Green: Confirmed positive signals
 */
export function PropertyMapWithSignals({
  properties,
  onPropertyClick,
  onMapClick,
  center = DEFAULT_CENTER,
  zoom = DEFAULT_ZOOM,
  className = '',
}: PropertyMapWithSignalsProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [propertiesWithSignals, setPropertiesWithSignals] = useState<PropertyWithSignals[]>([]);
  const supabase = createClient();

  // Fetch signal states for all properties
  useEffect(() => {
    if (properties.length === 0) return;

    async function fetchSignalStates() {
      const propertyIds = properties.map(p => p.id);
      
      const { data: signalStates, error } = await supabase
        .from('pricewaze_property_signal_type_state')
        .select('*')
        .in('property_id', propertyIds)
        .gt('strength', 0);

      if (error) {
        console.error('Error fetching signal states:', error);
        setPropertiesWithSignals(properties);
        return;
      }

      // Group signals by property
      const signalsByProperty = new Map<string, PropertySignalTypeState[]>();
      signalStates?.forEach((state) => {
        const existing = signalsByProperty.get(state.property_id) || [];
        existing.push(state);
        signalsByProperty.set(state.property_id, existing);
      });

      // Enhance properties with signal data
      const enhanced = properties.map((property) => {
        const signals = signalsByProperty.get(property.id) || [];
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
    }

    fetchSignalStates();

    // Subscribe to realtime updates for signal states
    const channel = supabase
      .channel('property-signals-map')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pricewaze_property_signal_type_state',
        },
        () => {
          // Refetch signal states when any signal changes
          fetchSignalStates();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [properties, supabase]);

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

  // Get pin color based on signal state
  const getPinColor = useCallback((property: PropertyWithSignals): string => {
    if (property.hasPositiveSignals) {
      return '#16a34a'; // Green for confirmed positive signals
    }
    if (property.hasConfirmedSignals) {
      return '#dc2626'; // Red for confirmed negative signals
    }
    if (property.signalStrength && property.signalStrength > 0) {
      return '#9ca3af'; // Gray for unconfirmed signals
    }
    return '#2563eb'; // Blue for no signals
  }, []);

  // Get pin size based on signal strength
  const getPinSize = useCallback((property: PropertyWithSignals): number => {
    if (!property.signalStrength || property.signalStrength === 0) {
      return 6; // Default size
    }
    // Scale from 6 to 14 based on strength (0-10 range)
    return Math.min(6 + (property.signalStrength * 0.8), 14);
  }, []);

  // Update markers when properties with signals change
  useEffect(() => {
    if (!map.current || !mapLoaded || propertiesWithSignals.length === 0) return;

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    // Add new markers with signal-aware styling
    propertiesWithSignals.forEach((property) => {
      const pinColor = getPinColor(property);
      const pinSize = getPinSize(property);
      
      // Create custom marker element
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

      // Build popup content with signals
      let popupContent = `
        <div class="p-2 min-w-[200px]">
          <h3 class="font-semibold text-sm">${property.title}</h3>
          <p class="text-gray-600 text-xs">${property.address}</p>
          <div class="flex justify-between mt-2 text-xs">
            <span>${property.area_m2} m²</span>
            <span class="font-semibold">$${property.price.toLocaleString()}</span>
          </div>
          <p class="text-xs text-gray-500 mt-1">$${property.price_per_m2.toLocaleString()}/m²</p>
      `;

      // Add signals to popup if they exist
      if (property.signalStates && property.signalStates.length > 0) {
        popupContent += `
          <div class="mt-2 pt-2 border-t border-gray-200">
            <p class="text-xs font-semibold mb-1">Señales:</p>
            <div class="flex flex-wrap gap-1">
        `;
        
        property.signalStates.forEach((signal) => {
          const icon = getSignalIcon(signal.signal_type);
          const strength = Math.round(signal.strength);
          const confirmed = signal.confirmed ? '✓' : '';
          popupContent += `
            <span class="text-xs px-1.5 py-0.5 rounded ${
              signal.confirmed 
                ? (isPositiveSignal(signal.signal_type) ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800')
                : 'bg-gray-100 text-gray-700'
            }">
              ${icon} ${strength}${confirmed}
            </span>
          `;
        });
        
        popupContent += `
            </div>
          </div>
        `;
      }

      popupContent += `</div>`;

      // Create popup
      const popup = new mapboxgl.Popup({ offset: 25, closeButton: false }).setHTML(popupContent);

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
    if (propertiesWithSignals.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      propertiesWithSignals.forEach((p) => {
        bounds.extend([p.longitude, p.latitude]);
      });
      map.current.fitBounds(bounds, { padding: 50, maxZoom: 15 });
    }
  }, [propertiesWithSignals, mapLoaded, getPinColor, getPinSize, onPropertyClick]);

  return (
    <div className={`relative ${className}`}>
      <div ref={mapContainer} className="w-full h-full min-h-[400px] rounded-lg" />
      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-3 text-xs space-y-1 z-10">
        <p className="font-semibold mb-2">Leyenda:</p>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500"></div>
          <span>Sin señales</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-gray-400"></div>
          <span>Señales no confirmadas</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <span>Señales confirmadas (negativas)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span>Señales confirmadas (positivas)</span>
        </div>
      </div>
    </div>
  );
}

