/**
 * PriceWaze Copilot Helper Functions
 *
 * Utilities for interacting with the Copilot system from the frontend
 */

import type { CopilotAlert } from '@/types/copilot';

// Client-side logger (structured console for copilot utilities)
const copilotLogger = {
  warn: (message: string, context?: unknown) => {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[Copilot] ${message}`, context);
    }
  },
};

/**
 * Track property view and evaluate alerts
 * Call this when a user views a property detail page
 */
export async function trackPropertyView(propertyId: string): Promise<CopilotAlert[]> {
  try {
    const response = await fetch('/api/copilot/property-viewed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ property_id: propertyId }),
    });

    if (!response.ok) {
      copilotLogger.warn('Failed to track property view', response.statusText);
      return [];
    }

    const data = await response.json();
    return data.alerts || [];
  } catch (error) {
    copilotLogger.warn('Error tracking property view', error);
    return [];
  }
}

/**
 * Get active alerts for the current user
 */
export async function getActiveAlerts(propertyId?: string): Promise<CopilotAlert[]> {
  try {
    const url = propertyId
      ? `/api/copilot/alerts?property_id=${propertyId}`
      : '/api/copilot/alerts';
    
    const response = await fetch(url);

    if (!response.ok) {
      copilotLogger.warn('Failed to fetch alerts', response.statusText);
      return [];
    }

    const data = await response.json();
    return data.alerts || [];
  } catch (error) {
    copilotLogger.warn('Error fetching alerts', error);
    return [];
  }
}

/**
 * Mark an alert as resolved
 */
export async function resolveAlert(alertId: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/copilot/alerts/${alertId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resolved: true }),
    });

    return response.ok;
  } catch (error) {
    copilotLogger.warn('Error resolving alert', error);
    return false;
  }
}

