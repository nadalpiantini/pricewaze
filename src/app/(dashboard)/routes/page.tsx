'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import dynamic from 'next/dynamic';

// Lazy load RouteMap (heavy component with Mapbox)
const RouteMap = dynamic(
  () => import('@/components/routes/RouteMap').then((mod) => ({ default: mod.RouteMap })),
  { ssr: false, loading: () => <div className="h-[400px] bg-gray-100 rounded-lg animate-pulse" /> }
);
import { RouteStopsList } from '@/components/routes/RouteStopsList';
import { DraggableRouteStopsList } from '@/components/routes/DraggableRouteStopsList';
import { Clock, MapPin, Navigation, Plus, Route, Search, Sparkles, Trash2 } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { copyRouteLink, downloadRouteAsText, shareRoute } from '@/lib/routeExport';
import type { Property } from '@/types/database';

interface VisitRoute {
  id: string;
  user_id: string;
  name: string;
  start_location: { coordinates: [number, number] } | null;
  created_at: string;
  updated_at: string;
  stops?: VisitStop[];
}

interface VisitStop {
  id: string;
  route_id: string;
  property_id: string | null;
  address: string;
  location: { lat: number; lng: number };
  order_index: number;
  property?: {
    id: string;
    title: string;
    address: string;
    images?: string[];
    price: number;
    area_m2: number;
    latitude: number;
    longitude: number;
  } | null;
}

// Fetch routes
async function fetchRoutes(): Promise<VisitRoute[]> {
  const res = await fetch('/api/routes');
  if (!res.ok) throw new Error('Failed to fetch routes');
  return res.json();
}

// Fetch single route with stops
async function fetchRoute(id: string): Promise<VisitRoute> {
  const res = await fetch(`/api/routes/${id}`);
  if (!res.ok) throw new Error('Failed to fetch route');
  return res.json();
}

// Create route
async function createRoute(name: string): Promise<VisitRoute> {
  const res = await fetch('/api/routes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error('Failed to create route');
  return res.json();
}

// Delete route
async function deleteRoute(id: string): Promise<void> {
  const res = await fetch(`/api/routes/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete route');
}

// Optimize route
interface LineStringGeometry {
  type: 'LineString';
  coordinates: [number, number][];
}

async function optimizeRoute(id: string): Promise<{ geometry: LineStringGeometry | null; order: number[]; distance?: number; duration?: number }> {
  const res = await fetch(`/api/routes/${id}/optimize`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to optimize route');
  return res.json();
}

// Add stop
async function addStop(routeId: string, address: string, location: { lat: number; lng: number }, propertyId?: string): Promise<VisitStop> {
  const res = await fetch(`/api/routes/${routeId}/stops`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address, location, property_id: propertyId }),
  });
  if (!res.ok) throw new Error('Failed to add stop');
  return res.json();
}

// Delete stop
async function deleteStop(routeId: string, stopId: string): Promise<void> {
  const res = await fetch(`/api/routes/${routeId}/stops/${stopId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete stop');
}

// Reorder stops
async function reorderStops(routeId: string, stops: Array<{ id: string; order_index: number }>): Promise<void> {
  // Update each stop's order_index
  const promises = stops.map((stop) =>
    fetch(`/api/routes/${routeId}/stops/${stop.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_index: stop.order_index }),
    })
  );
  
  const results = await Promise.all(promises);
  const failed = results.some((r) => !r.ok);
  if (failed) throw new Error('Failed to reorder stops');
}

// Fetch properties for adding to route
async function fetchProperties(): Promise<Property[]> {
  const res = await fetch('/api/properties?status=active&limit=50');
  if (!res.ok) throw new Error('Failed to fetch properties');
  const response = await res.json();
  // API returns { data: [...], pagination: {...} }, extract data array
  return Array.isArray(response.data) ? response.data : Array.isArray(response) ? response : [];
}

export default function RoutesPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [addStopDialogOpen, setAddStopDialogOpen] = useState(false);
  const [routeName, setRouteName] = useState('');
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [optimizedGeometry, setOptimizedGeometry] = useState<{ type: 'LineString'; coordinates: [number, number][] } | null>(null);
  const [routeStats, setRouteStats] = useState<{ distance?: number; duration?: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch routes list
  const { data: routes = [], isLoading } = useQuery({
    queryKey: ['routes'],
    queryFn: fetchRoutes,
    enabled: !!user,
  });

  // Fetch selected route with stops
  const { data: selectedRoute, isLoading: loadingRoute } = useQuery({
    queryKey: ['route', selectedRouteId],
    queryFn: () => fetchRoute(selectedRouteId!),
    enabled: !!selectedRouteId,
  });

  // Reset optimized geometry and stats when route changes
  useEffect(() => {
    if (selectedRouteId) {
      setOptimizedGeometry(null);
      setRouteStats(null);
    }
  }, [selectedRouteId]);

  // Create route mutation
  const createMutation = useMutation({
    mutationFn: createRoute,
    onSuccess: (newRoute) => {
      queryClient.invalidateQueries({ queryKey: ['routes'] });
      setCreateDialogOpen(false);
      setRouteName('');
      setSelectedRouteId(newRoute.id);
    },
  });

  // Delete route mutation
  const deleteMutation = useMutation({
    mutationFn: deleteRoute,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routes'] });
      if (selectedRouteId) {
        setSelectedRouteId(null);
      }
    },
  });

  // Fetch properties for adding stops
  const { data: properties = [] } = useQuery({
    queryKey: ['properties-for-routes'],
    queryFn: fetchProperties,
    enabled: addStopDialogOpen,
  });

  // Filter properties by search
  const filteredProperties = properties.filter((p) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      p.title.toLowerCase().includes(query) ||
      p.address.toLowerCase().includes(query)
    );
  });

  // Optimize route mutation
  const optimizeMutation = useMutation({
    mutationFn: optimizeRoute,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['route', selectedRouteId] });
      // Store optimized geometry for map display
      setOptimizedGeometry(data.geometry);
      // Store route statistics
      setRouteStats({
        distance: data.distance,
        duration: data.duration,
      });
    },
  });

  // Add stop mutation
  const addStopMutation = useMutation({
    mutationFn: ({ routeId, address, location, propertyId }: { routeId: string; address: string; location: { lat: number; lng: number }; propertyId?: string }) =>
      addStop(routeId, address, location, propertyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['route', selectedRouteId] });
    },
  });

  // Delete stop mutation
  const deleteStopMutation = useMutation({
    mutationFn: ({ routeId, stopId }: { routeId: string; stopId: string }) =>
      deleteStop(routeId, stopId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['route', selectedRouteId] });
    },
  });

  // Reorder stops mutation
  const reorderMutation = useMutation({
    mutationFn: (stops: Array<{ id: string; order_index: number }>) => {
      if (!selectedRouteId) throw new Error('No route selected');
      return reorderStops(selectedRouteId, stops);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['route', selectedRouteId] });
      // Clear optimized geometry since order changed
      setOptimizedGeometry(null);
      setRouteStats(null);
    },
  });

  const handleCreateRoute = () => {
    if (routeName.trim()) {
      createMutation.mutate(routeName.trim());
    }
  };

  const handleOptimize = () => {
    if (selectedRouteId) {
      optimizeMutation.mutate(selectedRouteId);
    }
  };

  const handleDeleteStop = (stopId: string) => {
    if (selectedRouteId) {
      deleteStopMutation.mutate({ routeId: selectedRouteId, stopId });
    }
  };

  const handleAddPropertyStop = (property: Property) => {
    if (selectedRouteId) {
      addStopMutation.mutate({
        routeId: selectedRouteId,
        address: property.address,
        location: { lat: property.latitude, lng: property.longitude },
        propertyId: property.id,
      });
      setAddStopDialogOpen(false);
      setSearchQuery('');
    }
  };

  // Use optimized geometry if available, otherwise undefined
  const routeGeometry = optimizedGeometry || undefined;

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Visit Routes</h1>
          <p className="text-gray-600 mt-1">Plan and optimize your property visits</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Route
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Routes List */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>My Routes</CardTitle>
              <CardDescription>Select a route to view and edit</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-gray-500">Loading routes...</div>
              ) : routes.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Route className="h-12 w-12 mx-auto text-gray-300 mb-2" />
                  <p>No routes yet</p>
                  <p className="text-sm mt-1">Create your first route to get started</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {routes.map((route) => (
                    <div
                      key={route.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedRouteId === route.id
                          ? 'bg-blue-50 border-blue-500'
                          : 'hover:bg-gray-50'
                      }`}
                      onClick={() => setSelectedRouteId(route.id)}
                    >
                      <div className="font-semibold">{route.name}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        Created {new Date(route.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Route Details */}
        <div className="lg:col-span-2 space-y-6">
          {selectedRouteId ? (
            loadingRoute ? (
              <Card>
                <CardContent className="py-12 text-center text-gray-500">
                  Loading route...
                </CardContent>
              </Card>
            ) : selectedRoute ? (
              <>
                {/* Route Header */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>{selectedRoute.name}</CardTitle>
                        <CardDescription>
                          {selectedRoute.stops?.length || 0} stops
                          {routeStats && (
                            <span className="ml-4 flex items-center gap-4">
                              {routeStats.distance && (
                                <span data-testid="route-distance" className="flex items-center gap-1">
                                  <Navigation className="h-3 w-3" />
                                  {(routeStats.distance / 1000).toFixed(1)} km
                                </span>
                              )}
                              {routeStats.duration && (
                                <span data-testid="route-duration" className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {Math.round(routeStats.duration / 60)} min
                                </span>
                              )}
                            </span>
                          )}
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        {selectedRoute.stops && selectedRoute.stops.length >= 2 && (
                          <Button
                            data-testid="optimize-route-button"
                            variant="outline"
                            onClick={handleOptimize}
                            disabled={optimizeMutation.isPending}
                          >
                            <Sparkles className="h-4 w-4 mr-2" />
                            {optimizeMutation.isPending ? 'Optimizing...' : 'Optimize Route'}
                          </Button>
                        )}
                        <Button
                          variant="destructive"
                          onClick={() => deleteMutation.mutate(selectedRoute.id)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                </Card>

                {/* Map */}
                {selectedRoute.stops && selectedRoute.stops.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Route Map</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <RouteMap
                        geometry={routeGeometry}
                        stops={selectedRoute.stops}
                        className="h-[400px] rounded-lg"
                      />
                    </CardContent>
                  </Card>
                )}

                {/* Stops List */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Stops</CardTitle>
                        <CardDescription>Properties in your route</CardDescription>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setAddStopDialogOpen(true)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Stop
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <DraggableRouteStopsList
                      stops={selectedRoute.stops || []}
                      onReorder={(newOrder) => {
                        reorderMutation.mutate(
                          newOrder.map((stop, index) => ({
                            id: stop.id,
                            order_index: index,
                          }))
                        );
                      }}
                      onDeleteStop={handleDeleteStop}
                      showNavigation={true}
                    />
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-gray-500">
                  Route not found
                </CardContent>
              </Card>
            )
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                <MapPin className="h-12 w-12 mx-auto text-gray-300 mb-2" />
                <p>Select a route to view details</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Create Route Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Route</DialogTitle>
            <DialogDescription>
              Give your route a name to start planning your property visits
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="route-name">Route Name</Label>
              <Input
                id="route-name"
                data-testid="route-name-input"
                placeholder="e.g., Saturday Property Tour"
                value={routeName}
                onChange={(e) => setRouteName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCreateRoute();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              data-testid="create-route-button"
              onClick={handleCreateRoute}
              disabled={!routeName.trim() || createMutation.isPending}
            >
              Create Route
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Stop Dialog */}
      <Dialog open={addStopDialogOpen} onOpenChange={setAddStopDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Add Property to Route</DialogTitle>
            <DialogDescription>
              Search and select a property to add to your route
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 flex-1 overflow-hidden flex flex-col">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search properties..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Properties List */}
            <div className="flex-1 overflow-y-auto space-y-2">
              {filteredProperties.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No properties found</p>
                  <p className="text-sm mt-1">Try a different search term</p>
                </div>
              ) : (
                filteredProperties.map((property) => (
                  <Card
                    key={property.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => handleAddPropertyStop(property)}
                  >
                    <CardContent className="p-4">
                      <div className="flex gap-4">
                        {property.images?.[0] ? (
                          <img
                            src={property.images[0]}
                            alt={property.title}
                            className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-20 h-20 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                            <MapPin className="h-8 w-8 text-gray-400" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold truncate">{property.title}</div>
                          <div className="text-sm text-gray-500 truncate mt-1">
                            {property.address}
                          </div>
                          <div className="flex items-center gap-4 mt-2 text-sm">
                            <span className="font-semibold text-primary">
                              ${property.price.toLocaleString()}
                            </span>
                            <span className="text-gray-500">{property.area_m2} m²</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddStopDialogOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

