'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  MessageSquare,
  Check,
  X,
  RefreshCw,
  Clock,
  ArrowRight,
  Filter,
  MapPin,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useOffers } from '@/hooks/use-offers';
import { useAuthStore } from '@/stores/auth-store';
import type { Offer, OfferStatus } from '@/types/offer';

const statusConfig: Record<
  OfferStatus,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: typeof Check }
> = {
  pending: { label: 'Pending', variant: 'secondary', icon: Clock },
  accepted: { label: 'Accepted', variant: 'default', icon: Check },
  rejected: { label: 'Rejected', variant: 'destructive', icon: X },
  countered: { label: 'Countered', variant: 'outline', icon: RefreshCw },
  withdrawn: { label: 'Withdrawn', variant: 'outline', icon: X },
  expired: { label: 'Expired', variant: 'outline', icon: Clock },
};

export default function OffersPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'received' | 'sent' | 'all'>('received');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [counterDialogOpen, setCounterDialogOpen] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [counterAmount, setCounterAmount] = useState('');
  const [counterMessage, setCounterMessage] = useState('');

  const {
    offers: receivedOffers,
    loading: receivedLoading,
    fetchOffers: fetchReceived,
    acceptOffer,
    rejectOffer,
    counterOffer,
  } = useOffers({ role: 'seller' });

  const {
    offers: sentOffers,
    loading: sentLoading,
    fetchOffers: fetchSent,
    withdrawOffer,
  } = useOffers({ role: 'buyer' });

  const {
    offers: allOffers,
    loading: allLoading,
    fetchOffers: fetchAll,
  } = useOffers({ role: 'all' });

  useEffect(() => {
    fetchReceived();
    fetchSent();
    fetchAll();
  }, [fetchReceived, fetchSent, fetchAll]);

  const getOffersByTab = () => {
    switch (activeTab) {
      case 'received':
        return receivedOffers;
      case 'sent':
        return sentOffers;
      case 'all':
        return allOffers;
    }
  };

  const getFilteredOffers = () => {
    const offers = getOffersByTab();
    const safeOffers = Array.isArray(offers) ? offers : [];
    if (statusFilter === 'all') return safeOffers;
    return safeOffers.filter((offer) => offer.status === statusFilter);
  };

  const isLoading = activeTab === 'received' ? receivedLoading :
    activeTab === 'sent' ? sentLoading : allLoading;

  const filteredOffers = getFilteredOffers();

  const formatPrice = (price: number) => {
    return `$${price.toLocaleString()}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handleAccept = async (offerId: string) => {
    const success = await acceptOffer(offerId);
    if (success) {
      fetchReceived();
      fetchAll();
    }
  };

  const handleReject = async (offerId: string) => {
    const success = await rejectOffer(offerId);
    if (success) {
      fetchReceived();
      fetchAll();
    }
  };

  const handleCounterClick = (offer: Offer) => {
    setSelectedOffer(offer);
    setCounterAmount(offer.amount.toString());
    setCounterMessage('');
    setCounterDialogOpen(true);
  };

  const handleCounterSubmit = async () => {
    if (!selectedOffer || !counterAmount) return;

    const result = await counterOffer(
      selectedOffer.id,
      parseInt(counterAmount),
      counterMessage || undefined
    );

    if (result) {
      setCounterDialogOpen(false);
      setSelectedOffer(null);
      fetchReceived();
      fetchAll();
    }
  };

  const handleWithdraw = async (offerId: string) => {
    const success = await withdrawOffer(offerId);
    if (success) {
      fetchSent();
      fetchAll();
    }
  };

  const isReceived = (offer: Offer) => offer.seller_id === user?.id;
  const canActOnOffer = (offer: Offer) =>
    offer.status === 'pending' || offer.status === 'countered';

  const renderOfferCard = (offer: Offer) => {
    const StatusIcon = statusConfig[offer.status].icon;
    const received = isReceived(offer);
    const canAct = canActOnOffer(offer) && received;
    const canWithdraw = canActOnOffer(offer) && !received;

    return (
      <Card key={offer.id}>
        <CardContent className="p-4">
          <div className="flex gap-4">
            {/* Property image */}
            <div className="relative w-24 h-24 rounded-lg overflow-hidden bg-muted shrink-0">
              {offer.property?.images?.[0] ? (
                <Image
                  src={offer.property.images[0]}
                  alt={offer.property.title || 'Property'}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <MapPin className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
            </div>

            {/* Offer details */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <Link
                    href={`/properties/${offer.property_id}`}
                    className="font-semibold hover:underline line-clamp-1"
                  >
                    {offer.property?.title || 'Property'}
                  </Link>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {received ? `From: ${offer.buyer?.full_name || 'Buyer'}` :
                      `To: ${offer.seller?.full_name || 'Seller'}`}
                  </p>
                </div>
                <Badge variant={statusConfig[offer.status].variant}>
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {statusConfig[offer.status].label}
                </Badge>
              </div>

              <div className="mt-3 flex items-center gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Offer: </span>
                  <span className="font-semibold text-primary">
                    {formatPrice(offer.amount)}
                  </span>
                </div>
                {offer.property?.price && (
                  <div>
                    <span className="text-muted-foreground">Listed: </span>
                    <span>{formatPrice(offer.property.price)}</span>
                  </div>
                )}
                <div className="text-muted-foreground">
                  {formatDate(offer.created_at)}
                </div>
              </div>

              {offer.message && (
                <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                  &quot;{offer.message}&quot;
                </p>
              )}

              {/* Actions */}
              {(canAct || canWithdraw) && (
                <div className="flex items-center gap-2 mt-3">
                  {canAct && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => handleAccept(offer.id)}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCounterClick(offer)}
                      >
                        <RefreshCw className="h-4 w-4 mr-1" />
                        Counter
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleReject(offer.id)}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </>
                  )}
                  {canWithdraw && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleWithdraw(offer.id)}
                    >
                      Withdraw Offer
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Offers</h1>
        <p className="text-muted-foreground">
          Manage your property offers and negotiations
        </p>
      </div>

      {/* Tabs and filters */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <TabsList>
            <TabsTrigger value="received">
              Received
              {receivedOffers.filter(o => o.status === 'pending').length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {receivedOffers.filter(o => o.status === 'pending').length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="sent">Sent</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="accepted">Accepted</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="countered">Countered</SelectItem>
                <SelectItem value="withdrawn">Withdrawn</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <TabsContent value="received" className="mt-6">
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      <div className="w-24 h-24 bg-muted animate-pulse rounded-lg" />
                      <div className="flex-1 space-y-2">
                        <div className="h-5 w-48 bg-muted animate-pulse rounded" />
                        <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                        <div className="h-4 w-64 bg-muted animate-pulse rounded" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredOffers.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <MessageSquare className="h-16 w-16 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No offers received</h3>
                <p className="text-muted-foreground text-center max-w-md">
                  When buyers make offers on your properties, they will appear here.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredOffers.map(renderOfferCard)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="sent" className="mt-6">
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      <div className="w-24 h-24 bg-muted animate-pulse rounded-lg" />
                      <div className="flex-1 space-y-2">
                        <div className="h-5 w-48 bg-muted animate-pulse rounded" />
                        <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                        <div className="h-4 w-64 bg-muted animate-pulse rounded" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredOffers.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <MessageSquare className="h-16 w-16 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No offers sent</h3>
                <p className="text-muted-foreground text-center mb-6 max-w-md">
                  Browse properties and make offers to start negotiating.
                </p>
                <Button asChild>
                  <Link href="/properties">
                    Browse Properties
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredOffers.map(renderOfferCard)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="all" className="mt-6">
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      <div className="w-24 h-24 bg-muted animate-pulse rounded-lg" />
                      <div className="flex-1 space-y-2">
                        <div className="h-5 w-48 bg-muted animate-pulse rounded" />
                        <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                        <div className="h-4 w-64 bg-muted animate-pulse rounded" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredOffers.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <MessageSquare className="h-16 w-16 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No offers yet</h3>
                <p className="text-muted-foreground text-center max-w-md">
                  Your offer history will appear here.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredOffers.map(renderOfferCard)}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Counter offer dialog */}
      <Dialog open={counterDialogOpen} onOpenChange={setCounterDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Counter Offer</DialogTitle>
            <DialogDescription>
              Submit a counter offer for {selectedOffer?.property?.title}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Counter Amount ($)</Label>
              <Input
                id="amount"
                type="number"
                value={counterAmount}
                onChange={(e) => setCounterAmount(e.target.value)}
                placeholder="Enter your counter offer"
              />
              <p className="text-sm text-muted-foreground">
                Original offer: {selectedOffer && formatPrice(selectedOffer.amount)}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Message (optional)</Label>
              <Input
                id="message"
                value={counterMessage}
                onChange={(e) => setCounterMessage(e.target.value)}
                placeholder="Add a message to your counter offer"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCounterDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCounterSubmit}>
              Submit Counter Offer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
