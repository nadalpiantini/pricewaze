'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Bed,
  Bath,
  Maximize,
  MapPin,
  Calendar,
  Car,
  Heart,
  Share2,
  MessageSquare,
  X,
  Route,
} from 'lucide-react';
import { PropertyGallery } from './PropertyGallery';
import { PropertyReviews } from '@/components/reviews/PropertyReviews';
import { AddToRouteDialog } from '@/components/routes/AddToRouteDialog';
import { PropertySignals } from '@/components/signals';
import { useAuthStore } from '@/stores/auth-store';
import { useChat } from '@/hooks/useChat';
import type { Property } from '@/types/database';

interface PropertyDetailProps {
  property: Property;
  onClose: () => void;
}

const propertyTypeLabels: Record<Property['property_type'], string> = {
  apartment: 'Apartment',
  house: 'House',
  land: 'Land',
  commercial: 'Commercial',
  office: 'Office',
};

export function PropertyDetail({ property, onClose }: PropertyDetailProps) {
  const { user } = useAuthStore();
  const { startConversation, isCreating } = useChat();
  const [showAddToRoute, setShowAddToRoute] = useState(false);
  const images = property.images?.length ? property.images : ['/placeholder-property.jpg'];

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto p-0">
        {/* Image Gallery */}
        <div className="relative p-4 bg-muted">
          <PropertyGallery images={images} propertyTitle={property.title} />
          
          {/* Close Button */}
          <Button
            variant="secondary"
            size="icon"
            className="absolute top-6 right-6 z-10"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>

          {/* Type Badge */}
          <Badge className="absolute top-6 left-6 z-10">
            {propertyTypeLabels[property.property_type]}
          </Badge>
        </div>

        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold">{property.title}</h2>
              <p className="text-muted-foreground flex items-center gap-1 mt-1">
                <MapPin className="h-4 w-4" />
                {property.address}
              </p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-primary">
                {formatPrice(property.price)}
              </p>
              <p className="text-sm text-muted-foreground">
                {formatPrice(property.price_per_m2)}/m²
              </p>
            </div>
          </div>

          {/* Property Signals (Waze-style) */}
          <div className="mb-4">
            <PropertySignals propertyId={property.id} />
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            {property.bedrooms !== null && (
              <div className="text-center p-3 bg-muted rounded-lg">
                <Bed className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                <p className="font-semibold">{property.bedrooms}</p>
                <p className="text-xs text-muted-foreground">Bedrooms</p>
              </div>
            )}
            {property.bathrooms !== null && (
              <div className="text-center p-3 bg-muted rounded-lg">
                <Bath className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                <p className="font-semibold">{property.bathrooms}</p>
                <p className="text-xs text-muted-foreground">Bathrooms</p>
              </div>
            )}
            <div className="text-center p-3 bg-muted rounded-lg">
              <Maximize className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
              <p className="font-semibold">{property.area_m2}</p>
              <p className="text-xs text-muted-foreground">m²</p>
            </div>
            {property.parking_spaces !== null && (
              <div className="text-center p-3 bg-muted rounded-lg">
                <Car className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                <p className="font-semibold">{property.parking_spaces}</p>
                <p className="text-xs text-muted-foreground">Parking</p>
              </div>
            )}
            {property.year_built && (
              <div className="text-center p-3 bg-muted rounded-lg">
                <Calendar className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                <p className="font-semibold">{property.year_built}</p>
                <p className="text-xs text-muted-foreground">Year Built</p>
              </div>
            )}
          </div>

          <Separator className="my-4" />

          {/* Tabs */}
          <Tabs defaultValue="overview">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="features">Features</TabsTrigger>
              <TabsTrigger value="pricing">Pricing Intel</TabsTrigger>
              <TabsTrigger value="reviews">Reviews</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-4">
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Description</h3>
                  <p className="text-muted-foreground">
                    {property.description || 'No description available.'}
                  </p>
                </div>

                {property.zone && (
                  <div>
                    <h3 className="font-semibold mb-2">Zone</h3>
                    <p className="text-muted-foreground">
                      {property.zone.name}, {property.zone.city}
                    </p>
                    {property.zone.avg_price_m2 && (
                      <p className="text-sm text-muted-foreground">
                        Zone average: {formatPrice(property.zone.avg_price_m2)}/m²
                      </p>
                    )}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="features" className="mt-4">
              {property.features?.length ? (
                <div className="flex flex-wrap gap-2">
                  {property.features.map((feature, index) => (
                    <Badge key={index} variant="secondary">
                      {feature}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No features listed.</p>
              )}
            </TabsContent>

            <TabsContent value="pricing" className="mt-4">
              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <h3 className="font-semibold mb-2">Price Analysis</h3>
                  <p className="text-sm text-muted-foreground">
                    AI-powered pricing intelligence coming soon. Get insights on fair pricing,
                    negotiation power, and comparable properties.
                  </p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="reviews" className="mt-4">
              <PropertyReviews propertyId={property.id} userId={user?.id} />
            </TabsContent>
          </Tabs>

          <Separator className="my-4" />

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              className="flex-1 gap-2 bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-700 hover:to-emerald-700"
              onClick={() => startConversation(property)}
              disabled={isCreating}
            >
              <MessageSquare className="h-4 w-4" />
              {isCreating ? 'Iniciando...' : 'Contactar Vendedor'}
            </Button>
            <Button variant="outline" className="gap-2">
              <Calendar className="h-4 w-4" />
              Schedule Visit
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => setShowAddToRoute(true)}
            >
              <Route className="h-4 w-4" />
              Add to Route
            </Button>
            <Button variant="outline" size="icon">
              <Heart className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon">
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>

      <AddToRouteDialog
        property={property}
        open={showAddToRoute}
        onOpenChange={setShowAddToRoute}
        onSuccess={() => {
          // Optionally show a success message or navigate
        }}
      />
    </Dialog>
  );
}
