'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SavedSearches } from '@/components/alerts/SavedSearches';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell } from 'lucide-react';

export default function AlertsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Alertas y Búsquedas</h1>
        <p className="text-muted-foreground mt-2">
          Gestiona tus búsquedas guardadas y alertas de precios
        </p>
      </div>

      <Tabs defaultValue="searches" className="space-y-4">
        <TabsList>
          <TabsTrigger value="searches">Búsquedas Guardadas</TabsTrigger>
          <TabsTrigger value="price-alerts">Alertas de Precio</TabsTrigger>
        </TabsList>

        <TabsContent value="searches" className="space-y-4">
          <SavedSearches />
        </TabsContent>

        <TabsContent value="price-alerts" className="space-y-4">
          <Card>
            <CardContent className="py-12 text-center">
              <Bell className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium mb-2">Alertas de Precio</p>
              <p className="text-sm text-muted-foreground">
                Recibe notificaciones cuando cambien los precios de tus propiedades favoritas
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

