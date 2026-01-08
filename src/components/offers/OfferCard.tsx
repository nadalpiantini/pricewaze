'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useOffers } from '@/hooks/use-offers';
import { toast } from 'sonner';
import {
  Check,
  X,
  MessageSquare,
  Clock,
  DollarSign,
  MapPin,
  Loader2,
  ArrowRightLeft,
  Ban,
  AlertCircle,
} from 'lucide-react';
import type { Offer } from '@/types/offer';

interface OfferCardProps {
  offer: Offer;
  currentUserId: string;
  onUpdated?: () => void;
}

export function OfferCard({ offer, currentUserId, onUpdated }: OfferCardProps) {
  const [showCounterModal, setShowCounterModal] = useState(false);
  const [counterAmount, setCounterAmount] = useState('');
  const [counterMessage, setCounterMessage] = useState('');
  const { acceptOffer, rejectOffer, counterOffer, withdrawOffer, loading } = useOffers();
  const [fairnessData, setFairnessData] = useState<{
    fairness_score: number;
    fairness_label: string;
    badge: 'justa' | 'agresiva' | 'riesgosa' | 'generosa';
  } | null>(null);
  const [timeUntilExpiry, setTimeUntilExpiry] = useState<string | null>(null);

  // H.1: Calculate time until expiry
  useEffect(() => {
    if (offer.status === 'pending' && offer.expires_at) {
      const updateTime = () => {
        const now = new Date().getTime();
        const expiry = new Date(offer.expires_at).getTime();
        const diff = expiry - now;

        if (diff <= 0) {
          setTimeUntilExpiry('Expired');
        } else {
          const hours = Math.floor(diff / (1000 * 60 * 60));
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          if (hours > 48) {
            setTimeUntilExpiry(`${Math.floor(hours / 24)}d`);
          } else if (hours > 0) {
            setTimeUntilExpiry(`${hours}h`);
          } else {
            setTimeUntilExpiry(`${minutes}m`);
          }
        }
      };

      updateTime();
      const interval = setInterval(updateTime, 60000); // Update every minute
      return () => clearInterval(interval);
    }
  }, [offer.expires_at, offer.status]);

  // H.3: Fetch fairness score
  useEffect(() => {
    if (offer.status === 'pending' && offer.id) {
      fetch(`/api/offers/${offer.id}/fairness`)
        .then((res) => res.json())
        .then((data) => {
          if (data.fairness_score) {
            setFairnessData({
              fairness_score: data.fairness_score,
              fairness_label: data.fairness_label,
              badge: data.badge,
            });
          }
        })
        .catch((err) => console.error('Error fetching fairness:', err));
    }
  }, [offer.id, offer.status]);

  const isBuyer = offer.buyer_id === currentUserId;
  const isSeller = offer.seller_id === currentUserId;
  const isPending = offer.status === 'pending';

  // Determine if current user can respond to this offer
  // Buyer made initial offer → Seller responds
  // Seller made counter → Buyer responds
  const isInitialOffer = !offer.parent_offer_id;
  const canRespond =
    isPending &&
    ((isSeller && isInitialOffer) || (isBuyer && !isInitialOffer));
  const canWithdraw =
    isPending &&
    ((isBuyer && isInitialOffer) || (isSeller && !isInitialOffer));

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

  const handleAccept = async () => {
    if (confirm('Are you sure you want to accept this offer?')) {
      const success = await acceptOffer(offer.id);
      if (success) {
        toast.success('Offer accepted!', {
          description: 'The buyer has been notified. You can now proceed with the agreement.',
        });
        onUpdated?.();
      }
    }
  };

  const handleReject = async () => {
    if (confirm('Are you sure you want to reject this offer?')) {
      const success = await rejectOffer(offer.id);
      if (success) {
        toast.success('Offer rejected');
        onUpdated?.();
      }
    }
  };

  const handleCounter = async () => {
    const amount = parseFloat(counterAmount.replace(/[^0-9.]/g, ''));
    if (!amount || amount <= 0) {
      toast.error('Please enter a valid counter amount');
      return;
    }

    const result = await counterOffer(offer.id, amount, counterMessage || undefined);
    if (result) {
      toast.success('Counter offer sent!');
      setShowCounterModal(false);
      setCounterAmount('');
      setCounterMessage('');
      onUpdated?.();
    }
  };

  const handleWithdraw = async () => {
    if (confirm('Are you sure you want to withdraw this offer?')) {
      const success = await withdrawOffer(offer.id);
      if (success) {
        toast.success('Offer withdrawn');
        onUpdated?.();
      }
    }
  };

  const statusBadge = {
    pending: <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>,
    accepted: <Badge className="bg-green-500"><Check className="w-3 h-3 mr-1" /> Accepted</Badge>,
    rejected: <Badge variant="destructive"><X className="w-3 h-3 mr-1" /> Rejected</Badge>,
    countered: <Badge variant="outline"><ArrowRightLeft className="w-3 h-3 mr-1" /> Countered</Badge>,
    withdrawn: <Badge variant="outline"><Ban className="w-3 h-3 mr-1" /> Withdrawn</Badge>,
    expired: <Badge variant="secondary">Expired</Badge>,
  };

  const priceDiff = offer.property ? offer.amount - offer.property.price : 0;
  const priceDiffPercent = offer.property?.price
    ? (priceDiff / offer.property.price) * 100
    : 0;

  return (
    <>
      <Card className={`${offer.status === 'accepted' ? 'border-green-500' : ''}`}>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <div>
              {offer.property && (
                <CardTitle className="text-lg">{offer.property.title}</CardTitle>
              )}
              {offer.property && (
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {offer.property.address}
                </p>
              )}
            </div>
            {statusBadge[offer.status]}
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-2xl font-bold flex items-center">
                <DollarSign className="w-5 h-5" />
                {formatCurrency(offer.amount).replace('$', '')}
              </p>
              {offer.property && (
                <p className={`text-sm ${priceDiff < 0 ? 'text-green-600' : priceDiff > 0 ? 'text-orange-600' : 'text-muted-foreground'}`}>
                  {priceDiff === 0
                    ? 'Full asking price'
                    : `${formatCurrency(Math.abs(priceDiff))} (${Math.abs(priceDiffPercent).toFixed(1)}%) ${priceDiff < 0 ? 'below' : 'above'}`}
                </p>
              )}
            </div>
            <div className="text-right text-sm text-muted-foreground">
              <p>{isBuyer ? 'You offered' : `From ${offer.buyer?.full_name}`}</p>
              <p>{formatDate(offer.created_at)}</p>
            </div>
          </div>

          {offer.message && (
            <div className="flex items-start gap-2 text-sm bg-muted p-2 rounded">
              <MessageSquare className="w-4 h-4 mt-0.5 text-muted-foreground" />
              <p>{offer.message}</p>
            </div>
          )}

          {/* H.1: Expiration badge */}
          {isPending && timeUntilExpiry && (
            <div className="flex items-center gap-2">
              <Badge
                variant={timeUntilExpiry === 'Expired' ? 'destructive' : 'secondary'}
                className="gap-1"
              >
                <Clock className="w-3 h-3" />
                {timeUntilExpiry === 'Expired' ? 'Expired' : `Expires in ${timeUntilExpiry}`}
              </Badge>
            </div>
          )}

          {/* H.3: Fairness score badge */}
          {isPending && fairnessData && (
            <div className="flex items-center gap-2">
              <Badge
                variant={
                  fairnessData.badge === 'justa'
                    ? 'default'
                    : fairnessData.badge === 'agresiva'
                    ? 'secondary'
                    : fairnessData.badge === 'generosa'
                    ? 'default'
                    : 'destructive'
                }
                className={`gap-1 ${
                  fairnessData.badge === 'justa'
                    ? 'bg-green-500'
                    : fairnessData.badge === 'agresiva'
                    ? 'bg-yellow-500'
                    : fairnessData.badge === 'generosa'
                    ? 'bg-blue-500'
                    : 'bg-red-500'
                }`}
              >
                {fairnessData.badge === 'justa' 
                  ? '🟢' 
                  : fairnessData.badge === 'agresiva' 
                  ? '🟡' 
                  : fairnessData.badge === 'generosa'
                  ? '🔵'
                  : '🔴'}
                {fairnessData.fairness_label === 'justa'
                  ? 'Fair offer'
                  : fairnessData.fairness_label === 'agresiva'
                  ? 'Aggressive'
                  : fairnessData.fairness_label === 'generosa'
                  ? 'Generous'
                  : 'Risky'}
              </Badge>
            </div>
          )}
        </CardContent>

        {(canRespond || canWithdraw) && (
          <CardFooter className="flex gap-2">
            {canRespond && (
              <>
                <Button
                  size="sm"
                  onClick={handleAccept}
                  disabled={loading}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 mr-1" />}
                  Accept
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowCounterModal(true)}
                  disabled={loading}
                >
                  <ArrowRightLeft className="w-4 h-4 mr-1" />
                  Counter
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleReject}
                  disabled={loading}
                  className="text-destructive"
                >
                  <X className="w-4 h-4 mr-1" />
                  Reject
                </Button>
              </>
            )}
            {canWithdraw && (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleWithdraw}
                disabled={loading}
              >
                <Ban className="w-4 h-4 mr-1" />
                Withdraw
              </Button>
            )}
          </CardFooter>
        )}
      </Card>

      {/* Counter Offer Modal */}
      <Dialog open={showCounterModal} onOpenChange={setShowCounterModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Make a Counter Offer</DialogTitle>
            <DialogDescription>
              Current offer: {formatCurrency(offer.amount)}
              {offer.property && ` (Listed at ${formatCurrency(offer.property.price)})`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Your Counter Offer</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="$0"
                  value={counterAmount}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9]/g, '');
                    if (value) {
                      setCounterAmount(formatCurrency(parseInt(value)));
                    } else {
                      setCounterAmount('');
                    }
                  }}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Message (optional)</label>
              <Input
                type="text"
                placeholder="Explain your counter offer..."
                value={counterMessage}
                onChange={(e) => setCounterMessage(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCounterModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleCounter} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Send Counter Offer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
