'use client';

import { useEffect, useRef, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import type { Property } from '@/types/database';

export type HeatmapMetric = 'price_per_m2' | 'activity' | 'fairness' | 'days_on_market';

interface HeatmapLayerProps {
  map: mapboxgl.Map | null;
  properties: Property[];
  metric: HeatmapMetric;
  visible: boolean;
  opacity?: number;
  radius?: number;
}

/**
 * HeatmapLayer - Waze-style heatmap overlay for market insights
 *
 * Metrics:
 * - price_per_m2: Price intensity by area (red = expensive, blue = affordable)
 * - activity: Listing density and market activity
 * - fairness: Fair price vs overpriced areas
 * - days_on_market: Market velocity (red = slow, green = fast)
 */
export function useHeatmapLayer({
  map,
  properties,
  metric,
  visible,
  opacity = 0.7,
  radius = 30,
}: HeatmapLayerProps) {
  const sourceId = 'heatmap-source';
  const layerId = 'heatmap-layer';
  const isInitialized = useRef(false);

  // Convert properties to GeoJSON with appropriate weight based on metric
  const getGeoJSON = useCallback(() => {
    if (!properties || properties.length === 0) {
      return {
        type: 'FeatureCollection' as const,
        features: [],
      };
    }

    // Calculate normalization values
    const values = properties.map((p) => {
      switch (metric) {
        case 'price_per_m2':
          return p.price_per_m2 || 0;
        case 'activity':
          return 1; // Each property contributes equally
        case 'fairness':
          // Assuming fairness is stored or computed - use price deviation as proxy
          const avgPrice = properties.reduce((sum, prop) => sum + (prop.price_per_m2 || 0), 0) / properties.length;
          return Math.abs((p.price_per_m2 || 0) - avgPrice) / avgPrice;
        case 'days_on_market':
          // Calculate days since listed
          if (p.created_at) {
            const listed = new Date(p.created_at);
            const now = new Date();
            return Math.max(1, Math.floor((now.getTime() - listed.getTime()) / (1000 * 60 * 60 * 24)));
          }
          return 30; // Default 30 days
        default:
          return 1;
      }
    });

    const maxValue = Math.max(...values, 1);
    const minValue = Math.min(...values, 0);
    const range = maxValue - minValue || 1;

    return {
      type: 'FeatureCollection' as const,
      features: properties.map((property, index) => ({
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [property.longitude, property.latitude],
        },
        properties: {
          id: property.id,
          weight: (values[index] - minValue) / range, // Normalized 0-1
          rawValue: values[index],
          title: property.title,
        },
      })),
    };
  }, [properties, metric]);

  // Get color ramp based on metric
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getColorRamp = useCallback((): any => {
    switch (metric) {
      case 'price_per_m2':
        // Blue (affordable) -> Yellow -> Red (expensive)
        return [
          'interpolate',
          ['linear'],
          ['heatmap-density'],
          0, 'rgba(33,102,172,0)',
          0.2, 'rgb(103,169,207)',
          0.4, 'rgb(209,229,240)',
          0.6, 'rgb(253,219,199)',
          0.8, 'rgb(239,138,98)',
          1, 'rgb(178,24,43)',
        ];
      case 'activity':
        // Transparent -> Blue -> Purple (high activity)
        return [
          'interpolate',
          ['linear'],
          ['heatmap-density'],
          0, 'rgba(0,0,255,0)',
          0.3, 'rgb(99,99,255)',
          0.5, 'rgb(127,127,255)',
          0.7, 'rgb(155,89,182)',
          1, 'rgb(142,68,173)',
        ];
      case 'fairness':
        // Green (fair) -> Yellow -> Red (overpriced)
        return [
          'interpolate',
          ['linear'],
          ['heatmap-density'],
          0, 'rgba(34,197,94,0)',
          0.2, 'rgb(74,222,128)',
          0.4, 'rgb(163,230,53)',
          0.6, 'rgb(250,204,21)',
          0.8, 'rgb(249,115,22)',
          1, 'rgb(239,68,68)',
        ];
      case 'days_on_market':
        // Green (fast moving) -> Yellow -> Red (stale)
        return [
          'interpolate',
          ['linear'],
          ['heatmap-density'],
          0, 'rgba(34,197,94,0)',
          0.2, 'rgb(34,197,94)',
          0.4, 'rgb(163,230,53)',
          0.6, 'rgb(250,204,21)',
          0.8, 'rgb(249,115,22)',
          1, 'rgb(239,68,68)',
        ];
      default:
        return [
          'interpolate',
          ['linear'],
          ['heatmap-density'],
          0, 'rgba(0,0,255,0)',
          0.5, 'rgb(0,255,255)',
          1, 'rgb(255,0,0)',
        ];
    }
  }, [metric]);

  // Initialize/update heatmap layer
  useEffect(() => {
    if (!map) return;

    // Wait for map to be fully loaded
    const initHeatmap = () => {
      const geojson = getGeoJSON();

      // Remove existing layer and source if they exist
      if (map.getLayer(layerId)) {
        map.removeLayer(layerId);
      }
      if (map.getSource(sourceId)) {
        map.removeSource(sourceId);
      }

      if (!visible || properties.length === 0) {
        isInitialized.current = false;
        return;
      }

      // Add source
      map.addSource(sourceId, {
        type: 'geojson',
        data: geojson,
      });

      // Add heatmap layer
      map.addLayer({
        id: layerId,
        type: 'heatmap',
        source: sourceId,
        maxzoom: 15,
        paint: {
          // Increase weight as zoom level increases
          'heatmap-weight': [
            'interpolate',
            ['linear'],
            ['zoom'],
            0, ['get', 'weight'],
            15, ['*', ['get', 'weight'], 3],
          ],
          // Increase intensity as zoom level increases
          'heatmap-intensity': [
            'interpolate',
            ['linear'],
            ['zoom'],
            0, 1,
            15, 3,
          ],
          // Color ramp based on metric
          'heatmap-color': getColorRamp(),
          // Adjust radius based on zoom
          'heatmap-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            0, radius / 3,
            15, radius,
          ],
          // Adjust opacity
          'heatmap-opacity': [
            'interpolate',
            ['linear'],
            ['zoom'],
            7, opacity,
            15, opacity * 0.5,
          ],
        },
      });

      isInitialized.current = true;
    };

    if (map.loaded()) {
      initHeatmap();
    } else {
      map.on('load', initHeatmap);
    }

    return () => {
      if (map && map.getLayer(layerId)) {
        map.removeLayer(layerId);
      }
      if (map && map.getSource(sourceId)) {
        map.removeSource(sourceId);
      }
    };
  }, [map, properties, metric, visible, opacity, radius, getGeoJSON, getColorRamp]);

  // Update visibility
  useEffect(() => {
    if (!map || !map.getLayer(layerId)) return;

    map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none');
  }, [map, visible]);

  return null;
}

/**
 * HeatmapControls - UI component for heatmap settings
 */
interface HeatmapControlsProps {
  visible: boolean;
  onVisibleChange: (visible: boolean) => void;
  metric: HeatmapMetric;
  onMetricChange: (metric: HeatmapMetric) => void;
  opacity?: number;
  onOpacityChange?: (opacity: number) => void;
  className?: string;
}

export function HeatmapControls({
  visible,
  onVisibleChange,
  metric,
  onMetricChange,
  opacity = 0.7,
  onOpacityChange,
  className = '',
}: HeatmapControlsProps) {
  const metrics: { value: HeatmapMetric; label: string; icon: string }[] = [
    { value: 'price_per_m2', label: 'Price/m²', icon: '💰' },
    { value: 'activity', label: 'Activity', icon: '📊' },
    { value: 'fairness', label: 'Fair Price', icon: '⚖️' },
    { value: 'days_on_market', label: 'Market Velocity', icon: '⏱️' },
  ];

  return (
    <div className={`bg-white rounded-lg shadow-lg p-3 ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold">🔥 Heatmap</span>
        <button
          onClick={() => onVisibleChange(!visible)}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
            visible ? 'bg-primary' : 'bg-gray-200'
          }`}
          style={visible ? { backgroundColor: '#2563eb' } : {}}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              visible ? 'translate-x-5' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {visible && (
        <>
          {/* Metric selector */}
          <div className="space-y-1">
            {metrics.map((m) => (
              <button
                key={m.value}
                onClick={() => onMetricChange(m.value)}
                className={`w-full text-left px-2 py-1 rounded text-xs transition-colors ${
                  metric === m.value
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'hover:bg-gray-100'
                }`}
              >
                {m.icon} {m.label}
              </button>
            ))}
          </div>

          {/* Opacity slider */}
          {onOpacityChange && (
            <div className="mt-2 pt-2 border-t">
              <label className="text-xs text-gray-500">Opacity</label>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.1"
                value={opacity}
                onChange={(e) => onOpacityChange(parseFloat(e.target.value))}
                className="w-full h-1 mt-1"
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}

/**
 * HeatmapLegend - Color scale legend for heatmap
 */
interface HeatmapLegendProps {
  metric: HeatmapMetric;
  visible: boolean;
  className?: string;
}

export function HeatmapLegend({ metric, visible, className = '' }: HeatmapLegendProps) {
  if (!visible) return null;

  const legends: Record<HeatmapMetric, { label: string; low: string; high: string; gradient: string }> = {
    price_per_m2: {
      label: 'Price/m²',
      low: 'Affordable',
      high: 'Expensive',
      gradient: 'linear-gradient(to right, rgb(33,102,172), rgb(253,219,199), rgb(178,24,43))',
    },
    activity: {
      label: 'Listing Activity',
      low: 'Low',
      high: 'High',
      gradient: 'linear-gradient(to right, rgb(99,99,255), rgb(142,68,173))',
    },
    fairness: {
      label: 'Price Fairness',
      low: 'Fair',
      high: 'Overpriced',
      gradient: 'linear-gradient(to right, rgb(34,197,94), rgb(250,204,21), rgb(239,68,68))',
    },
    days_on_market: {
      label: 'Market Velocity',
      low: 'Fast',
      high: 'Slow',
      gradient: 'linear-gradient(to right, rgb(34,197,94), rgb(250,204,21), rgb(239,68,68))',
    },
  };

  const legend = legends[metric];

  return (
    <div className={`bg-white rounded-lg shadow-lg p-2 ${className}`}>
      <p className="text-xs font-medium mb-1">{legend.label}</p>
      <div
        className="h-2 rounded-full w-24"
        style={{ background: legend.gradient }}
      />
      <div className="flex justify-between text-[10px] text-gray-500 mt-0.5">
        <span>{legend.low}</span>
        <span>{legend.high}</span>
      </div>
    </div>
  );
}
