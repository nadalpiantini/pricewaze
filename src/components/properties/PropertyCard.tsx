'use client';

import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bed, Bath, Maximize, MapPin, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Property } from '@/types/database';
import { cn } from '@/lib/utils';

interface PropertyCardProps {
  property: Property;
  onClick?: () => void;
  compact?: boolean;
}

const propertyTypeLabels: Record<Property['property_type'], string> = {
  apartment: 'Apartment',
  house: 'House',
  land: 'Land',
  commercial: 'Commercial',
  office: 'Office',
};

export function PropertyCard({ property, onClick, compact = false }: PropertyCardProps) {
  const formatPrice = (price: number) => {
    if (price >= 1000000) {
      return `$${(price / 1000000).toFixed(2)}M`;
    }
    return `$${(price / 1000).toFixed(0)}K`;
  };

  const primaryImage = property.images?.[0] || '/placeholder-property.jpg';

  if (compact) {
    return (
      <Card
        className="cursor-pointer hover:shadow-md transition-shadow overflow-hidden"
        onClick={onClick}
      >
        <CardContent className="p-3">
          <div className="flex gap-3">
            <div className="relative w-20 h-20 rounded-md overflow-hidden flex-shrink-0 bg-muted">
              {property.images?.[0] ? (
                <Image
                  src={primaryImage}
                  alt={property.title}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  <MapPin className="h-6 w-6" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-primary text-lg">
                {formatPrice(property.price)}
              </p>
              <p className="text-sm font-medium truncate">{property.title}</p>
              <p className="text-xs text-muted-foreground truncate">{property.address}</p>
              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
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
                <span className="flex items-center gap-0.5">
                  <Maximize className="h-3 w-3" />
                  {property.area_m2}m²
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className="cursor-pointer hover:shadow-lg transition-shadow overflow-hidden group"
      onClick={onClick}
    >
      {/* Image */}
      <div className="relative aspect-[4/3] bg-muted">
        {property.images?.[0] ? (
          <Image
            src={primaryImage}
            alt={property.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <MapPin className="h-12 w-12" />
          </div>
        )}

        {/* Type Badge */}
        <Badge className="absolute top-2 left-2">
          {propertyTypeLabels[property.property_type]}
        </Badge>

        {/* Favorite Button */}
        <Button
          variant="secondary"
          size="icon"
          className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => {
            e.stopPropagation();
            // TODO: Toggle favorite
          }}
        >
          <Heart className="h-4 w-4" />
        </Button>

        {/* Price Overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
          <p className="text-white font-bold text-xl">{formatPrice(property.price)}</p>
          <p className="text-white/80 text-sm">
            ${property.price_per_m2.toLocaleString()}/m²
          </p>
        </div>
      </div>

      <CardContent className="p-4">
        <h3 className="font-semibold text-lg mb-1 line-clamp-1">{property.title}</h3>

        <p className="text-sm text-muted-foreground flex items-center gap-1 mb-3">
          <MapPin className="h-3 w-3" />
          <span className="truncate">{property.address}</span>
        </p>

        {/* Property Features */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          {property.bedrooms !== null && (
            <span className="flex items-center gap-1">
              <Bed className="h-4 w-4" />
              {property.bedrooms} beds
            </span>
          )}
          {property.bathrooms !== null && (
            <span className="flex items-center gap-1">
              <Bath className="h-4 w-4" />
              {property.bathrooms} baths
            </span>
          )}
          <span className="flex items-center gap-1">
            <Maximize className="h-4 w-4" />
            {property.area_m2} m²
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
