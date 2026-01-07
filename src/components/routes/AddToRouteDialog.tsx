'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Route, Plus } from 'lucide-react';
import type { Property } from '@/types/database';

interface VisitRoute {
  id: string;
  name: string;
  created_at: string;
}

// Fetch routes
async function fetchRoutes(): Promise<VisitRoute[]> {
  const res = await fetch('/api/routes');
  if (!res.ok) throw new Error('Failed to fetch routes');
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

// Add stop to route
async function addStopToRoute(
  routeId: string,
  property: Property
): Promise<void> {
  const res = await fetch(`/api/routes/${routeId}/stops`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      address: property.address,
      location: { lat: property.latitude, lng: property.longitude },
      property_id: property.id,
    }),
  });
  if (!res.ok) throw new Error('Failed to add property to route');
}

interface AddToRouteDialogProps {
  property: Property;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function AddToRouteDialog({
  property,
  open,
  onOpenChange,
  onSuccess,
}: AddToRouteDialogProps) {
  const queryClient = useQueryClient();
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [showCreateRoute, setShowCreateRoute] = useState(false);
  const [newRouteName, setNewRouteName] = useState('');

  const { data: routes = [], isLoading } = useQuery({
    queryKey: ['routes'],
    queryFn: fetchRoutes,
    enabled: open,
  });

  const createRouteMutation = useMutation({
    mutationFn: createRoute,
    onSuccess: (newRoute) => {
      queryClient.invalidateQueries({ queryKey: ['routes'] });
      setSelectedRouteId(newRoute.id);
      setShowCreateRoute(false);
      setNewRouteName('');
    },
  });

  const addStopMutation = useMutation({
    mutationFn: (routeId: string) => addStopToRoute(routeId, property),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routes'] });
      onSuccess?.();
      onOpenChange(false);
      setSelectedRouteId(null);
    },
  });

  const handleAdd = () => {
    if (selectedRouteId) {
      addStopMutation.mutate(selectedRouteId);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add to Route</DialogTitle>
          <DialogDescription>
            Select a route to add this property, or create a new one
          </DialogDescription>
        </DialogHeader>

        {showCreateRoute ? (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="route-name">Route Name</Label>
              <Input
                id="route-name"
                placeholder="e.g., Saturday Property Tour"
                value={newRouteName}
                onChange={(e) => setNewRouteName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newRouteName.trim()) {
                    createRouteMutation.mutate(newRouteName.trim());
                  }
                }}
              />
            </div>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateRoute(false);
                setNewRouteName('');
              }}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            {isLoading ? (
              <div className="text-center py-8 text-gray-500">
                Loading routes...
              </div>
            ) : routes.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Route className="h-12 w-12 mx-auto text-gray-300 mb-2" />
                <p>No routes yet</p>
                <p className="text-sm mt-1">Create your first route</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
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

            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowCreateRoute(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create New Route
            </Button>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {!showCreateRoute && (
            <Button
              onClick={handleAdd}
              disabled={!selectedRouteId || addStopMutation.isPending}
            >
              {addStopMutation.isPending ? 'Adding...' : 'Add to Route'}
            </Button>
          )}
          {showCreateRoute && (
            <Button
              onClick={() => {
                if (newRouteName.trim()) {
                  createRouteMutation.mutate(newRouteName.trim());
                }
              }}
              disabled={!newRouteName.trim() || createRouteMutation.isPending}
            >
              {createRouteMutation.isPending ? 'Creating...' : 'Create & Add'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

