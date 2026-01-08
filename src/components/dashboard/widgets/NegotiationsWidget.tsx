'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MessageSquare, ArrowRight, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { WidgetWrapper } from './WidgetWrapper';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatPrice } from '@/config/market';
import { useOffers } from '@/hooks/use-offers';

type OfferStatus = 'pending' | 'countered' | 'accepted' | 'rejected' | 'expired';

interface Negotiation {
  id: string;
  propertyTitle: string;
  propertyId: string;
  amount: number;
  status: OfferStatus;
  role: 'buyer' | 'seller';
  updatedAt: string;
  requiresAction: boolean;
}

const statusConfig: Record<OfferStatus, { icon: typeof Clock; label: string; color: string; bgColor: string }> = {
  pending: {
    icon: Clock,
    label: 'Pending',
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
  },
  countered: {
    icon: AlertCircle,
    label: 'Counter Offer',
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
  },
  accepted: {
    icon: CheckCircle,
    label: 'Accepted',
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
  },
  rejected: {
    icon: XCircle,
    label: 'Rejected',
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
  },
  expired: {
    icon: Clock,
    label: 'Expired',
    color: 'text-muted-foreground',
    bgColor: 'bg-muted',
  },
};

export function NegotiationsWidget() {
  const { offers, fetchOffers, loading } = useOffers({ role: 'all' });
  const [negotiations, setNegotiations] = useState<Negotiation[]>([]);

  useEffect(() => {
    fetchOffers();
  }, [fetchOffers]);

  useEffect(() => {
    const safeOffers = Array.isArray(offers) ? offers : [];

    // Filter to active negotiations and transform
    const activeNegotiations = safeOffers
      .filter(o => o.status === 'pending' || o.status === 'countered')
      .slice(0, 5)
      .map(offer => ({
        id: offer.id,
        propertyTitle: offer.property?.title || 'Property',
        propertyId: offer.property_id,
        amount: offer.amount,
        status: offer.status as OfferStatus,
        role: 'buyer' as const, // Would come from offer data
        updatedAt: offer.updated_at || offer.created_at,
        requiresAction: offer.status === 'countered',
      }));

    setNegotiations(activeNegotiations);
  }, [offers]);

  const actionRequired = negotiations.filter(n => n.requiresAction).length;

  return (
    <WidgetWrapper
      id="negotiations"
      title="Negotiations"
      isLoading={loading}
      headerAction={
        <>
          {actionRequired > 0 && (
            <Badge variant="destructive" className="h-5 text-xs">
              {actionRequired} action{actionRequired > 1 ? 's' : ''} needed
            </Badge>
          )}
          <Button variant="ghost" size="sm" asChild className="h-7 text-xs">
            <Link href="/negotiations">
              View All
              <ArrowRight className="h-3 w-3 ml-1" />
            </Link>
          </Button>
        </>
      }
    >
      <div className="space-y-2">
        {negotiations.map((negotiation) => {
          const config = statusConfig[negotiation.status];
          const Icon = config.icon;

          return (
            <Link
              key={negotiation.id}
              href={`/offers/${negotiation.id}`}
              className={`flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors ${
                negotiation.requiresAction ? 'bg-orange-500/5 border border-orange-500/20' : ''
              }`}
            >
              <div className={`p-2 rounded-full ${config.bgColor} shrink-0`}>
                <Icon className={`h-3.5 w-3.5 ${config.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {negotiation.propertyTitle}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge variant="outline" className="text-xs h-5">
                    {config.label}
                  </Badge>
                  <span className="text-xs text-muted-foreground capitalize">
                    as {negotiation.role}
                  </span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-medium">
                  {formatPrice(negotiation.amount)}
                </p>
                {negotiation.requiresAction && (
                  <p className="text-xs text-orange-500">Action needed</p>
                )}
              </div>
            </Link>
          );
        })}

        {negotiations.length === 0 && !loading && (
          <div className="text-center py-6 text-muted-foreground">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No active negotiations</p>
            <Button variant="link" size="sm" asChild className="mt-1">
              <Link href="/properties">Browse properties</Link>
            </Button>
          </div>
        )}
      </div>
    </WidgetWrapper>
  );
}
