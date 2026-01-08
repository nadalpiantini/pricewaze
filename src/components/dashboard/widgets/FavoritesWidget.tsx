'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Heart, ArrowRight, MapPin, Bed, Bath, Square, Sparkles } from 'lucide-react';
import { WidgetWrapper } from '@/components/dashboard/widgets/WidgetWrapper';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatPrice } from '@/config/market';
import { usePropertyStore } from '@/stores/property-store';
import { cn } from '@/lib/utils';
import type { Property } from '@/types/database';

function PropertyCard({ property, index }: { property: Property; index: number }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), index * 100);
    return () => clearTimeout(timer);
  }, [index]);

  return (
    <Link
      href={`/properties/${property.id}`}
      className={cn(
        'group flex gap-3 p-3 rounded-xl transition-all duration-300',
        'hover:bg-white/5 border border-transparent hover:border-[var(--dashboard-border-hover)]',
        'hover:shadow-lg hover:shadow-[var(--signal-cyan)]/5'
      )}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateX(0)' : 'translateX(-20px)',
        transition: 'opacity 0.4s ease-out, transform 0.4s ease-out',
      }}
    >
      {/* Image with overlay */}
      <div className="relative w-24 h-18 rounded-lg overflow-hidden shrink-0 bg-[var(--dashboard-bg-elevated)]">
        {property.images?.[0] ? (
          <>
            <Image
              src={property.images[0]}
              alt={property.title}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-110"
            />
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Heart className="h-6 w-6 text-muted-foreground/30" />
          </div>
        )}

        {/* Hover badge */}
        <div className="absolute bottom-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
          <Badge
            variant="secondary"
            className="text-[10px] h-5 bg-[var(--signal-cyan)]/90 text-black border-0"
          >
            View
          </Badge>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
        <div>
          <p className="text-sm font-medium truncate group-hover:text-[var(--signal-cyan)] transition-colors">
            {property.title}
          </p>
          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate">{property.address || 'Location'}</span>
          </div>
        </div>

        <div className="flex items-center justify-between mt-2">
          <p
            className="text-sm font-bold"
            style={{
              background: 'linear-gradient(135deg, var(--signal-cyan) 0%, var(--signal-lime) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            {formatPrice(property.price)}
          </p>

          <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
            {property.bedrooms && (
              <span className="flex items-center gap-1">
                <Bed className="h-3 w-3" />
                <span>{property.bedrooms}</span>
              </span>
            )}
            {property.bathrooms && (
              <span className="flex items-center gap-1">
                <Bath className="h-3 w-3" />
                <span>{property.bathrooms}</span>
              </span>
            )}
            {property.area_m2 && (
              <span className="flex items-center gap-1">
                <Square className="h-3 w-3" />
                <span>{property.area_m2}m²</span>
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

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
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clear on empty
      setFavoriteProperties([]);
    }
  }, [favorites]);

  const displayFavorites = favoriteProperties.slice(0, 4);

  return (
    <WidgetWrapper
      id="favorites"
      title="Favorites"
      isLoading={favoritesLoading}
      icon={<Heart className="h-4 w-4 text-rose-400" />}
      accentColor="rose"
      headerAction={
        <>
          {favorites.length > 0 && (
            <Badge
              variant="secondary"
              className="h-5 text-xs bg-rose-500/20 text-rose-400 border-rose-500/30 hover:bg-rose-500/30"
            >
              {favorites.length} saved
            </Badge>
          )}
          <Button variant="ghost" size="sm" asChild className="h-7 text-xs hover:bg-white/5 gap-1.5">
            <Link href="/favorites">
              View All
              <ArrowRight className="h-3 w-3" />
            </Link>
          </Button>
        </>
      }
    >
      <div className="space-y-1">
        {displayFavorites.map((property, index) => (
          <PropertyCard key={property.id} property={property} index={index} />
        ))}

        {favoriteProperties.length === 0 && !favoritesLoading && (
          <div className="empty-state-premium py-8">
            <div
              className="w-14 h-14 mx-auto mb-4 rounded-2xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, rgba(244, 63, 94, 0.2) 0%, rgba(244, 63, 94, 0.05) 100%)',
                boxShadow: '0 0 40px rgba(244, 63, 94, 0.2)',
              }}
            >
              <Heart className="h-7 w-7 text-rose-400" />
            </div>
            <p className="text-sm font-medium text-foreground mb-1">No favorites yet</p>
            <p className="text-xs text-muted-foreground mb-4">
              Save properties to see them here
            </p>
            <Button
              variant="outline"
              size="sm"
              asChild
              className="border-rose-500/30 hover:bg-rose-500/10 hover:border-rose-500 gap-2"
            >
              <Link href="/properties">
                <Sparkles className="h-3.5 w-3.5" />
                Browse properties
              </Link>
            </Button>
          </div>
        )}
      </div>
    </WidgetWrapper>
  );
}
