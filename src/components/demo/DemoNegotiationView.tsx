'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, Clock, Check, X, ArrowRightLeft, Ban, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getDemoProperty, getDemoOffers } from '@/lib/demo-data';
import { formatPrice } from '@/config/market';
import { getSignalIcon, getSignalLabel } from '@/lib/signals';
import { DemoCopilot } from './DemoCopilot';
import type { Offer } from '@/types/database';

interface DemoNegotiationViewProps {
  propertyId: string;
}

/**
 * Demo Negotiation View Component
 * Shows pre-filled negotiation timeline and copilot
 */
export function DemoNegotiationView({ propertyId }: DemoNegotiationViewProps) {
  const router = useRouter();
  const property = getDemoProperty(propertyId);
  const offers = getDemoOffers(propertyId);

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

  const activeOffer = offers.find(o => o.status === 'pending' || o.status === 'countered');
  const expiresAt = activeOffer?.expires_at 
    ? new Date(activeOffer.expires_at)
    : null;
  const hoursUntilExpiry = expiresAt
    ? Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60)))
    : null;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <Button
          variant="ghost"
          onClick={() => router.push(`/demo/property/${propertyId}`)}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to property
        </Button>

        <div className="space-y-6">
          {/* Property Header */}
          <Card>
            <CardHeader>
              <CardTitle>{property.title}</CardTitle>
              <CardDescription>{property.address}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {formatPrice(property.price)}
              </div>
            </CardContent>
          </Card>

          {/* Timeline */}
          {offers.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Negotiation in context</CardTitle>
                <CardDescription>
                  Offer history with market signal context
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
                  
                  {offers.map((offer, index) => {
                    const isBuyer = index % 2 === 0;
                    const isCurrentUser = isBuyer; // Demo: user is buyer
                    
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
                                {isBuyer ? 'You' : 'Seller'}
                              </span>
                              {index === 0 ? (
                                <span className="text-xs text-muted-foreground">(Offer sent)</span>
                              ) : (
                                <span className="text-xs text-muted-foreground">(Counteroffer)</span>
                              )}
                            </div>
                            {getStatusBadge(offer.status)}
                          </div>

                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-lg font-bold">
                              {formatPrice(offer.amount)}
                            </span>
                            {index > 0 && (
                              <span className={`text-xs ${offer.amount > offers[index - 1].amount ? 'text-green-600' : 'text-red-600'}`}>
                                {offer.amount > offers[index - 1].amount ? '↑' : '↓'} 
                                {Math.abs(((offer.amount - offers[index - 1].amount) / offers[index - 1].amount) * 100).toFixed(1)}%
                              </span>
                            )}
                          </div>

                          {offer.message && (
                            <p className="text-sm text-muted-foreground mb-2">{offer.message}</p>
                          )}

                          {/* Demo signals in timeline */}
                          {index === 0 && (
                            <div className="flex gap-1 mt-2">
                              <Badge variant="secondary" className="text-xs">
                                🧭 Visits ×4
                              </Badge>
                            </div>
                          )}
                          {index === 1 && (
                            <div className="flex gap-1 mt-2">
                              <Badge variant="secondary" className="text-xs">
                                🧭 Visits ×6
                              </Badge>
                              <Badge variant="destructive" className="text-xs">
                                🥊 Competition ×2
                              </Badge>
                            </div>
                          )}

                          <div className="text-xs text-muted-foreground mt-2">
                            {formatDate(offer.created_at)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Expiry notice */}
                {hoursUntilExpiry !== null && hoursUntilExpiry > 0 && (
                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-2">
                    <Clock className="w-4 h-4 text-yellow-600" />
                    <span className="text-sm text-yellow-800">
                      ⏳ This offer expires in {hoursUntilExpiry} hours
                    </span>
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-4">
                  The market changes while you negotiate.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Copilot */}
          {activeOffer && (
            <DemoCopilot />
          )}
        </div>
      </div>
    </div>
  );
}

function getStatusIcon(status: string) {
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
}

function getStatusBadge(status: string) {
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
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('es-ES', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

