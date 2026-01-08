'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Heart, ArrowRight, MapPin, Bed, Bath, Square } from 'lucide-react';
import { WidgetWrapper } from './WidgetWrapper';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatPrice } from '@/config/market';
import { usePropertyStore } from '@/stores/property-store';
import type { Property } from '@/types/database';

export function FavoritesWidget() {
  const { favorites, fetchFavorites, favoritesLoading } = usePropertyStore();
  const [favoriteProperties, setFavoriteProperties] = useState<Property[]>([]);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  useEffect(() => {
    if (favorites.length > 0) {
      const loadFavorites = async () => {
        try {
          const response = await fetch(`/api/properties?ids=${favorites.join(',')}`);
          if (response.ok) {
            const data = await response.json();
            setFavoriteProperties(Array.isArray(data) ? data : data.data || []);
          }
        } catch (error) {
          console.error('Failed to fetch favorite properties:', error);
        }
      };
      loadFavorites();
    } else {
      setFavoriteProperties([]);
    }
  }, [favorites]);

  const displayFavorites = favoriteProperties.slice(0, 4);

  return (
    <WidgetWrapper
      id="favorites"
      title="Favorites"
      isLoading={favoritesLoading}
      headerAction={
        <>
          {favorites.length > 0 && (
            <Badge variant="secondary" className="h-5 text-xs">
              {favorites.length} saved
            </Badge>
          )}
          <Button variant="ghost" size="sm" asChild className="h-7 text-xs">
            <Link href="/favorites">
              View All
              <ArrowRight className="h-3 w-3 ml-1" />
            </Link>
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        {displayFavorites.map((property) => (
          <Link
            key={property.id}
            href={`/properties/${property.id}`}
            className="flex gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors group"
          >
            <div className="relative w-20 h-16 rounded-md overflow-hidden shrink-0 bg-muted">
              {property.images?.[0] ? (
                <Image
                  src={property.images[0]}
                  alt={property.title}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Heart className="h-6 w-6 text-muted-foreground/30" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                {property.title}
              </p>
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                <MapPin className="h-3 w-3" />
                <span className="truncate">{property.address || 'Location'}</span>
              </div>
              <div className="flex items-center justify-between mt-1.5">
                <p className="text-sm font-semibold text-primary">
                  {formatPrice(property.price)}
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {property.bedrooms && (
                    <span className="flex items-center gap-0.5">
                      <Bed className="h-3 w-3" />
                      {property.bedrooms}
                    </span>
                  )}
                  {property.bathrooms && (
                    <span className="flex items-center gap-0.5">
                      <Bath className="h-3 w-3" />
                      {property.bathrooms}
                    </span>
                  )}
                  {property.area_m2 && (
                    <span className="flex items-center gap-0.5">
                      <Square className="h-3 w-3" />
                      {property.area_m2}m²
                    </span>
                  )}
                </div>
              </div>
            </div>
          </Link>
        ))}

        {favoriteProperties.length === 0 && !favoritesLoading && (
          <div className="text-center py-6 text-muted-foreground">
            <Heart className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No favorites yet</p>
            <Button variant="link" size="sm" asChild className="mt-1">
              <Link href="/properties">Browse properties</Link>
            </Button>
          </div>
        )}
      </div>
    </WidgetWrapper>
  );
}
