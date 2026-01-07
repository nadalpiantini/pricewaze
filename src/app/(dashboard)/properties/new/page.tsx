'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, MapPin, Plus, X } from 'lucide-react';
import { getMarketConfig, formatPrice } from '@/config/market';
import { useAuthStore } from '@/stores/auth-store';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

const propertyTypes = [
  { value: 'apartment', label: 'Apartment' },
  { value: 'house', label: 'House' },
  { value: 'land', label: 'Land' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'office', label: 'Office' },
] as const;

interface FormData {
  title: string;
  description: string;
  property_type: 'apartment' | 'house' | 'land' | 'commercial' | 'office';
  price: string;
  area_m2: string;
  bedrooms: string;
  bathrooms: string;
  parking_spaces: string;
  year_built: string;
  address: string;
  latitude: string;
  longitude: string;
  images: string[];
  features: string[];
}

interface FormErrors {
  [key: string]: string | undefined;
}

export default function NewPropertyPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const market = getMarketConfig();

  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    property_type: 'apartment',
    price: '',
    area_m2: '',
    bedrooms: '',
    bathrooms: '',
    parking_spaces: '',
    year_built: '',
    address: '',
    latitude: '',
    longitude: '',
    images: [],
    features: [],
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [featureText, setFeatureText] = useState('');

  // Map refs
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    const center: [number, number] = market.map.center;
    const zoom = market.map.zoom;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center,
      zoom,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
    map.current.addControl(
      new mapboxgl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
      }),
      'top-right'
    );

    map.current.on('load', () => {
      setMapLoaded(true);
    });

    // Handle map clicks to set location
    map.current.on('click', (e) => {
      const { lng, lat } = e.lngLat;
      setFormData((prev) => ({
        ...prev,
        latitude: lat.toFixed(8),
        longitude: lng.toFixed(8),
      }));

      // Update marker
      if (marker.current) {
        marker.current.setLngLat([lng, lat]);
      } else {
        const el = document.createElement('div');
        el.className = 'w-6 h-6 bg-primary rounded-full border-2 border-white shadow-lg';
        marker.current = new mapboxgl.Marker(el).setLngLat([lng, lat]).addTo(map.current);
      }
    });

    return () => {
      map.current?.remove();
      map.current = null;
      marker.current = null;
    };
  }, [market.map.center, market.map.zoom]);

  // Check authentication
  useEffect(() => {
    if (!user) {
      router.push('/login');
    }
  }, [user, router]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    } else if (formData.title.length > 200) {
      newErrors.title = 'Title must be 200 characters or less';
    }

    if (!formData.property_type) {
      newErrors.property_type = 'Property type is required';
    }

    const price = parseFloat(formData.price);
    if (!formData.price || isNaN(price) || price < 0) {
      newErrors.price = 'Valid price is required';
    }

    const area = parseFloat(formData.area_m2);
    if (!formData.area_m2 || isNaN(area) || area <= 0) {
      newErrors.area_m2 = 'Valid area is required';
    }

    if (formData.bedrooms && (isNaN(parseFloat(formData.bedrooms)) || parseFloat(formData.bedrooms) < 0)) {
      newErrors.bedrooms = 'Bedrooms must be a valid number';
    }

    if (formData.bathrooms && (isNaN(parseFloat(formData.bathrooms)) || parseFloat(formData.bathrooms) < 0)) {
      newErrors.bathrooms = 'Bathrooms must be a valid number';
    }

    if (formData.parking_spaces && (isNaN(parseFloat(formData.parking_spaces)) || parseFloat(formData.parking_spaces) < 0)) {
      newErrors.parking_spaces = 'Parking spaces must be a valid number';
    }

    const year = formData.year_built ? parseFloat(formData.year_built) : null;
    if (year !== null && (isNaN(year) || year < 1800 || year > new Date().getFullYear())) {
      newErrors.year_built = `Year must be between 1800 and ${new Date().getFullYear()}`;
    }

    if (!formData.address.trim()) {
      newErrors.address = 'Address is required';
    }

    const lat = parseFloat(formData.latitude);
    const lng = parseFloat(formData.longitude);
    if (!formData.latitude || !formData.longitude || isNaN(lat) || isNaN(lng)) {
      newErrors.location = 'Please select a location on the map';
    } else if (lat < -90 || lat > 90) {
      newErrors.location = 'Invalid latitude';
    } else if (lng < -180 || lng > 180) {
      newErrors.location = 'Invalid longitude';
    }

    // Validate image URLs
    formData.images.forEach((url, index) => {
      try {
        new URL(url);
      } catch {
        newErrors[`image_${index}`] = 'Invalid image URL';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        property_type: formData.property_type,
        price: parseFloat(formData.price),
        area_m2: parseFloat(formData.area_m2),
        bedrooms: formData.bedrooms ? parseInt(formData.bedrooms, 10) : undefined,
        bathrooms: formData.bathrooms ? parseInt(formData.bathrooms, 10) : undefined,
        parking_spaces: formData.parking_spaces ? parseInt(formData.parking_spaces, 10) : undefined,
        year_built: formData.year_built ? parseInt(formData.year_built, 10) : undefined,
        address: formData.address.trim(),
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude),
        images: formData.images.length > 0 ? formData.images : undefined,
        features: formData.features.length > 0 ? formData.features : undefined,
      };

      const response = await fetch('/api/properties', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create property');
      }

      toast.success('Property created successfully!', {
        description: 'Your property has been listed.',
      });

      router.push(`/properties/${data.id}`);
    } catch (error) {
      console.error('Error creating property:', error);
      toast.error('Failed to create property', {
        description: error instanceof Error ? error.message : 'Please try again',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const addImage = () => {
    if (!imageUrl.trim()) return;
    try {
      new URL(imageUrl);
      setFormData((prev) => ({
        ...prev,
        images: [...prev.images, imageUrl.trim()],
      }));
      setImageUrl('');
    } catch {
      toast.error('Please enter a valid URL');
    }
  };

  const removeImage = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  const addFeature = () => {
    if (!featureText.trim()) return;
    setFormData((prev) => ({
      ...prev,
      features: [...prev.features, featureText.trim()],
    }));
    setFeatureText('');
  };

  const removeFeature = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index),
    }));
  };

  if (!user) {
    return null;
  }

  return (
    <div className="container mx-auto py-6 space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/properties">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">List New Property</h1>
          <p className="text-muted-foreground mt-1">
            Add a new property to your listings
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, title: e.target.value }))
                }
                placeholder="e.g., Beautiful 3-bedroom apartment in downtown"
                maxLength={200}
                aria-invalid={errors.title ? 'true' : 'false'}
              />
              {errors.title && (
                <p className="text-sm text-destructive">{errors.title}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder="Describe your property..."
                rows={4}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="property_type">
                  Property Type <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.property_type}
                  onValueChange={(value: FormData['property_type']) =>
                    setFormData((prev) => ({ ...prev, property_type: value }))
                  }
                >
                  <SelectTrigger id="property_type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {propertyTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.property_type && (
                  <p className="text-sm text-destructive">{errors.property_type}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="price">
                  Price ({market.currency.symbol}) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, price: e.target.value }))
                  }
                  placeholder="0.00"
                  aria-invalid={errors.price ? 'true' : 'false'}
                />
                {errors.price && (
                  <p className="text-sm text-destructive">{errors.price}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Property Details */}
        <Card>
          <CardHeader>
            <CardTitle>Property Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="area_m2">
                Area (m²) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="area_m2"
                type="number"
                step="0.01"
                min="0"
                value={formData.area_m2}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, area_m2: e.target.value }))
                }
                placeholder="0.00"
                aria-invalid={errors.area_m2 ? 'true' : 'false'}
              />
              {errors.area_m2 && (
                <p className="text-sm text-destructive">{errors.area_m2}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bedrooms">Bedrooms</Label>
                <Input
                  id="bedrooms"
                  type="number"
                  min="0"
                  value={formData.bedrooms}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, bedrooms: e.target.value }))
                  }
                  placeholder="0"
                  aria-invalid={errors.bedrooms ? 'true' : 'false'}
                />
                {errors.bedrooms && (
                  <p className="text-sm text-destructive">{errors.bedrooms}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="bathrooms">Bathrooms</Label>
                <Input
                  id="bathrooms"
                  type="number"
                  min="0"
                  value={formData.bathrooms}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, bathrooms: e.target.value }))
                  }
                  placeholder="0"
                  aria-invalid={errors.bathrooms ? 'true' : 'false'}
                />
                {errors.bathrooms && (
                  <p className="text-sm text-destructive">{errors.bathrooms}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="parking_spaces">Parking Spaces</Label>
                <Input
                  id="parking_spaces"
                  type="number"
                  min="0"
                  value={formData.parking_spaces}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, parking_spaces: e.target.value }))
                  }
                  placeholder="0"
                  aria-invalid={errors.parking_spaces ? 'true' : 'false'}
                />
                {errors.parking_spaces && (
                  <p className="text-sm text-destructive">{errors.parking_spaces}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="year_built">Year Built</Label>
              <Input
                id="year_built"
                type="number"
                min="1800"
                max={new Date().getFullYear()}
                value={formData.year_built}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, year_built: e.target.value }))
                }
                placeholder={new Date().getFullYear().toString()}
                aria-invalid={errors.year_built ? 'true' : 'false'}
              />
              {errors.year_built && (
                <p className="text-sm text-destructive">{errors.year_built}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Location */}
        <Card>
          <CardHeader>
            <CardTitle>Location</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="address">
                Address <span className="text-destructive">*</span>
              </Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, address: e.target.value }))
                }
                placeholder="Street address, city, state, zip code"
                aria-invalid={errors.address ? 'true' : 'false'}
              />
              {errors.address && (
                <p className="text-sm text-destructive">{errors.address}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Select Location on Map</Label>
              <p className="text-sm text-muted-foreground">
                Click on the map to set the property location
              </p>
              <div
                ref={mapContainer}
                className="w-full h-[400px] rounded-lg border overflow-hidden"
              />
              {errors.location && (
                <p className="text-sm text-destructive">{errors.location}</p>
              )}
              {formData.latitude && formData.longitude && (
                <p className="text-sm text-muted-foreground">
                  Location: {formData.latitude}, {formData.longitude}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Images */}
        <Card>
          <CardHeader>
            <CardTitle>Images</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                type="url"
                placeholder="https://example.com/image.jpg"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addImage();
                  }
                }}
              />
              <Button type="button" onClick={addImage} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add
              </Button>
            </div>
            {formData.images.length > 0 && (
              <div className="space-y-2">
                {formData.images.map((url, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 p-2 border rounded"
                  >
                    <span className="flex-1 text-sm truncate">{url}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeImage(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Features */}
        <Card>
          <CardHeader>
            <CardTitle>Features</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="e.g., Swimming pool, Garden, Balcony"
                value={featureText}
                onChange={(e) => setFeatureText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addFeature();
                  }
                }}
              />
              <Button type="button" onClick={addFeature} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add
              </Button>
            </div>
            {formData.features.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.features.map((feature, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-1 px-3 py-1 bg-muted rounded-full text-sm"
                  >
                    <span>{feature}</span>
                    <button
                      type="button"
                      onClick={() => removeFeature(index)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" asChild>
            <Link href="/properties">Cancel</Link>
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Property'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

