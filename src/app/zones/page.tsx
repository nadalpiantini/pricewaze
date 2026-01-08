'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { MapPin, TrendingUp, Building2, Search } from 'lucide-react';
import type { Zone } from '@/types/database';
import { formatPrice } from '@/config/market';

async function fetchZones(city?: string): Promise<Zone[]> {
  const params = new URLSearchParams();
  if (city) params.set('city', city);
  
  const res = await fetch(`/api/zones?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch zones');
  return res.json();
}

export default function ZonesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState<string>('');

  const { data: zones = [], isLoading, error } = useQuery({
    queryKey: ['zones', selectedCity],
    queryFn: () => fetchZones(selectedCity || undefined),
  });

  // Extract unique cities from zones
  const cities = Array.from(new Set(zones.map((z) => z.city))).sort();

  // Filter zones by search query
  const filteredZones = zones.filter((zone) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      zone.name.toLowerCase().includes(query) ||
      zone.city.toLowerCase().includes(query)
    );
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="container mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Neighborhoods</h1>
          <p className="text-gray-600">
            Explore neighborhoods and discover market insights
          </p>
        </div>

        {/* Search and Filter */}
        <div className="mb-6 flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Search neighborhoods..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          {cities.length > 0 && (
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="">All Cities</option>
              {cities.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Error State */}
        {error && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <p className="text-red-600">
                Failed to load neighborhoods. Please try again later.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2 mt-2"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Zones Grid */}
        {!isLoading && !error && (
          <>
            {filteredZones.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-gray-600">
                    {searchQuery
                      ? 'No neighborhoods found matching your search.'
                      : 'No neighborhoods available.'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredZones.map((zone) => (
                  <Card
                    key={zone.id}
                    className="hover:shadow-lg transition-shadow cursor-pointer"
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-xl mb-1">{zone.name}</CardTitle>
                          <CardDescription className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {zone.city}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {zone.avg_price_m2 && (
                          <div className="flex items-center gap-2 text-sm">
                            <TrendingUp className="h-4 w-4 text-emerald-600" />
                            <span className="text-gray-600">Avg. Price:</span>
                            <span className="font-semibold text-gray-900">
                              {formatPrice(zone.avg_price_m2)}/m²
                            </span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-sm">
                          <Building2 className="h-4 w-4 text-cyan-600" />
                          <span className="text-gray-600">Listings:</span>
                          <span className="font-semibold text-gray-900">
                            {zone.total_listings || 0}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

