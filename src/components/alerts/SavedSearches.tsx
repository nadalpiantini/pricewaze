'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, Bell, BellOff, Edit, Search } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import type { SavedSearch } from '@/types/database';

export function SavedSearches() {
  const queryClient = useQueryClient();

  // Fetch saved searches
  const { data: alertsData, isLoading } = useQuery({
    queryKey: ['alerts'],
    queryFn: async () => {
      const response = await fetch('/api/alerts');
      if (!response.ok) throw new Error('Failed to fetch alerts');
      return response.json() as Promise<{
        saved_searches: SavedSearch[];
        price_alerts: unknown[];
      }>;
    },
  });

  // Toggle search active status
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const response = await fetch(`/api/alerts/searches/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !isActive }),
      });
      if (!response.ok) throw new Error('Failed to update search');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      toast.success('Búsqueda actualizada');
    },
  });

  // Delete search
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/alerts/searches/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete search');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      toast.success('Búsqueda eliminada');
    },
  });

  const savedSearches = alertsData?.saved_searches || [];

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Cargando...</div>;
  }

  if (savedSearches.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-lg font-medium mb-2">No hay búsquedas guardadas</p>
          <p className="text-sm text-muted-foreground">
            Guarda tus búsquedas para recibir alertas de nuevas propiedades
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {savedSearches.map((search) => (
        <Card key={search.id}>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-semibold">
                    {search.name || 'Búsqueda sin nombre'}
                  </h3>
                  <Badge variant={search.is_active ? 'default' : 'secondary'}>
                    {search.is_active ? (
                      <>
                        <Bell className="h-3 w-3 mr-1" />
                        Activa
                      </>
                    ) : (
                      <>
                        <BellOff className="h-3 w-3 mr-1" />
                        Inactiva
                      </>
                    )}
                  </Badge>
                  <Badge variant="outline">
                    {search.notification_frequency === 'instant'
                      ? 'Instantánea'
                      : search.notification_frequency === 'daily'
                        ? 'Diaria'
                        : 'Semanal'}
                  </Badge>
                </div>

                {/* Display filters */}
                <div className="text-sm text-muted-foreground space-y-1 mb-3">
                  {search.filters && typeof search.filters === 'object' && (
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(search.filters).map(([key, value]) => {
                        if (!value || value === '') return null;
                        return (
                          <Badge key={key} variant="secondary" className="text-xs">
                            {key}: {String(value)}
                          </Badge>
                        );
                      })}
                    </div>
                  )}
                </div>

                <p className="text-xs text-muted-foreground">
                  Creada {formatDistanceToNow(new Date(search.created_at), { addSuffix: true, locale: es })}
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    toggleActiveMutation.mutate({
                      id: search.id,
                      isActive: search.is_active,
                    })
                  }
                  disabled={toggleActiveMutation.isPending}
                >
                  {search.is_active ? (
                    <BellOff className="h-4 w-4" />
                  ) : (
                    <Bell className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteMutation.mutate(search.id)}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

