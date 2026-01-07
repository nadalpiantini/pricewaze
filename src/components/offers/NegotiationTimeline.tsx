'use client';

import { Badge } from '@/components/ui/badge';
import {
  DollarSign,
  ArrowRight,
  Check,
  X,
  Clock,
  ArrowRightLeft,
  Ban,
  User,
} from 'lucide-react';

interface TimelineOffer {
  id: string;
  amount: number;
  message?: string;
  status: string;
  created_at: string;
  buyer_id: string;
  seller_id: string;
}

interface NegotiationTimelineProps {
  offers: TimelineOffer[];
  currentUserId: string;
  buyer: { id: string; full_name: string };
  seller: { id: string; full_name: string };
  listingPrice: number;
}

export function NegotiationTimeline({
  offers,
  currentUserId,
  buyer,
  seller,
  listingPrice,
}: NegotiationTimelineProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'accepted':
        return <Check className="w-4 h-4 text-green-600" />;
      case 'rejected':
        return <X className="w-4 h-4 text-red-600" />;
      case 'countered':
        return <ArrowRightLeft className="w-4 h-4 text-blue-600" />;
      case 'withdrawn':
        return <Ban className="w-4 h-4 text-gray-600" />;
      case 'expired':
        return <Clock className="w-4 h-4 text-gray-600" />;
      default:
        return <Clock className="w-4 h-4 text-yellow-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'accepted':
        return <Badge className="bg-green-500">Accepted</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      case 'countered':
        return <Badge variant="outline">Countered</Badge>;
      case 'withdrawn':
        return <Badge variant="secondary">Withdrawn</Badge>;
      case 'expired':
        return <Badge variant="secondary">Expired</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  // Determine who made each offer based on pattern:
  // Initial offer = buyer, then alternates
  const getOfferMaker = (index: number) => {
    return index % 2 === 0 ? buyer : seller;
  };

  if (offers.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <DollarSign className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>No offers yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Listing Price Reference */}
      <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
          <DollarSign className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1">
          <p className="text-sm text-muted-foreground">Listed Price</p>
          <p className="font-semibold">{formatCurrency(listingPrice)}</p>
        </div>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />

        {offers.map((offer, index) => {
          const maker = getOfferMaker(index);
          const isCurrentUser = maker.id === currentUserId;
          const priceDiff = offer.amount - listingPrice;
          const priceDiffPercent = (priceDiff / listingPrice) * 100;

          return (
            <div key={offer.id} className="relative pl-10 pb-6 last:pb-0">
              {/* Timeline dot */}
              <div className="absolute left-0 w-8 h-8 rounded-full bg-background border-2 border-border flex items-center justify-center">
                {getStatusIcon(offer.status)}
              </div>

              <div className={`p-3 rounded-lg ${isCurrentUser ? 'bg-primary/5 border border-primary/20' : 'bg-muted'}`}>
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">
                      {isCurrentUser ? 'You' : maker.full_name}
                    </span>
                    {index === 0 ? (
                      <span className="text-xs text-muted-foreground">(Initial Offer)</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">(Counter)</span>
                    )}
                  </div>
                  {getStatusBadge(offer.status)}
                </div>

                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl font-bold">{formatCurrency(offer.amount)}</span>
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  <span className={`text-sm ${priceDiff < 0 ? 'text-green-600' : priceDiff > 0 ? 'text-orange-600' : 'text-muted-foreground'}`}>
                    {priceDiff === 0
                      ? 'Asking price'
                      : `${priceDiff > 0 ? '+' : ''}${priceDiffPercent.toFixed(1)}%`}
                  </span>
                </div>

                {offer.message && (
                  <p className="text-sm text-muted-foreground italic">
                    &ldquo;{offer.message}&rdquo;
                  </p>
                )}

                <p className="text-xs text-muted-foreground mt-2">
                  {formatDate(offer.created_at)}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      {offers.length > 1 && (
        <div className="border-t pt-4">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total rounds:</span>
            <span className="font-medium">{offers.length}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Latest offer:</span>
            <span className="font-medium">{formatCurrency(offers[offers.length - 1].amount)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Price movement:</span>
            <span className={`font-medium ${offers[offers.length - 1].amount > offers[0].amount ? 'text-green-600' : offers[offers.length - 1].amount < offers[0].amount ? 'text-red-600' : ''}`}>
              {formatCurrency(offers[offers.length - 1].amount - offers[0].amount)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
