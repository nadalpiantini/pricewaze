'use client';

import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bed, Bath, Maximize, MapPin, Heart, GitCompare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Property } from '@/types/database';
import { cn } from '@/lib/utils';
import { useComparison } from '@/hooks/useComparison';

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
  const { isSelected, toggleProperty, canAddMore } = useComparison();

  const formatPrice = (price: number) => {
    if (price >= 1000000) {
      return `$${(price / 1000000).toFixed(2)}M`;
    }
    return `$${(price / 1000).toFixed(0)}K`;
  };

  const primaryImage = property.images?.[0] || '/placeholder-property.jpg';
  const isInComparison = isSelected(property.id);

  if (compact) {
    return (
      <Card
        className="cursor-pointer hover:shadow-lg transition-all duration-200 overflow-hidden border-gray-200 bg-white"
        onClick={onClick}
      >
        <CardContent className="p-3">
          <div className="flex gap-3">
            <div className="relative w-24 h-24 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
              {property.images?.[0] ? (
                <Image
                  src={primaryImage}
                  alt={property.title}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <MapPin className="h-6 w-6" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-900 text-lg mb-1">
                {formatPrice(property.price)}
              </p>
              <p className="text-sm font-semibold text-gray-900 truncate mb-1">{property.title}</p>
              <p className="text-xs text-gray-600 truncate mb-2">{property.address}</p>
              <div className="flex items-center gap-3 text-xs text-gray-600">
                {property.bedrooms && (
                  <span className="flex items-center gap-1">
                    <Bed className="h-3 w-3 text-gray-500" />
                    {property.bedrooms}
                  </span>
                )}
                {property.bathrooms && (
                  <span className="flex items-center gap-1">
                    <Bath className="h-3 w-3 text-gray-500" />
                    {property.bathrooms}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Maximize className="h-3 w-3 text-gray-500" />
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
      className="cursor-pointer hover:shadow-xl transition-all duration-200 overflow-hidden group border-gray-200 bg-white"
      onClick={onClick}
    >
      {/* Image */}
      <div className="relative aspect-[4/3] bg-gray-100">
        {property.images?.[0] ? (
          <Image
            src={primaryImage}
            alt={property.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <MapPin className="h-12 w-12" />
          </div>
        )}

        {/* Type Badge with Brand Colors */}
        <Badge className="absolute top-3 left-3 bg-gradient-to-r from-cyan-600 to-emerald-600 text-white hover:from-cyan-700 hover:to-emerald-700 border-0 shadow-md font-semibold">
          {propertyTypeLabels[property.property_type]}
        </Badge>

        {/* Action Buttons */}
        <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-200">
          {/* Compare Button */}
          <Button
            variant="secondary"
            size="icon"
            className={cn(
              "h-9 w-9 bg-white/95 shadow-md border border-gray-200 hover:border-transparent",
              isInComparison
                ? "bg-gradient-to-r from-cyan-500 to-emerald-500 text-white"
                : "hover:bg-gradient-to-r hover:from-cyan-500 hover:to-emerald-500"
            )}
            onClick={(e) => {
              e.stopPropagation();
              toggleProperty(property);
            }}
            disabled={!isInComparison && !canAddMore}
            title={isInComparison ? "Remover de comparación" : "Agregar a comparación"}
          >
            <GitCompare className={cn(
              "h-4 w-4 transition-colors",
              isInComparison ? "text-white" : "text-gray-700 group-hover:text-white"
            )} />
          </Button>
          
          {/* Favorite Button */}
          <Button
            variant="secondary"
            size="icon"
            className="h-9 w-9 bg-white/95 hover:bg-gradient-to-r hover:from-cyan-500 hover:to-emerald-500 shadow-md border border-gray-200 hover:border-transparent"
            onClick={(e) => {
              e.stopPropagation();
              // TODO: Toggle favorite
            }}
          >
            <Heart className="h-4 w-4 text-gray-700 group-hover:text-white transition-colors" />
          </Button>
        </div>
      </div>

      <CardContent className="p-5">
        {/* Price - Prominent with Brand Colors */}
        <div className="mb-2">
          <p className="text-2xl font-bold bg-gradient-to-r from-cyan-700 to-emerald-600 bg-clip-text text-transparent">{formatPrice(property.price)}</p>
          <p className="text-sm text-gray-600">
            ${property.price_per_m2.toLocaleString()}/m²
          </p>
        </div>

        {/* Address */}
        <h3 className="font-semibold text-base text-gray-900 mb-1 line-clamp-1">{property.title}</h3>
        <p className="text-sm text-gray-600 flex items-center gap-1 mb-4">
          <MapPin className="h-3.5 w-3.5" />
          <span className="truncate">{property.address}</span>
        </p>

        {/* Comparison Badge */}
        {isInComparison && (
          <div className="mb-3">
            <Badge className="bg-gradient-to-r from-cyan-600 to-emerald-600 text-white text-xs">
              <GitCompare className="h-3 w-3 mr-1" />
              En comparación
            </Badge>
          </div>
        )}

        {/* Property Features - Clean Layout */}
        <div className="flex items-center gap-4 text-sm text-gray-700 border-t border-gray-100 pt-3">
          {property.bedrooms !== null && (
            <span className="flex items-center gap-1.5">
              <Bed className="h-4 w-4 text-gray-500" />
              <span className="font-medium">{property.bedrooms}</span>
              <span className="text-gray-500">bed</span>
            </span>
          )}
          {property.bathrooms !== null && (
            <span className="flex items-center gap-1.5">
              <Bath className="h-4 w-4 text-gray-500" />
              <span className="font-medium">{property.bathrooms}</span>
              <span className="text-gray-500">bath</span>
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <Maximize className="h-4 w-4 text-gray-500" />
            <span className="font-medium">{property.area_m2}</span>
            <span className="text-gray-500">m²</span>
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
