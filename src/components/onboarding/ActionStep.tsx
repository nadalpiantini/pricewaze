'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { useOnboardingStore } from '@/stores/onboarding-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Search,
  MapPin,
  Bed,
  Bath,
  Square,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Sparkles,
} from 'lucide-react';
import type { Property, PropertyType } from '@/types/database';

const propertyTypes: { value: PropertyType; label: string }[] = [
  { value: 'apartment', label: 'Apartment' },
  { value: 'house', label: 'House' },
  { value: 'land', label: 'Land' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'office', label: 'Office' },
];

async function fetchSampleProperties(): Promise<Property[]> {
  const res = await fetch('/api/properties?limit=6&status=active');
  if (!res.ok) throw new Error('Failed to fetch');
  const response = await res.json();
  // API returns { data: [...], pagination: {...} }, extract data array
  return Array.isArray(response.data) ? response.data : Array.isArray(response) ? response : [];
}

export function ActionStep() {
  const { preferences, setPreferences, nextStep, prevStep, setLoading } =
    useOnboardingStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(
    preferences.selectedPropertyId
  );

  const { data: properties = [], isLoading } = useQuery({
    queryKey: ['onboarding-properties', preferences.propertyType],
    queryFn: fetchSampleProperties,
  });

  const filteredProperties = properties.filter((p) => {
    if (preferences.propertyType && p.property_type !== preferences.propertyType) {
      return false;
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        p.title.toLowerCase().includes(query) ||
        p.address.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const handleSelectProperty = (property: Property) => {
    setSelectedId(property.id);
    setPreferences({ selectedPropertyId: property.id });
  };

  const handleContinue = () => {
    if (selectedId) {
      nextStep();
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(price);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl md:text-3xl font-bold">
          {preferences.intent === 'buy'
            ? 'Find a property to analyze'
            : preferences.intent === 'sell'
            ? 'Select a property like yours'
            : 'Pick any property to explore'}
        </h2>
        <p className="text-muted-foreground">
          Our AI will analyze the pricing in <strong>seconds</strong>
        </p>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by address or name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select
          value={preferences.propertyType || ''}
          onValueChange={(v) =>
            setPreferences({ propertyType: v as PropertyType })
          }
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Property type" />
          </SelectTrigger>
          <SelectContent>
            {propertyTypes.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Properties grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {isLoading ? (
          <div className="col-span-2 flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !Array.isArray(filteredProperties) || filteredProperties.length === 0 ? (
          <div className="col-span-2 text-center py-12 text-muted-foreground">
            No properties found. Try adjusting your filters.
          </div>
        ) : (
          filteredProperties.slice(0, 6).map((property, idx) => {
            const isSelected = selectedId === property.id;

            return (
              <motion.div
                key={property.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Card
                  onClick={() => handleSelectProperty(property)}
                  className={`p-4 cursor-pointer transition-all duration-200 border-2 ${
                    isSelected
                      ? 'border-primary bg-primary/5'
                      : 'hover:border-muted-foreground/30'
                  }`}
                >
                  <div className="flex gap-4">
                    {/* Image placeholder */}
                    <div className="w-24 h-24 rounded-lg bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                      {property.images?.[0] ? (
                        <img
                          src={property.images[0]}
                          alt={property.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <MapPin className="h-8 w-8 text-muted-foreground" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{property.title}</h3>
                      <p className="text-sm text-muted-foreground truncate">
                        {property.address}
                      </p>

                      <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                        {property.bedrooms && (
                          <span className="flex items-center gap-1">
                            <Bed className="h-3 w-3" />
                            {property.bedrooms}
                          </span>
                        )}
                        {property.bathrooms && (
                          <span className="flex items-center gap-1">
                            <Bath className="h-3 w-3" />
                            {property.bathrooms}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Square className="h-3 w-3" />
                          {property.area_m2}m²
                        </span>
                      </div>

                      <div className="flex items-center justify-between mt-2">
                        <span className="font-bold text-lg">
                          {formatPrice(property.price)}
                        </span>
                        {isSelected && (
                          <span className="text-xs text-primary flex items-center gap-1">
                            <Sparkles className="h-3 w-3" />
                            Selected
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4">
        <Button variant="ghost" onClick={prevStep} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        <Button
          onClick={handleContinue}
          disabled={!selectedId}
          size="lg"
          className="gap-2"
        >
          Analyze this property
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
