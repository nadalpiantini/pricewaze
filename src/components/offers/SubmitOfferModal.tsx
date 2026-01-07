'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useOffers } from '@/hooks/use-offers';
import { toast } from 'sonner';
import { DollarSign, Loader2, MapPin, TrendingDown, TrendingUp } from 'lucide-react';

interface SubmitOfferModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  property: {
    id: string;
    title: string;
    address: string;
    price: number;
    area_m2?: number;
    price_per_m2?: number;
  };
  onSubmitted?: () => void;
}

export function SubmitOfferModal({
  open,
  onOpenChange,
  property,
  onSubmitted,
}: SubmitOfferModalProps) {
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const { createOffer, loading } = useOffers();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const parseCurrency = (value: string) => {
    return parseFloat(value.replace(/[^0-9.]/g, '')) || 0;
  };

  const offerAmount = parseCurrency(amount);
  const priceDiff = offerAmount - property.price;
  const priceDiffPercent = property.price > 0 ? (priceDiff / property.price) * 100 : 0;

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    if (value) {
      setAmount(formatCurrency(parseInt(value)));
    } else {
      setAmount('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (offerAmount <= 0) {
      toast.error('Please enter a valid offer amount');
      return;
    }

    const offer = await createOffer({
      property_id: property.id,
      amount: offerAmount,
      message: message || undefined,
    });

    if (offer) {
      toast.success('Offer submitted!', {
        description: `Your offer of ${formatCurrency(offerAmount)} has been sent to the seller.`,
      });
      onOpenChange(false);
      onSubmitted?.();
      // Reset form
      setAmount('');
      setMessage('');
    }
  };

  const suggestedOffers = [
    { label: '-10%', value: property.price * 0.9 },
    { label: '-5%', value: property.price * 0.95 },
    { label: 'Full Price', value: property.price },
    { label: '+5%', value: property.price * 1.05 },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Make an Offer
          </DialogTitle>
          <DialogDescription className="flex items-center gap-1">
            <MapPin className="w-4 h-4" />
            {property.title}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Property Info */}
          <div className="bg-muted p-3 rounded-lg">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Listed Price:</span>
              <span className="font-semibold">{formatCurrency(property.price)}</span>
            </div>
            {property.price_per_m2 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Price per m²:</span>
                <span>{formatCurrency(property.price_per_m2)}/m²</span>
              </div>
            )}
          </div>

          {/* Offer Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">Your Offer</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="amount"
                type="text"
                placeholder="$0"
                value={amount}
                onChange={handleAmountChange}
                className="pl-10 text-lg"
                required
                disabled={loading}
              />
            </div>
            {offerAmount > 0 && (
              <div className={`flex items-center gap-1 text-sm ${priceDiff < 0 ? 'text-green-600' : priceDiff > 0 ? 'text-orange-600' : 'text-muted-foreground'}`}>
                {priceDiff < 0 ? (
                  <TrendingDown className="w-4 h-4" />
                ) : priceDiff > 0 ? (
                  <TrendingUp className="w-4 h-4" />
                ) : null}
                <span>
                  {priceDiff === 0
                    ? 'Full asking price'
                    : `${formatCurrency(Math.abs(priceDiff))} (${Math.abs(priceDiffPercent).toFixed(1)}%) ${priceDiff < 0 ? 'below' : 'above'} asking`}
                </span>
              </div>
            )}
          </div>

          {/* Quick Select */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Quick Select</Label>
            <div className="flex gap-2 flex-wrap">
              {suggestedOffers.map((suggestion) => (
                <Button
                  key={suggestion.label}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setAmount(formatCurrency(suggestion.value))}
                  disabled={loading}
                >
                  {suggestion.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="message">Message to Seller (optional)</Label>
            <Input
              id="message"
              type="text"
              placeholder="I'm very interested in this property..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={loading}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || offerAmount <= 0}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Offer'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
