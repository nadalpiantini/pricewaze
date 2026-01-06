'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PropertyMap } from '@/components/map/PropertyMap';
import { PropertyFilters } from '@/components/properties/PropertyFilters';
import { PropertyCard } from '@/components/properties/PropertyCard';
import { PropertyDetail } from '@/components/properties/PropertyDetail';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Map, List, SlidersHorizontal } from 'lucide-react';
import type { Property, PropertyFilters as Filters } from '@/types/database';

async function fetchProperties(filters: Filters): Promise<Property[]> {
  const params = new URLSearchParams();
  if (filters.property_type) params.set('property_type', filters.property_type);
  if (filters.min_price) params.set('min_price', filters.min_price.toString());
  if (filters.max_price) params.set('max_price', filters.max_price.toString());
  if (filters.min_area) params.set('min_area', filters.min_area.toString());
  if (filters.max_area) params.set('max_area', filters.max_area.toString());
  if (filters.bedrooms) params.set('bedrooms', filters.bedrooms.toString());
  if (filters.bathrooms) params.set('bathrooms', filters.bathrooms.toString());
  if (filters.status) params.set('status', filters.status);

  const res = await fetch(`/api/properties?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch properties');
  return res.json();
}

export default function Home() {
  const [filters, setFilters] = useState<Filters>({ status: 'active' });
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [view, setView] = useState<'map' | 'list'>('map');

  const { data: properties = [], isLoading, error } = useQuery({
    queryKey: ['properties', filters],
    queryFn: () => fetchProperties(filters),
  });

  const handlePropertyClick = (property: Property) => {
    setSelectedProperty(property);
  };

  const handleCloseDetail = () => {
    setSelectedProperty(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-4">
        {/* Top Bar */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">Properties</h1>
            <span className="text-muted-foreground">
              ({properties.length} listings)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2"
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filters
            </Button>

            <Tabs value={view} onValueChange={(v) => setView(v as 'map' | 'list')}>
              <TabsList>
                <TabsTrigger value="map" className="flex items-center gap-1">
                  <Map className="h-4 w-4" />
                  Map
                </TabsTrigger>
                <TabsTrigger value="list" className="flex items-center gap-1">
                  <List className="h-4 w-4" />
                  List
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="mb-4">
            <PropertyFilters filters={filters} onFiltersChange={setFilters} />
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-destructive/10 text-destructive p-4 rounded-lg mb-4">
            Failed to load properties. Please try again.
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center h-[600px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        )}

        {/* Main Content */}
        {!isLoading && !error && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Map or List View */}
            <div className={view === 'map' ? 'lg:col-span-2' : 'lg:col-span-3'}>
              {view === 'map' ? (
                <PropertyMap
                  properties={properties}
                  onPropertyClick={handlePropertyClick}
                  className="h-[600px] rounded-lg shadow-md"
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {properties.map((property) => (
                    <PropertyCard
                      key={property.id}
                      property={property}
                      onClick={() => handlePropertyClick(property)}
                    />
                  ))}
                  {properties.length === 0 && (
                    <div className="col-span-full text-center py-12 text-muted-foreground">
                      No properties found matching your criteria.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Property List Sidebar (Map View Only) */}
            {view === 'map' && (
              <div className="space-y-4 max-h-[600px] overflow-y-auto">
                {properties.slice(0, 10).map((property) => (
                  <PropertyCard
                    key={property.id}
                    property={property}
                    onClick={() => handlePropertyClick(property)}
                    compact
                  />
                ))}
                {properties.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No properties found.
                  </div>
                )}
                {properties.length > 10 && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setView('list')}
                  >
                    View all {properties.length} properties
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Property Detail Modal */}
      {selectedProperty && (
        <PropertyDetail
          property={selectedProperty}
          onClose={handleCloseDetail}
        />
      )}
    </div>
  );
}
