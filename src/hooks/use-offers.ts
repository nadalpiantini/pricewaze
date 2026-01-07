import { useState, useCallback } from 'react';
import type { Offer, CreateOfferRequest } from '@/types/offer';

interface UseOffersOptions {
  role?: 'buyer' | 'seller' | 'all';
  status?: string;
  propertyId?: string;
}

export function useOffers(options: UseOffersOptions = {}) {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOffers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (options.role) params.set('role', options.role);
      if (options.status) params.set('status', options.status);
      if (options.propertyId) params.set('property_id', options.propertyId);

      const response = await fetch(`/api/offers?${params.toString()}`);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch offers');
      }

      const data = await response.json();
      setOffers(data);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch offers';
      setError(message);
      return [];
    } finally {
      setLoading(false);
    }
  }, [options.role, options.status, options.propertyId]);

  const createOffer = useCallback(async (data: CreateOfferRequest): Promise<Offer | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/offers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to create offer');
      }

      const offer = await response.json();
      setOffers((prev) => [offer, ...prev]);
      return offer;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create offer';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const acceptOffer = useCallback(async (id: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/offers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'accept' }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to accept offer');
      }

      const { offer } = await response.json();
      setOffers((prev) => prev.map((o) => (o.id === id ? offer : o)));
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to accept offer';
      setError(message);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const rejectOffer = useCallback(async (id: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/offers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject' }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to reject offer');
      }

      const { offer } = await response.json();
      setOffers((prev) => prev.map((o) => (o.id === id ? offer : o)));
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to reject offer';
      setError(message);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const counterOffer = useCallback(async (
    id: string,
    counterAmount: number,
    message?: string
  ): Promise<Offer | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/offers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'counter', counter_amount: counterAmount, message }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to submit counter offer');
      }

      const { offer } = await response.json();
      // Refresh offers to get updated list
      fetchOffers();
      return offer;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to submit counter offer';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchOffers]);

  const withdrawOffer = useCallback(async (id: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/offers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'withdraw' }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to withdraw offer');
      }

      const { offer } = await response.json();
      setOffers((prev) => prev.map((o) => (o.id === id ? offer : o)));
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to withdraw offer';
      setError(message);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const getOffer = useCallback(async (id: string): Promise<Offer | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/offers/${id}`);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch offer');
      }

      return await response.json();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch offer';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    offers,
    loading,
    error,
    fetchOffers,
    createOffer,
    acceptOffer,
    rejectOffer,
    counterOffer,
    withdrawOffer,
    getOffer,
  };
}
