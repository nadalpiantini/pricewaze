import { useState } from 'react';
import type { DecisionIntelligence } from '@/types/decision-intelligence';

interface UseFairnessPanelOptions {
  propertyId: string;
  offerAmount?: number;
  userId?: string;
}

interface UseFairnessPanelReturn {
  data: DecisionIntelligence | null;
  loading: boolean;
  error: string | null;
  fetchFairnessPanel: () => Promise<void>;
}

export function useFairnessPanel({
  propertyId,
  offerAmount,
  userId,
}: UseFairnessPanelOptions): UseFairnessPanelReturn {
  const [data, setData] = useState<DecisionIntelligence | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFairnessPanel = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        property_id: propertyId,
      });

      if (offerAmount) {
        params.append('offer_amount', offerAmount.toString());
      }

      if (userId) {
        params.append('user_id', userId);
      }

      const response = await fetch(`/api/ai/fairness-panel?${params.toString()}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      setData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch fairness panel');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  return {
    data,
    loading,
    error,
    fetchFairnessPanel,
  };
}

