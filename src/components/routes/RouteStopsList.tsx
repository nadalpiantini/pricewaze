'use client';

import { Button } from '@/components/ui/button';
import { MapPin, Navigation, Trash2 } from 'lucide-react';
import { openWaze, openGoogleMaps } from '@/lib/navigation';

interface Stop {
  id: string;
  address: string;
  location: { lat: number; lng: number };
  order_index: number;
  property?: {
    id: string;
    title: string;
    price: number;
    images?: string[];
  } | null;
}

interface RouteStopsListProps {
  stops: Stop[];
  onDeleteStop?: (stopId: string) => void;
  showNavigation?: boolean;
  className?: string;
}

export function RouteStopsList({
  stops,
  onDeleteStop,
  showNavigation = true,
  className = '',
}: RouteStopsListProps) {
  const sortedStops = [...stops].sort((a, b) => a.order_index - b.order_index);

  const handleOpenWaze = (stop: Stop) => {
    openWaze(stop.location.lat, stop.location.lng);
  };

  const handleOpenGoogleMaps = () => {
    const stopPoints = sortedStops.map((s) => ({
      lat: s.location.lat,
      lng: s.location.lng,
      address: s.address,
    }));
    openGoogleMaps(stopPoints);
  };

  if (sortedStops.length === 0) {
    return (
      <div className={`p-6 text-center text-gray-500 ${className}`}>
        <MapPin className="mx-auto h-12 w-12 text-gray-300 mb-2" />
        <p>No stops added yet</p>
        <p className="text-sm mt-1">Add properties to start planning your route</p>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {sortedStops.map((stop, index) => (
        <div
          key={stop.id}
          className="p-4 border rounded-lg bg-white hover:shadow-md transition-shadow"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1">
              {/* Order number badge */}
              <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold text-sm">
                {stop.order_index + 1}
              </div>

              {/* Stop info */}
              <div className="flex-1 min-w-0">
                {stop.property ? (
                  <>
                    <div className="font-semibold text-sm truncate">{stop.property.title}</div>
                    <div className="text-xs text-gray-500 mt-0.5 truncate">{stop.address}</div>
                    <div className="text-xs font-medium text-gray-700 mt-1">
                      ${stop.property.price.toLocaleString()}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="font-semibold text-sm">{stop.address}</div>
                  </>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 flex-shrink-0">
              {showNavigation && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => handleOpenWaze(stop)}
                  title="Open in Waze"
                  className="h-8 w-8"
                >
                  <Navigation className="h-4 w-4" />
                </Button>
              )}
              {onDeleteStop && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => onDeleteStop(stop.id)}
                  title="Remove stop"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      ))}

      {/* Navigation CTA */}
      {showNavigation && sortedStops.length > 0 && (
        <div className="pt-4 border-t">
          <Button
            onClick={handleOpenGoogleMaps}
            className="w-full"
            variant="default"
          >
            <Navigation className="h-4 w-4 mr-2" />
            Start Navigation (Google Maps)
          </Button>
        </div>
      )}
    </div>
  );
}

