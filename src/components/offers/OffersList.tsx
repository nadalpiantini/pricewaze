'use client';

import { useEffect } from 'react';
import { useOffers } from '@/hooks/use-offers';
import { OfferCard } from './OfferCard';
import { DollarSign, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface OffersListProps {
  role?: 'buyer' | 'seller' | 'all';
  currentUserId: string;
}

export function OffersList({ role = 'all', currentUserId }: OffersListProps) {
  const { offers, loading, error, fetchOffers } = useOffers({ role });

  useEffect(() => {
    fetchOffers();
  }, [fetchOffers]);

  if (loading && offers.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8 text-destructive">
        <p>{error}</p>
        <Button variant="outline" onClick={fetchOffers} className="mt-2">
          Retry
        </Button>
      </div>
    );
  }

  if (offers.length === 0) {
    return (
      <div className="text-center p-8 text-muted-foreground">
        <DollarSign className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>No offers found</p>
        <p className="text-sm">
          {role === 'buyer'
            ? 'Make an offer on a property to get started'
            : role === 'seller'
            ? 'Offers on your properties will appear here'
            : 'Your offer activity will appear here'}
        </p>
      </div>
    );
  }

  // Group offers by property for better organization
  const groupedOffers = offers.reduce((acc, offer) => {
    const propertyId = offer.property_id;
    if (!acc[propertyId]) {
      acc[propertyId] = [];
    }
    acc[propertyId].push(offer);
    return acc;
  }, {} as Record<string, typeof offers>);

  return (
    <div className="space-y-6">
      {Object.entries(groupedOffers).map(([propertyId, propertyOffers]) => (
        <div key={propertyId} className="space-y-3">
          {propertyOffers.map((offer) => (
            <OfferCard
              key={offer.id}
              offer={offer}
              currentUserId={currentUserId}
              onUpdated={fetchOffers}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
