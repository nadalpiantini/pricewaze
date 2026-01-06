'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import type { PropertyFilters as Filters, PropertyType } from '@/types/database';

interface PropertyFiltersProps {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
}

const propertyTypes: { value: PropertyType; label: string }[] = [
  { value: 'apartment', label: 'Apartment' },
  { value: 'house', label: 'House' },
  { value: 'land', label: 'Land' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'office', label: 'Office' },
];

export function PropertyFilters({ filters, onFiltersChange }: PropertyFiltersProps) {
  const updateFilter = (key: keyof Filters, value: string | number | undefined) => {
    onFiltersChange({ ...filters, [key]: value || undefined });
  };

  const clearFilters = () => {
    onFiltersChange({ status: 'active' });
  };

  const hasActiveFilters = Object.keys(filters).some(
    (key) => key !== 'status' && filters[key as keyof Filters] !== undefined
  );

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {/* Property Type */}
          <div className="space-y-2">
            <Label htmlFor="property_type">Type</Label>
            <Select
              value={filters.property_type || ''}
              onValueChange={(v) => updateFilter('property_type', v as PropertyType)}
            >
              <SelectTrigger id="property_type">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All types</SelectItem>
                {propertyTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Min Price */}
          <div className="space-y-2">
            <Label htmlFor="min_price">Min Price (USD)</Label>
            <Input
              id="min_price"
              type="number"
              placeholder="0"
              value={filters.min_price || ''}
              onChange={(e) => updateFilter('min_price', e.target.value ? Number(e.target.value) : undefined)}
            />
          </div>

          {/* Max Price */}
          <div className="space-y-2">
            <Label htmlFor="max_price">Max Price (USD)</Label>
            <Input
              id="max_price"
              type="number"
              placeholder="No limit"
              value={filters.max_price || ''}
              onChange={(e) => updateFilter('max_price', e.target.value ? Number(e.target.value) : undefined)}
            />
          </div>

          {/* Min Area */}
          <div className="space-y-2">
            <Label htmlFor="min_area">Min Area (m²)</Label>
            <Input
              id="min_area"
              type="number"
              placeholder="0"
              value={filters.min_area || ''}
              onChange={(e) => updateFilter('min_area', e.target.value ? Number(e.target.value) : undefined)}
            />
          </div>

          {/* Bedrooms */}
          <div className="space-y-2">
            <Label htmlFor="bedrooms">Bedrooms</Label>
            <Select
              value={filters.bedrooms?.toString() || ''}
              onValueChange={(v) => updateFilter('bedrooms', v ? Number(v) : undefined)}
            >
              <SelectTrigger id="bedrooms">
                <SelectValue placeholder="Any" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Any</SelectItem>
                {[1, 2, 3, 4, 5].map((n) => (
                  <SelectItem key={n} value={n.toString()}>
                    {n}+
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Bathrooms */}
          <div className="space-y-2">
            <Label htmlFor="bathrooms">Bathrooms</Label>
            <Select
              value={filters.bathrooms?.toString() || ''}
              onValueChange={(v) => updateFilter('bathrooms', v ? Number(v) : undefined)}
            >
              <SelectTrigger id="bathrooms">
                <SelectValue placeholder="Any" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Any</SelectItem>
                {[1, 2, 3, 4].map((n) => (
                  <SelectItem key={n} value={n.toString()}>
                    {n}+
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <div className="mt-4 flex justify-end">
            <Button variant="ghost" size="sm" onClick={clearFilters} className="flex items-center gap-1">
              <X className="h-4 w-4" />
              Clear Filters
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
