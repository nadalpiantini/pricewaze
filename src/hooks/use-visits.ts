import { useState, useCallback } from 'react';
import type { Visit, CreateVisitRequest, VerifyVisitRequest, VerifyVisitResponse } from '@/types/visit';

interface UseVisitsOptions {
  role?: 'visitor' | 'owner' | 'all';
  status?: string;
}

export function useVisits(options: UseVisitsOptions = {}) {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchVisits = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (options.role) params.set('role', options.role);
      if (options.status) params.set('status', options.status);

      const response = await fetch(`/api/visits?${params.toString()}`);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch visits');
      }

      const data = await response.json();
      setVisits(data);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch visits';
      setError(message);
      return [];
    } finally {
      setLoading(false);
    }
  }, [options.role, options.status]);

  const scheduleVisit = useCallback(async (data: CreateVisitRequest): Promise<Visit | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/visits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to schedule visit');
      }

      const visit = await response.json();
      setVisits((prev) => [...prev, visit]);
      return visit;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to schedule visit';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const cancelVisit = useCallback(async (id: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/visits/${id}`, { method: 'DELETE' });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to cancel visit');
      }

      setVisits((prev) => prev.map((v) => (v.id === id ? { ...v, status: 'cancelled' } : v)));
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to cancel visit';
      setError(message);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const verifyVisit = useCallback(async (
    id: string,
    data: VerifyVisitRequest
  ): Promise<VerifyVisitResponse | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/visits/${id}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to verify visit');
      }

      setVisits((prev) =>
        prev.map((v) => (v.id === id ? result.visit : v))
      );

      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to verify visit';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const getVisit = useCallback(async (id: string): Promise<Visit | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/visits/${id}`);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch visit');
      }

      return await response.json();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch visit';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    visits,
    loading,
    error,
    fetchVisits,
    scheduleVisit,
    cancelVisit,
    verifyVisit,
    getVisit,
  };
}
