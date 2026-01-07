'use client';

import { useState, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { MapPin, Navigation, Trash2, GripVertical } from 'lucide-react';
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

interface DraggableRouteStopsListProps {
  stops: Stop[];
  onReorder?: (newOrder: Stop[]) => void;
  onDeleteStop?: (stopId: string) => void;
  showNavigation?: boolean;
  className?: string;
}

function SortableStopItem({
  stop,
  onDelete,
  showNavigation,
}: {
  stop: Stop;
  onDelete?: (stopId: string) => void;
  showNavigation?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: stop.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleOpenWaze = () => {
    openWaze(stop.location.lat, stop.location.lng);
  };

  return (
    <div
      ref={setNodeRef}
      data-testid="route-stop"
      style={style}
      className={`p-4 border rounded-lg bg-white hover:shadow-md transition-shadow ${
        isDragging ? 'shadow-lg' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1">
          {/* Drag handle */}
          <button
            {...attributes}
            {...listeners}
            className="flex-shrink-0 mt-1 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
          >
            <GripVertical className="h-5 w-5" />
          </button>

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
              onClick={handleOpenWaze}
              title="Open in Waze"
              className="h-8 w-8"
            >
              <Navigation className="h-4 w-4" />
            </Button>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onDelete(stop.id)}
              title="Remove stop"
              className="h-8 w-8 text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export function DraggableRouteStopsList({
  stops,
  onReorder,
  onDeleteStop,
  showNavigation = true,
  className = '',
}: DraggableRouteStopsListProps) {
  const [items, setItems] = useState(stops);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Update items when stops prop changes
  useEffect(() => {
    setItems(stops);
  }, [stops]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setItems((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        const newOrder = arrayMove(items, oldIndex, newIndex);
        
        // Update order_index for each item
        const updatedOrder = newOrder.map((item, index) => ({
          ...item,
          order_index: index,
        }));

        // Call onReorder callback
        onReorder?.(updatedOrder);

        return updatedOrder;
      });
    }
  };

  if (items.length === 0) {
    return (
      <div className={`p-6 text-center text-gray-500 ${className}`}>
        <MapPin className="mx-auto h-12 w-12 text-gray-300 mb-2" />
        <p>No stops added yet</p>
        <p className="text-sm mt-1">Add properties to start planning your route</p>
      </div>
    );
  }

  const sortedItems = [...items].sort((a, b) => a.order_index - b.order_index);

  const handleOpenGoogleMaps = () => {
    const stopPoints = sortedItems.map((s) => ({
      lat: s.location.lat,
      lng: s.location.lng,
      address: s.address,
    }));
    openGoogleMaps(stopPoints);
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={sortedItems.map((s) => s.id)}
          strategy={verticalListSortingStrategy}
        >
          {sortedItems.map((stop) => (
            <SortableStopItem
              key={stop.id}
              stop={stop}
              onDelete={onDeleteStop}
              showNavigation={showNavigation}
            />
          ))}
        </SortableContext>
      </DndContext>

      {/* Navigation CTA */}
      {showNavigation && sortedItems.length > 0 && (
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

