'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Handshake,
  Sparkles,
  Zap,
} from 'lucide-react';
import { WidgetWrapper } from './WidgetWrapper';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatPrice } from '@/config/market';
import { useOffers } from '@/hooks/use-offers';
import { cn } from '@/lib/utils';

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

const statusConfig: Record<OfferStatus, {
  icon: typeof Clock;
  label: string;
  color: string;
  glowColor: string;
}> = {
  pending: {
    icon: Clock,
    label: 'Pending',
    color: '#f59e0b',
    glowColor: '#fbbf24',
  },
  countered: {
    icon: AlertCircle,
    label: 'Counter Offer',
    color: '#f97316',
    glowColor: '#fb923c',
  },
  accepted: {
    icon: CheckCircle,
    label: 'Accepted',
    color: '#22c55e',
    glowColor: '#4ade80',
  },
  rejected: {
    icon: XCircle,
    label: 'Rejected',
    color: '#ef4444',
    glowColor: '#f87171',
  },
  expired: {
    icon: Clock,
    label: 'Expired',
    color: '#6b7280',
    glowColor: '#9ca3af',
  },
};

function NegotiationCard({
  negotiation,
  index,
}: {
  negotiation: Negotiation;
  index: number;
}) {
  const [isVisible, setIsVisible] = useState(false);
  const config = statusConfig[negotiation.status];
  const Icon = config.icon;

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), index * 100);
    return () => clearTimeout(timer);
  }, [index]);

  return (
    <Link
      href={`/offers/${negotiation.id}`}
      className={cn(
        'group flex items-center gap-3 p-3 rounded-xl transition-all duration-300',
        'border hover:bg-white/5',
        negotiation.requiresAction
          ? 'bg-orange-500/5 border-orange-500/30 hover:border-orange-500/50'
          : 'border-transparent hover:border-[var(--dashboard-border-hover)]'
      )}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateX(0)' : 'translateX(-16px)',
        transition: 'opacity 0.4s ease-out, transform 0.4s ease-out, background 0.3s, border 0.3s',
      }}
    >
      {/* Status icon with glow */}
      <div
        className="p-2 rounded-lg shrink-0 transition-all duration-300 group-hover:scale-110 relative"
        style={{
          background: `${config.color}20`,
          boxShadow: `0 0 20px ${config.color}25`,
        }}
      >
        <Icon className="h-4 w-4" style={{ color: config.color }} />
        {negotiation.requiresAction && (
          <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-orange-500" />
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate group-hover:text-[var(--signal-cyan)] transition-colors">
          {negotiation.propertyTitle}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <Badge
            variant="outline"
            className="text-[10px] h-5 px-2 border-0"
            style={{
              background: `${config.color}15`,
              color: config.color,
            }}
          >
            {config.label}
          </Badge>
          <span className="text-xs text-muted-foreground capitalize">
            as {negotiation.role}
          </span>
        </div>
      </div>

      {/* Amount and action indicator */}
      <div className="text-right shrink-0">
        <p
          className="text-sm font-bold"
          style={{
            background: `linear-gradient(135deg, ${config.color} 0%, ${config.glowColor} 100%)`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          {formatPrice(negotiation.amount)}
        </p>
        {negotiation.requiresAction && (
          <p className="text-xs text-orange-400 flex items-center gap-1 justify-end mt-0.5">
            <Zap className="h-3 w-3" />
            Action needed
          </p>
        )}
      </div>
    </Link>
  );
}

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
        role: 'buyer' as const,
        updatedAt: offer.updated_at || offer.created_at,
        requiresAction: offer.status === 'countered',
      }));

    // eslint-disable-next-line react-hooks/set-state-in-effect -- derived from offers
    setNegotiations(activeNegotiations);
  }, [offers]);

  const actionRequired = negotiations.filter(n => n.requiresAction).length;

  return (
    <WidgetWrapper
      id="negotiations"
      title="Negotiations"
      isLoading={loading}
      icon={<Handshake className="h-4 w-4 text-amber-400" />}
      accentColor="amber"
      headerAction={
        <>
          {actionRequired > 0 && (
            <Badge
              className="h-5 text-xs bg-orange-500/20 text-orange-400 border-orange-500/30 hover:bg-orange-500/30"
            >
              <Zap className="h-3 w-3 mr-1" />
              {actionRequired} action{actionRequired > 1 ? 's' : ''}
            </Badge>
          )}
          <Button variant="ghost" size="sm" asChild className="h-7 text-xs hover:bg-white/5 gap-1.5">
            <Link href="/negotiations">
              View All
              <ArrowRight className="h-3 w-3" />
            </Link>
          </Button>
        </>
      }
    >
      <div className="space-y-2">
        {negotiations.map((negotiation, index) => (
          <NegotiationCard key={negotiation.id} negotiation={negotiation} index={index} />
        ))}

        {negotiations.length === 0 && !loading && (
          <div className="empty-state-premium py-8">
            <div
              className="w-14 h-14 mx-auto mb-4 rounded-2xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.2) 0%, rgba(245, 158, 11, 0.05) 100%)',
                boxShadow: '0 0 40px rgba(245, 158, 11, 0.2)',
              }}
            >
              <Handshake className="h-7 w-7 text-amber-400" />
            </div>
            <p className="text-sm font-medium text-foreground mb-1">No active negotiations</p>
            <p className="text-xs text-muted-foreground mb-4">
              Start making offers on properties
            </p>
            <Button
              variant="outline"
              size="sm"
              asChild
              className="border-amber-500/30 hover:bg-amber-500/10 hover:border-amber-500 gap-2"
            >
              <Link href="/properties">
                <Sparkles className="h-3.5 w-3.5" />
                Browse properties
              </Link>
            </Button>
          </div>
        )}
      </div>
    </WidgetWrapper>
  );
}
