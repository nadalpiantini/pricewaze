'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { OfferTimeline } from './OfferTimeline';
import { CopilotPanel } from '@/components/copilot/CopilotPanel';
import { DecisionPanelV2 } from '@/components/pricing/DecisionPanelV2';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import type { Offer } from '@/types/offer';

interface OfferNegotiationViewProps {
  propertyId: string;
  userId: string;
  className?: string;
}

export function OfferNegotiationView({
  propertyId,
  userId,
  className = '',
}: OfferNegotiationViewProps) {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeOfferId, setActiveOfferId] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    async function fetchOffersAndEvents() {
      try {
        setLoading(true);

        // Get user's offers for this property
        const { data: offersData, error: offersError } = await supabase
          .from('pricewaze_offers')
          .select('*')
          .eq('property_id', propertyId)
          .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
          .order('created_at', { ascending: false });

        if (offersError) {
          console.error('Error fetching offers:', offersError);
          return;
        }

        setOffers(offersData || []);

        // Get the most recent active offer (pending or countered)
        const activeOffer = (offersData || []).find(
          (o) => o.status === 'pending' || o.status === 'countered'
        );

        if (activeOffer) {
          setActiveOfferId(activeOffer.id);

          // Get events for this offer
          const { data: eventsData, error: eventsError } = await supabase
            .from('pricewaze_offer_events')
            .select('*')
            .eq('offer_id', activeOffer.id)
            .order('created_at', { ascending: true });

          if (eventsError) {
            console.error('Error fetching events:', eventsError);
          } else {
            setEvents(eventsData || []);
          }
        } else if (offersData && offersData.length > 0) {
          // If no active offer, show events from the most recent offer
          const mostRecent = offersData[0];
          setActiveOfferId(mostRecent.id);

          const { data: eventsData } = await supabase
            .from('pricewaze_offer_events')
            .select('*')
            .eq('offer_id', mostRecent.id)
            .order('created_at', { ascending: true });

          setEvents(eventsData || []);
        }
      } catch (error) {
        console.error('Error in fetchOffersAndEvents:', error);
      } finally {
        setLoading(false);
      }
    }

    if (propertyId && userId) {
      fetchOffersAndEvents();
    }
  }, [propertyId, userId, supabase]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (offers.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Negociación</CardTitle>
          <CardDescription>
            Aún no hay ofertas para esta propiedad. Crea una oferta para comenzar la negociación.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Timeline */}
      {events.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Timeline de negociación</CardTitle>
            <CardDescription>
              Historial de eventos con contexto de señales del mercado
            </CardDescription>
          </CardHeader>
          <CardContent>
            <OfferTimeline events={events} />
          </CardContent>
        </Card>
      )}

      {/* Decision Panel */}
      {activeOfferId && (
        <DecisionPanelV2 offerId={activeOfferId} />
      )}

      {/* Copilot */}
      {activeOfferId && (
        <CopilotPanel offerId={activeOfferId} />
      )}
    </div>
  );
}

