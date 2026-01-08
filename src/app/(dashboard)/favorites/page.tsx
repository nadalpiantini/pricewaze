'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Heart,
  HeartOff,
  MapPin,
  Bed,
  Bath,
  Maximize,
  ArrowRight,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { usePropertyStore } from '@/stores/property-store';
import type { Property } from '@/types/database';

const propertyTypeLabels: Record<Property['property_type'], string> = {
  apartment: 'Apartment',
  house: 'House',
  land: 'Land',
  commercial: 'Commercial',
  office: 'Office',
};

export default function FavoritesPage() {
  const { favorites, favoritesLoading, fetchFavorites, removeFavorite } = usePropertyStore();
  const [favoriteProperties, setFavoriteProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  const loadFavoriteProperties = useCallback(async (favoriteIds: string[]) => {
    if (favoriteIds.length > 0) {
      try {
        const response = await fetch(`/api/properties?ids=${favoriteIds.join(',')}`);
        if (response.ok) {
          const data = await response.json();
          setFavoriteProperties(data);
        }
      } catch (error) {
        console.error('Failed to fetch favorite properties:', error);
      }
    } else {
      setFavoriteProperties([]);
    }
  }, []);

  useEffect(() => {
    const loadFavorites = async () => {
      setLoading(true);
      await fetchFavorites();
      setLoading(false);
    };

    loadFavorites();
  }, [fetchFavorites]);

  useEffect(() => {
    if (!loading) {
      const loadFavorites = async () => {
        if (favorites.length > 0) {
          try {
            const response = await fetch(`/api/properties?ids=${favorites.join(',')}`);
            if (response.ok) {
              const data = await response.json();
              setFavoriteProperties(data);
            }
          } catch (error) {
            console.error('Failed to fetch favorite properties:', error);
          }
        } else {
          setFavoriteProperties([]);
        }
      };
      loadFavorites();
    }
  }, [favorites, loading]);

  const formatPrice = (price: number) => {
    if (price >= 1000000) {
      return `$${(price / 1000000).toFixed(2)}M`;
    }
    return `$${(price / 1000).toFixed(0)}K`;
  };

  const handleRemoveFavorite = async (propertyId: string) => {
    await removeFavorite(propertyId);
    setFavoriteProperties((prev) => prev.filter((p) => p.id !== propertyId));
  };

  if (loading || favoritesLoading) {
    return (
      <div className="space-y-6">
        <div>
          <div className="h-8 w-48 bg-muted animate-pulse rounded" />
          <div className="h-4 w-64 bg-muted animate-pulse rounded mt-2" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <div className="aspect-[4/3] bg-muted animate-pulse" />
              <CardContent className="p-4">
                <div className="space-y-2">
                  <div className="h-5 w-24 bg-muted animate-pulse rounded" />
                  <div className="h-4 w-full bg-muted animate-pulse rounded" />
                  <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Favorites</h1>
        <p className="text-muted-foreground">
          Properties you&apos;ve saved for later
        </p>
      </div>

      {/* Favorites grid */}
      {favoriteProperties.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Heart className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No favorites yet</h3>
            <p className="text-muted-foreground text-center mb-6 max-w-md">
              Browse properties and click the heart icon to save them to your
              favorites for easy access later.
            </p>
            <Button asChild>
              <Link href="/properties">
                Browse Properties
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {favoriteProperties.map((property) => (
            <Card key={property.id} className="overflow-hidden group">
              {/* Image */}
              <div className="relative aspect-[4/3] bg-muted">
                {property.images?.[0] ? (
                  <Image
                    src={property.images[0]}
                    alt={property.title}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    <MapPin className="h-12 w-12" />
                  </div>
                )}

                {/* Type badge */}
                <Badge className="absolute top-2 left-2">
                  {propertyTypeLabels[property.property_type]}
                </Badge>

                {/* Remove favorite button */}
                <Button
                  variant="secondary"
                  size="icon"
                  className="absolute top-2 right-2 h-8 w-8"
                  onClick={(e) => {
                    e.preventDefault();
                    handleRemoveFavorite(property.id);
                  }}
                >
                  <HeartOff className="h-4 w-4" />
                </Button>

                {/* Price overlay */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                  <p className="text-white font-bold text-xl">
                    {formatPrice(property.price)}
                  </p>
                  <p className="text-white/80 text-sm">
                    ${property.price_per_m2.toLocaleString()}/m²
                  </p>
                </div>
              </div>

              <CardContent className="p-4">
                <Link href={`/properties/${property.id}`}>
                  <h3 className="font-semibold hover:underline line-clamp-1">
                    {property.title}
                  </h3>
                </Link>

                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                  <MapPin className="h-3 w-3 shrink-0" />
                  <span className="truncate">{property.address}</span>
                </p>

                {/* Property features */}
                <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                  {property.bedrooms !== null && (
                    <span className="flex items-center gap-1">
                      <Bed className="h-4 w-4" />
                      {property.bedrooms}
                    </span>
                  )}
                  {property.bathrooms !== null && (
                    <span className="flex items-center gap-1">
                      <Bath className="h-4 w-4" />
                      {property.bathrooms}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Maximize className="h-4 w-4" />
                    {property.area_m2}m²
                  </span>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2 mt-4">
                  <Button size="sm" className="flex-1" asChild>
                    <Link href={`/properties/${property.id}`}>View Details</Link>
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1">
                    Make Offer
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
