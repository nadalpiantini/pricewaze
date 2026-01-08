'use client';

/**
 * Unified Fetch Hook for PriceWaze
 *
 * Provides consistent data fetching with:
 * - React Query integration for caching and deduplication
 * - PriceWaze error handling integration
 * - Type-safe responses
 * - Configurable retry, stale time, and refetch behavior
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { PriceWazeError, type ErrorCode } from '@/lib/errors';
import { toast } from 'sonner';

// ============================================================================
// TYPES
// ============================================================================

interface ApiErrorResponse {
  error: string;
  code?: ErrorCode;
  details?: Record<string, unknown>;
}

interface FetchOptions {
  /** Request headers */
  headers?: Record<string, string>;
  /** Query parameters */
  params?: Record<string, string | number | boolean | undefined>;
  /** Request body for mutations */
  body?: unknown;
  /** HTTP method */
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
}

interface UseFetchOptions<T> extends Omit<UseQueryOptions<T, PriceWazeError>, 'queryKey' | 'queryFn'> {
  /** Query parameters to append to URL */
  params?: Record<string, string | number | boolean | undefined>;
  /** Show toast on error */
  showErrorToast?: boolean;
}

interface UseMutationFetchOptions<TData, TVariables> {
  /** Show toast on success */
  showSuccessToast?: boolean;
  /** Success toast message */
  successMessage?: string;
  /** Show toast on error */
  showErrorToast?: boolean;
  /** Query keys to invalidate on success */
  invalidateKeys?: string[][];
  /** Called on successful mutation */
  onSuccess?: (data: TData) => void;
  /** Called on mutation error */
  onError?: (error: PriceWazeError) => void;
  /** Called when mutation is settled (success or error) */
  onSettled?: () => void;
}

// ============================================================================
// FETCH UTILITIES
// ============================================================================

/**
 * Build URL with query parameters
 */
function buildUrl(
  url: string,
  params?: Record<string, string | number | boolean | undefined>
): string {
  if (!params) return url;

  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.set(key, String(value));
    }
  });

  const queryString = searchParams.toString();
  return queryString ? `${url}?${queryString}` : url;
}

/**
 * Core fetch function with error handling
 */
async function fetchWithErrorHandling<T>(
  url: string,
  options: FetchOptions = {}
): Promise<T> {
  const { headers = {}, body, method = 'GET' } = options;

  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  // Parse response
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const errorData = data as ApiErrorResponse | null;
    const message = errorData?.error || `Request failed with status ${response.status}`;
    const code = errorData?.code || 'SYSTEM_ERROR';

    throw new PriceWazeError(message, code, {
      status: response.status,
      url,
      details: errorData?.details,
    });
  }

  return data as T;
}

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Unified fetch hook for GET requests with React Query
 *
 * @example
 * ```tsx
 * const { data, isLoading, error } = usePriceWazeFetch<Property[]>(
 *   '/api/properties',
 *   { params: { status: 'active' }, staleTime: 30000 }
 * );
 * ```
 */
export function usePriceWazeFetch<T>(
  url: string,
  options: UseFetchOptions<T> = {}
) {
  const {
    params,
    showErrorToast = true,
    enabled = true,
    staleTime = 30000, // 30 seconds default
    retry = 2,
    ...queryOptions
  } = options;

  const fullUrl = buildUrl(url, params);

  return useQuery<T, PriceWazeError>({
    queryKey: [url, params],
    queryFn: () => fetchWithErrorHandling<T>(fullUrl),
    enabled,
    staleTime,
    retry,
    ...queryOptions,
    // Handle errors
    throwOnError: false,
    // Note: onError is deprecated in v5, use meta or handle in component
  });
}

/**
 * Unified mutation hook for POST/PUT/PATCH/DELETE requests
 *
 * @example
 * ```tsx
 * const { mutate, isPending } = usePriceWazeMutation<Offer, CreateOfferInput>(
 *   '/api/offers',
 *   {
 *     method: 'POST',
 *     successMessage: 'Oferta creada exitosamente',
 *     invalidateKeys: [['offers']],
 *   }
 * );
 *
 * mutate({ property_id: '123', amount: 100000 });
 * ```
 */
export function usePriceWazeMutation<TData, TVariables = unknown>(
  url: string,
  options: UseMutationFetchOptions<TData, TVariables> & { method?: FetchOptions['method'] } = {}
) {
  const queryClient = useQueryClient();

  const {
    method = 'POST',
    showSuccessToast = true,
    successMessage,
    showErrorToast = true,
    invalidateKeys = [],
    onSuccess,
    onError,
    onSettled,
  } = options;

  return useMutation<TData, PriceWazeError, TVariables>({
    mutationFn: (variables) =>
      fetchWithErrorHandling<TData>(url, {
        method,
        body: variables,
      }),
    onSuccess: (data) => {
      // Show success toast
      if (showSuccessToast && successMessage) {
        toast.success(successMessage);
      }

      // Invalidate related queries
      invalidateKeys.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: key });
      });

      // Call custom onSuccess
      onSuccess?.(data);
    },
    onError: (error) => {
      // Show error toast
      if (showErrorToast) {
        toast.error(error.message || 'Ocurrió un error');
      }

      // Call custom onError
      onError?.(error);
    },
    onSettled: () => {
      onSettled?.();
    },
  });
}

/**
 * Prefetch data for a URL (useful for optimistic UI)
 */
export function usePrefetch() {
  const queryClient = useQueryClient();

  return async <T>(
    url: string,
    params?: Record<string, string | number | boolean | undefined>
  ) => {
    const fullUrl = buildUrl(url, params);
    await queryClient.prefetchQuery({
      queryKey: [url, params],
      queryFn: () => fetchWithErrorHandling<T>(fullUrl),
      staleTime: 30000,
    });
  };
}

/**
 * Invalidate queries by key pattern
 */
export function useInvalidateQueries() {
  const queryClient = useQueryClient();

  return (keys: string[][]) => {
    keys.forEach((key) => {
      queryClient.invalidateQueries({ queryKey: key });
    });
  };
}

// ============================================================================
// SPECIALIZED HOOKS
// ============================================================================

/**
 * Fetch with automatic refetch on window focus
 */
export function usePriceWazeLiveFetch<T>(
  url: string,
  options: UseFetchOptions<T> = {}
) {
  return usePriceWazeFetch<T>(url, {
    refetchOnWindowFocus: true,
    refetchInterval: 60000, // Refetch every minute
    ...options,
  });
}

/**
 * Fetch that only runs once and caches indefinitely
 */
export function usePriceWazeStaticFetch<T>(
  url: string,
  options: UseFetchOptions<T> = {}
) {
  return usePriceWazeFetch<T>(url, {
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    ...options,
  });
}

// ============================================================================
// UTILITY EXPORTS
// ============================================================================

export { fetchWithErrorHandling, buildUrl };
export type { FetchOptions, UseFetchOptions, UseMutationFetchOptions, ApiErrorResponse };
