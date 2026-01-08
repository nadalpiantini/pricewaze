'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Bed,
  Bath,
  Maximize,
  MapPin,
  Car,
  Heart,
  HeartOff,
  ArrowLeft,
  Calendar,
} from 'lucide-react';
import { PropertyGallery } from '@/components/properties/PropertyGallery';
import { getDemoProperty, getDemoSignals } from '@/lib/demo-data';
import { saveDemoState, loadDemoState } from '@/lib/demo';
import { getSignalIcon, getSignalLabel, isPositiveSignal } from '@/lib/signals';
import { analytics } from '@/lib/analytics';
import { formatPrice } from '@/config/market';
import { toast } from 'sonner';
import type { Property } from '@/types/database';

interface DemoPropertyViewProps {
  propertyId: string;
}

const propertyTypeLabels: Record<Property['property_type'], string> = {
  apartment: 'Apartment',
  house: 'House',
  land: 'Land',
  commercial: 'Commercial',
  office: 'Office',
};

/**
 * Demo Property View Component
 * Shows property details with signals and follow button
 */
export function DemoPropertyView({ propertyId }: DemoPropertyViewProps) {
  const router = useRouter();
  const property = getDemoProperty(propertyId);
  const [isFollowing, setIsFollowing] = useState(() => 
    loadDemoState<string[]>('followed_properties', []).includes(propertyId)
  );

  if (!property) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center py-8 max-w-md">
          <h1 className="text-2xl font-bold mb-2">Propiedad no encontrada</h1>
          <p className="text-muted-foreground mb-6">
            La propiedad que buscas no está disponible en el demo.
          </p>
          <Button onClick={() => router.push('/demo/map')} className="mt-4">
            Volver al mapa
          </Button>
        </div>
      </div>
    );
  }

  const images = property.images?.length ? property.images : ['/placeholder-property.jpg'];

  const handleFollow = () => {
    const followed = loadDemoState<string[]>('followed_properties', []) || [];
    if (isFollowing) {
      const updated = followed.filter(id => id !== propertyId);
      saveDemoState('followed_properties', updated);
      setIsFollowing(false);
      toast.success('Unfollowed this property');
    } else {
      followed.push(propertyId);
      saveDemoState('followed_properties', followed);
      setIsFollowing(true);
      analytics.track('onboarding_follow_clicked', { property_id: propertyId });
      toast.success('Recibirás alertas de esta propiedad');
    }
  };

  const handleViewNegotiation = () => {
    router.push(`/demo/negotiation/${propertyId}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        <Button
          variant="ghost"
          onClick={() => router.push('/demo/map')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver al mapa
        </Button>

        {/* Image Gallery */}
        <div className="relative mb-6 bg-muted rounded-lg overflow-hidden">
          <PropertyGallery images={images} propertyTitle={property.title} />
          
          {/* Type Badge */}
          <Badge className="absolute top-6 left-6 z-10">
            {propertyTypeLabels[property.property_type]}
          </Badge>
        </div>

        <div className="bg-card rounded-lg shadow-sm border p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold">{property.title}</h1>
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
            <div className="mb-2">
              <h2 className="text-xl font-semibold mb-2">What you don't see in the listing</h2>
            </div>
            <DemoSignalsDisplay propertyId={propertyId} />
            <p className="text-xs text-muted-foreground mt-2">
              These signals come from real visits and activity.
            </p>
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
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="negotiation">Negotiation</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-4">
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Description</h3>
                  <p className="text-sm text-muted-foreground">{property.description}</p>
                </div>
                {property.features && property.features.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">Features</h3>
                    <div className="flex flex-wrap gap-2">
                      {property.features.map((feature, idx) => (
                        <Badge key={idx} variant="secondary">{feature}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="negotiation" className="mt-4">
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground mb-4">
                  Ver el timeline de negociación y análisis del copiloto
                </p>
                <Button onClick={handleViewNegotiation} className="w-full">
                  Ver negociación
                </Button>
              </div>
            </TabsContent>
          </Tabs>

          <Separator className="my-4" />

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              variant={isFollowing ? "outline" : "default"}
              onClick={handleFollow}
              className="flex-1"
            >
              {isFollowing ? (
                <>
                  <HeartOff className="h-4 w-4 mr-2" />
                  Dejar de seguir
                </>
              ) : (
                <>
                  <Heart className="h-4 w-4 mr-2" />
                  ⭐ Follow this property
                </>
              )}
            </Button>
          </div>
          {!isFollowing && (
            <p className="text-xs text-muted-foreground mt-2 text-center">
              We&apos;ll notify you if the context changes
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Demo Signals Display
 * Shows signals using demo data instead of fetching from DB
 */
function DemoSignalsDisplay({ propertyId }: { propertyId: string }) {
  const signals = getDemoSignals(propertyId);
  
  if (signals.length === 0) {
    return null;
  }

  return (
    <div className="flex gap-2 flex-wrap">
      {signals.map((signalState) => {
        const { signal_type, strength, confirmed } = signalState;
        const roundedStrength = Math.round(strength);
        
        let badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline' = 'secondary';
        let badgeClassName = 'text-sm px-3 py-1 cursor-help';
        
        // System signals are negative (pressure) by default
        const isSystemSignal = ['high_activity', 'many_visits', 'competing_offers', 'long_time_on_market', 'recent_price_change'].includes(signal_type);
        
        if (confirmed) {
          if (isPositiveSignal(signal_type)) {
            badgeVariant = 'default';
            badgeClassName += ' bg-green-100 text-green-800 hover:bg-green-200 border-green-300';
          } else {
            // Negative signals (including system signals)
            badgeVariant = 'destructive';
            badgeClassName += ' bg-red-100 text-red-800 hover:bg-red-200';
          }
        } else {
          badgeVariant = 'secondary';
          badgeClassName += ' bg-gray-100 text-gray-700 hover:bg-gray-200';
        }

        return (
          <Badge
            key={signal_type}
            variant={badgeVariant}
            className={badgeClassName}
          >
            <span className="mr-1">{getSignalIcon(signal_type)}</span>
            <span>{getSignalLabel(signal_type)}</span>
            {roundedStrength > 1 && (
              <span className="ml-1 font-semibold">×{roundedStrength}</span>
            )}
            {confirmed && (
              <span className="ml-1 text-xs" title="Confirmado por comunidad">✓</span>
            )}
          </Badge>
        );
      })}
    </div>
  );
}

