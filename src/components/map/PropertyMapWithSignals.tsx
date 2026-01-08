'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import type { Property, PropertySignalTypeState } from '@/types/database';
import { getMarketConfig } from '@/config/market';
import { createClient } from '@/lib/supabase/client';
import { isPositiveSignal } from '@/lib/signals';
import { buildSignalsPopup } from '@/lib/buildSignalsPopup';
import { ConfirmedToggle } from '@/components/ConfirmedToggle';
import { useHeatmapLayer, HeatmapControls, HeatmapLegend, type HeatmapMetric } from './HeatmapLayer';

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
  const router = useRouter();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [propertiesWithSignals, setPropertiesWithSignals] = useState<PropertyWithSignals[]>([]);
  const [onlyConfirmed, setOnlyConfirmed] = useState(() => {
    // Load preference from localStorage on mount
    if (typeof globalThis.window !== 'undefined') {
      const saved = globalThis.window.localStorage.getItem('pricewaze-map-only-confirmed');
      return saved === 'true';
    }
    return false;
  });

  // Heatmap state
  const [heatmapVisible, setHeatmapVisible] = useState(false);
  const [heatmapMetric, setHeatmapMetric] = useState<HeatmapMetric>('price_per_m2');
  const [heatmapOpacity, setHeatmapOpacity] = useState(0.7);

  const supabase = createClient();

  // Ensure properties is always an array (defensive programming)
  const safeProperties = Array.isArray(properties) ? properties : [];

  // Initialize heatmap layer
  useHeatmapLayer({
    map: map.current,
    properties: safeProperties,
    metric: heatmapMetric,
    visible: heatmapVisible,
    opacity: heatmapOpacity,
  });

  // Save preference to localStorage when it changes
  useEffect(() => {
    if (typeof globalThis.window !== 'undefined') {
      globalThis.window.localStorage.setItem('pricewaze-map-only-confirmed', String(onlyConfirmed));
    }
  }, [onlyConfirmed]);

  // Handle property click - navigate to detail page if no custom handler
  const handlePropertyClick = useCallback((property: Property) => {
    if (onPropertyClick) {
      onPropertyClick(property);
    } else {
      // Default behavior: navigate to property detail page
      router.push(`/properties/${property.id}`);
    }
  }, [onPropertyClick, router]);

  // Fetch signal states for all properties
  useEffect(() => {
    if (!Array.isArray(safeProperties) || safeProperties.length === 0) {
      setPropertiesWithSignals([]);
      return;
    }

    async function fetchSignalStates() {
      const propertyIds = safeProperties.map(p => p.id);
      
      const { data: signalStates, error } = await supabase
        .from('pricewaze_property_signal_state')
        .select('*')
        .in('property_id', propertyIds)
        .gt('strength', 0);

      if (error) {
        console.error('Error fetching signal states:', error);
        setPropertiesWithSignals(safeProperties);
        return;
      }

      // Ensure signalStates is an array
      const safeSignalStates = Array.isArray(signalStates) ? signalStates : [];

      // Group signals by property
      const signalsByProperty = new Map<string, PropertySignalTypeState[]>();
      safeSignalStates.forEach((state) => {
        const existing = signalsByProperty.get(state.property_id) || [];
        existing.push(state);
        signalsByProperty.set(state.property_id, existing);
      });

      // Enhance properties with signal data
      const enhanced = safeProperties.map((property) => {
        const signals = signalsByProperty.get(property.id) || [];
        const maxStrength = signals.length > 0 ? Math.max(...signals.map(s => s.strength), 0) : 0;
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
          table: 'pricewaze_property_signal_state',
        },
        () => {
          // Refetch signal states when any signal changes
          fetchSignalStates();
        }
      )
      .subscribe((status) => {
        // Silently handle connection errors
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          // Connection failed - will fallback to polling via refetch
          if (process.env.NODE_ENV === 'development') {
            console.debug('[Realtime] Connection unavailable for property-signals-map');
          }
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [safeProperties, supabase]);

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
      // Track map viewed event (L1.2)
      if (typeof window !== 'undefined') {
        import('@/lib/analytics').then(({ analytics }) => {
          analytics.track('map_viewed', {
            timestamp: new Date().toISOString(),
          });
        });
      }
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

    // Filter properties based on onlyConfirmed toggle
    const filteredProperties = onlyConfirmed
      ? propertiesWithSignals.filter((p) => p.hasConfirmedSignals)
      : propertiesWithSignals;

    // Add new markers with signal-aware styling
    filteredProperties.forEach((property) => {
      const pinColor = getPinColor(property);
      const pinSize = getPinSize(property);
      
      // Create custom marker element
      const el = document.createElement('div');
      el.className = 'property-marker';
      el.setAttribute('data-testid', 'property-pin');
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

      // Build popup content with signals using helper
      const signalsHtml = property.signalStates && property.signalStates.length > 0
        ? buildSignalsPopup(property.signalStates)
        : '';

      const popupContent = `
        <div class="p-2 min-w-[200px]">
          <h3 class="font-semibold text-sm cursor-pointer hover:underline" onclick="window.location.href='/properties/${property.id}'">${property.title}</h3>
          <p class="text-gray-600 text-xs">${property.address}</p>
          <div class="flex justify-between mt-2 text-xs">
            <span>${property.area_m2} m²</span>
            <span class="font-semibold">$${property.price.toLocaleString()}</span>
          </div>
          <p class="text-xs text-gray-500 mt-1">$${property.price_per_m2.toLocaleString()}/m²</p>
          ${signalsHtml ? `<div class="mt-2 pt-2 border-t border-gray-200">${signalsHtml}</div>` : ''}
          <button 
            onclick="window.location.href='/properties/${property.id}'"
            class="mt-2 w-full px-3 py-1.5 text-xs font-medium text-white bg-primary hover:bg-primary/90 rounded-md transition-colors"
            style="background-color: #2563eb;"
          >
            View details
          </button>
        </div>
      `;

      // Create popup for hover
      const popup = new mapboxgl.Popup({ 
        closeButton: false, 
        offset: 12 
      }).setHTML(popupContent);

      const marker = new mapboxgl.Marker(el)
        .setLngLat([property.longitude, property.latitude])
        .addTo(map.current!);

      // Show popup on hover
      el.addEventListener('mouseenter', () => {
        popup.setLngLat([property.longitude, property.latitude]).addTo(map.current!);
        map.current!.getCanvas().style.cursor = 'pointer';
      });

      // Hide popup on mouse leave
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

    // Fit bounds if we have properties
    if (filteredProperties.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      filteredProperties.forEach((p) => {
        bounds.extend([p.longitude, p.latitude]);
      });
      map.current.fitBounds(bounds, { padding: 50, maxZoom: 15 });
    }
  }, [propertiesWithSignals, mapLoaded, getPinColor, getPinSize, handlePropertyClick, onlyConfirmed]);

  return (
    <div className={`relative ${className}`}>
      <div className="mb-2">
        <ConfirmedToggle
          value={onlyConfirmed}
          onChange={setOnlyConfirmed}
        />
      </div>
      <div ref={mapContainer} data-testid="mapbox-map" className="w-full h-full min-h-[400px] rounded-lg" />

      {/* Heatmap Controls - Top Right */}
      <HeatmapControls
        visible={heatmapVisible}
        onVisibleChange={setHeatmapVisible}
        metric={heatmapMetric}
        onMetricChange={setHeatmapMetric}
        opacity={heatmapOpacity}
        onOpacityChange={setHeatmapOpacity}
        className="absolute top-4 right-14 z-10"
      />

      {/* Heatmap Legend - Bottom Right */}
      <HeatmapLegend
        metric={heatmapMetric}
        visible={heatmapVisible}
        className="absolute bottom-4 right-4 z-10"
      />

      {/* Signals Legend - Bottom Left */}
      <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-3 text-xs space-y-1 z-10">
        <p className="font-semibold mb-2">Signals:</p>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500"></div>
          <span>No signals</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-gray-400"></div>
          <span>Unconfirmed</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <span>Negative</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span>Positive</span>
        </div>
      </div>
    </div>
  );
}

