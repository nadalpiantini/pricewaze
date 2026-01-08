'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft,
  Loader2,
  Bed,
  Bath,
  Maximize,
  MapPin,
  Calendar,
  Car,
  Heart,
  Share2,
  MessageSquare,
  Bell,
  BellOff,
  Bot,
} from 'lucide-react';
import { PropertyGallery } from '@/components/properties/PropertyGallery';
import { PropertyReviews } from '@/components/reviews/PropertyReviews';
import { PricingInsights } from '@/components/pricing/PricingInsights';
import { FairnessPanelV2 } from '@/components/pricing/FairnessPanelV2';
import { PropertySignals } from '@/components/signals';
import { OfferNegotiationView } from '@/components/offers/OfferNegotiationView';
import { AlertBadge } from '@/components/copilot/AlertBadge';
import { AlertModal } from '@/components/copilot/AlertModal';
import { CopilotChat } from '@/components/copilot/CopilotChat';
import { useCopilotAlerts } from '@/hooks/useCopilotAlerts';
import { useAuthStore } from '@/stores/auth-store';
import { useChat } from '@/hooks/useChat';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import type { Property } from '@/types/database';
import type { CopilotAlert, AlertType, AlertSeverity } from '@/types/copilot';

const propertyTypeLabels: Record<Property['property_type'], string> = {
  apartment: 'Apartment',
  house: 'House',
  land: 'Land',
  commercial: 'Commercial',
  office: 'Office',
};

export default function PropertyPage() {
  const params = useParams();
  const router = useRouter();
  const propertyId = params.id as string;
  const { user } = useAuthStore();
  const { startConversation, isCreating } = useChat();
  
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isTogglingFollow, setIsTogglingFollow] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<CopilotAlert | null>(null);
  const [showChat, setShowChat] = useState(false);
  const supabase = createClient();
  
  // Copilot alerts
  const { alerts, markAsResolved } = useCopilotAlerts({
    propertyId,
    autoFetch: true,
  });

  // Check if user is following this property
  useEffect(() => {
    if (!user?.id || !propertyId) return;

    (async () => {
      const { data } = await supabase
        .from('pricewaze_property_follows')
        .select('property_id')
        .eq('user_id', user.id)
        .eq('property_id', propertyId)
        .maybeSingle();

      setIsFollowing(!!data);
    })();
  }, [user?.id, propertyId, supabase]);

  useEffect(() => {
    const fetchProperty = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/properties/${propertyId}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            setError('Property not found');
          } else {
            setError('Failed to load property');
          }
          return;
        }

        const data = await response.json();
        setProperty(data);
      } catch (err) {
        console.error('Error fetching property:', err);
        setError('Failed to load property');
      } finally {
        setLoading(false);
      }
    };

    if (propertyId) {
      fetchProperty();
    }
  }, [propertyId]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  // FASE 4: Toggle follow/unfollow property
  const toggleFollow = async () => {
    if (!user?.id || !propertyId) {
      toast.error('Debes iniciar sesión para seguir propiedades');
      return;
    }

    setIsTogglingFollow(true);

    try {
      if (isFollowing) {
        // Unfollow
        const { error } = await supabase
          .from('pricewaze_property_follows')
          .delete()
          .eq('user_id', user.id)
          .eq('property_id', propertyId);

        if (error) throw error;

        setIsFollowing(false);
        toast.success('Dejaste de seguir esta propiedad');
      } else {
        // Follow
        const { error } = await supabase
          .from('pricewaze_property_follows')
          .insert({
            user_id: user.id,
            property_id: propertyId,
          });

        if (error) throw error;

        setIsFollowing(true);
        toast.success('Ahora sigues esta propiedad. Recibirás alertas cuando se confirmen señales.');
        
        // Track property_followed event (L1.2)
        const { analytics } = await import('@/lib/analytics');
        analytics.track('property_followed', { property_id: propertyId });
      }
    } catch (error: any) {
      console.error('Error toggling follow:', error);
      toast.error(error.message || 'Error al actualizar seguimiento');
    } finally {
      setIsTogglingFollow(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-2xl font-bold mb-4">Property Not Found</h1>
          <p className="text-muted-foreground mb-6">{error || 'The property you are looking for does not exist.'}</p>
          <Button onClick={() => router.push('/')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  const images = property.images?.length ? property.images : ['/placeholder-property.jpg'];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
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
            <PropertySignals propertyId={property.id} />
          </div>

          {/* Copilot Alerts */}
          {alerts.length > 0 && (
            <div className="mb-4 space-y-2">
              {alerts.map((alert) => (
                <AlertBadge
                  key={alert.id}
                  alertType={alert.alert_type as AlertType}
                  severity={alert.severity as AlertSeverity}
                  message={alert.message}
                  onClick={() => setSelectedAlert(alert)}
                />
              ))}
            </div>
          )}

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
          </div>

          <Separator className="my-4" />

          {/* Tabs */}
          <Tabs defaultValue="overview">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="features">Features</TabsTrigger>
              <TabsTrigger value="pricing">Pricing Intel</TabsTrigger>
              <TabsTrigger value="negotiation">Negotiation</TabsTrigger>
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
                <FairnessPanelV2 propertyId={property.id} />
              </div>
            </TabsContent>

            <TabsContent value="negotiation" className="mt-4">
              {user?.id ? (
                <OfferNegotiationView
                  propertyId={property.id}
                  userId={user.id}
                />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Inicia sesión para ver la negociación y el copiloto de IA
                </div>
              )}
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
              variant={isFollowing ? 'default' : 'outline'}
              size="icon"
              onClick={toggleFollow}
              disabled={isTogglingFollow}
              title={isFollowing ? 'Dejar de seguir' : 'Seguir propiedad para alertas'}
            >
              {isTogglingFollow ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isFollowing ? (
                <Bell className="h-4 w-4" />
              ) : (
                <BellOff className="h-4 w-4" />
              )}
            </Button>
            <Button variant="outline" size="icon">
              <Heart className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon">
              <Share2 className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowChat(!showChat)}
              title="Abrir Copilot"
            >
              <Bot className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Copilot Chat Floating */}
      {showChat && (
        <div className="fixed bottom-4 right-4 w-96 h-[600px] z-50 shadow-2xl rounded-lg overflow-hidden">
          <CopilotChat propertyId={property.id} />
        </div>
      )}

      {/* Alert Modal */}
      <AlertModal
        alert={selectedAlert ? {
          id: selectedAlert.id,
          type: selectedAlert.alert_type as AlertType,
          severity: selectedAlert.severity as AlertSeverity,
          message: selectedAlert.message,
          metadata: selectedAlert.metadata || {},
          propertyId: selectedAlert.property_id || null,
          offerId: null,
        } : null}
        onClose={() => setSelectedAlert(null)}
        onDismiss={markAsResolved}
      />
    </div>
  );
}


