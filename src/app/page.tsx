'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useQuery } from '@tanstack/react-query';
import { PropertyMapWithSignals } from '@/components/map/PropertyMapWithSignals';
import { PropertyFilters } from '@/components/properties/PropertyFilters';
import { PropertyCard } from '@/components/properties/PropertyCard';
import dynamicImport from 'next/dynamic';

// Lazy load PropertyDetail (heavy component with gallery, reviews, etc.)
const PropertyDetail = dynamicImport(
  () => import('@/components/properties/PropertyDetail').then((mod) => ({ default: mod.PropertyDetail })),
  { ssr: false }
);
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Map, List, SlidersHorizontal, Search } from 'lucide-react';
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
  const [searchQuery, setSearchQuery] = useState('');

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
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="w-full">
        {/* Hero Search Section - Zillow Style with Strong Branding */}
        <section className="relative bg-gradient-to-b from-cyan-50/50 via-white to-emerald-50/30 border-b border-gray-200 py-12">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(6,182,212,0.3),transparent_50%)]"></div>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(16,185,129,0.3),transparent_50%)]"></div>
          </div>
          
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-4xl mx-auto">
              {/* Logo - Full Color, Trimmed Empty Space Only */}
              <div className="flex justify-center mb-8">
                <div 
                  className="relative inline-block"
                  style={{ 
                    lineHeight: 0,
                    display: 'block'
                  }}
                >
                  <Image
                    src="/logo.png"
                    alt="PriceWaze"
                    width={496}
                    height={438}
                    className="h-80 w-auto brightness-100 contrast-100 block"
                    priority
                    style={{ 
                      mixBlendMode: 'normal',
                      objectFit: 'contain',
                      objectPosition: 'center',
                      imageRendering: 'auto',
                      display: 'block'
                    }}
                  />
                </div>
              </div>
              
              <h1 className="text-3xl md:text-4xl font-bold mb-2 text-center bg-gradient-to-r from-cyan-700 via-emerald-600 to-cyan-700 bg-clip-text text-transparent">
                Find your place
              </h1>
              <p className="text-lg text-gray-700 mb-8 text-center font-medium">
                Discover homes, apartments, and more
              </p>
              
              {/* Large Search Bar with Brand Colors */}
              <div className="bg-white rounded-xl shadow-xl border-2 border-gray-200 p-6 relative overflow-hidden">
                {/* Gradient Border Effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 via-emerald-500 to-cyan-500 opacity-0 hover:opacity-10 transition-opacity duration-300"></div>
                
                <div className="flex flex-col md:flex-row gap-3 relative z-10">
                  <div className="flex-1">
                    <div className="relative group">
                      <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-emerald-500/20 rounded-lg opacity-0 group-hover:opacity-100 blur-md transition-opacity duration-300"></div>
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-cyan-600 z-10" />
                      <Input
                        type="text"
                        placeholder="Enter address, city, or ZIP code"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="relative w-full h-12 pl-10 pr-4 text-base border-2 border-gray-300 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 rounded-lg transition-all duration-200 z-10"
                      />
                    </div>
                  </div>
                  <Button 
                    size="lg" 
                    className="bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-700 hover:to-emerald-700 text-white h-12 px-8 shadow-lg hover:shadow-xl transition-all duration-200 font-semibold"
                  >
                    Search
                  </Button>
                </div>
              </div>

              {/* Quick Filters with Brand Colors */}
              <div className="flex flex-wrap items-center justify-center gap-4 mt-6">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2 border-2 border-gray-300 text-gray-700 hover:border-cyan-500 hover:text-cyan-600 hover:bg-cyan-50 transition-all duration-200"
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  More Filters
                </Button>
                <Tabs value={view} onValueChange={(v) => setView(v as 'map' | 'list')}>
                  <TabsList className="bg-gray-100 border border-gray-200">
                    <TabsTrigger 
                      value="map" 
                      className="flex items-center gap-1 data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-emerald-500 data-[state=active]:text-white transition-all duration-200"
                    >
                      <Map className="h-4 w-4" />
                      Map
                    </TabsTrigger>
                    <TabsTrigger 
                      value="list" 
                      className="flex items-center gap-1 data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-emerald-500 data-[state=active]:text-white transition-all duration-200"
                    >
                      <List className="h-4 w-4" />
                      List
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </div>
          </div>
        </section>

        {/* Main Content */}
        <div className="container mx-auto px-4 py-6">
          {/* Results Header with Brand Accent */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="flex items-center gap-3">
                <div className="h-1 w-12 bg-gradient-to-r from-cyan-500 to-emerald-500 rounded-full"></div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {properties.length} {properties.length === 1 ? 'property' : 'properties'} found
                </h2>
              </div>
              {searchQuery && (
                <p className="text-sm text-gray-600 mt-2 ml-16">
                  Results for <span className="font-semibold text-cyan-600">"{searchQuery}"</span>
                </p>
              )}
            </div>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <PropertyFilters filters={filters} onFiltersChange={setFilters} />
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg mb-6">
              Failed to load properties. Please try again.
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center h-[600px] bg-white rounded-lg shadow-sm">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
            </div>
          )}

          {/* Main Content */}
          {!isLoading && !error && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Map or List View */}
              <div className={view === 'map' ? 'lg:col-span-2' : 'lg:col-span-3'}>
                {view === 'map' ? (
                  <PropertyMapWithSignals
                    properties={properties}
                    onPropertyClick={handlePropertyClick}
                    className="h-[600px] rounded-lg shadow-md border border-gray-200"
                  />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {properties.map((property) => (
                      <PropertyCard
                        key={property.id}
                        property={property}
                        onClick={() => handlePropertyClick(property)}
                      />
                    ))}
                    {properties.length === 0 && (
                      <div className="col-span-full text-center py-16 bg-white rounded-lg shadow-sm border border-gray-200">
                        <p className="text-lg text-gray-600 mb-2">No properties found</p>
                        <p className="text-sm text-gray-500">Try adjusting your search criteria</p>
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
                    <div className="text-center py-8 bg-white rounded-lg shadow-sm border border-gray-200">
                      <p className="text-gray-600">No properties found.</p>
                    </div>
                  )}
                  {properties.length > 10 && (
                    <Button
                      variant="outline"
                      className="w-full border-gray-300 text-gray-700 hover:bg-gray-50"
                      onClick={() => setView('list')}
                    >
                      View all {properties.length} properties
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
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
