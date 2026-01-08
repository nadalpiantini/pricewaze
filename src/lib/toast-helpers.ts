/**
 * Toast Helpers for Real-Time Notifications
 * Provides consistent toast notifications with appropriate styling
 */

import { toast, ExternalToast } from 'sonner';

// Base options for all toasts
const baseOptions: ExternalToast = {
  position: 'top-right',
  duration: 5000,
};

// Extended options with custom fields
interface ToastOptions extends ExternalToast {
  actionLabel?: string;
  actionHref?: string;
}

/**
 * Show a success toast
 */
export function showSuccess(message: string, options?: ToastOptions) {
  const { actionLabel, actionHref, ...rest } = options || {};

  toast.success(message, {
    ...baseOptions,
    ...rest,
    action: actionLabel && actionHref ? {
      label: actionLabel,
      onClick: () => window.location.href = actionHref,
    } : undefined,
  });
}

/**
 * Show an error toast
 */
export function showError(message: string, options?: ToastOptions) {
  // Destructure and ignore action props since errors typically don't have actions
  const { actionLabel: _actionLabel, actionHref: _actionHref, ...rest } = options || {};

  toast.error(message, {
    ...baseOptions,
    duration: 7000, // Longer duration for errors
    ...rest,
  });
}

/**
 * Show an info toast
 */
export function showInfo(message: string, options?: ToastOptions) {
  const { actionLabel, actionHref, ...rest } = options || {};

  toast.info(message, {
    ...baseOptions,
    ...rest,
    action: actionLabel && actionHref ? {
      label: actionLabel,
      onClick: () => window.location.href = actionHref,
    } : undefined,
  });
}

/**
 * Show a warning toast
 */
export function showWarning(message: string, options?: ToastOptions) {
  toast.warning(message, {
    ...baseOptions,
    duration: 6000,
    ...options,
  });
}

/**
 * Show a price alert toast
 */
export function showPriceAlert(
  propertyTitle: string,
  newPrice: string,
  changePercent: number,
  propertyId: string
) {
  const isDecrease = changePercent < 0;
  const message = `${propertyTitle} price ${isDecrease ? 'dropped' : 'increased'} to ${newPrice}`;

  toast(message, {
    ...baseOptions,
    duration: 8000,
    description: `${Math.abs(changePercent).toFixed(1)}% ${isDecrease ? 'decrease' : 'increase'}`,
    icon: isDecrease ? '📉' : '📈',
    action: {
      label: 'View',
      onClick: () => window.location.href = `/properties/${propertyId}`,
    },
  });
}

/**
 * Show an offer notification toast
 */
export function showOfferNotification(
  type: 'new' | 'accepted' | 'rejected' | 'countered',
  propertyTitle: string,
  amount: string,
  offerId: string
) {
  const configs = {
    new: {
      message: `New offer received on ${propertyTitle}`,
      icon: '💰',
      description: `Offer amount: ${amount}`,
    },
    accepted: {
      message: `Your offer on ${propertyTitle} was accepted!`,
      icon: '🎉',
      description: `Amount: ${amount}`,
    },
    rejected: {
      message: `Offer on ${propertyTitle} was declined`,
      icon: '❌',
      description: `Amount: ${amount}`,
    },
    countered: {
      message: `Counter-offer received on ${propertyTitle}`,
      icon: '🔄',
      description: `New amount: ${amount}`,
    },
  };

  const config = configs[type];

  toast(config.message, {
    ...baseOptions,
    duration: 10000,
    description: config.description,
    icon: config.icon,
    action: {
      label: 'View Offer',
      onClick: () => window.location.href = `/offers/${offerId}`,
    },
  });
}

/**
 * Show a visit notification toast
 */
export function showVisitNotification(
  type: 'scheduled' | 'reminder' | 'verified',
  propertyTitle: string,
  visitDate: string,
  visitId?: string
) {
  const configs = {
    scheduled: {
      message: `Visit scheduled for ${propertyTitle}`,
      icon: '📅',
      description: `Date: ${visitDate}`,
    },
    reminder: {
      message: `Upcoming visit reminder`,
      icon: '⏰',
      description: `${propertyTitle} - ${visitDate}`,
    },
    verified: {
      message: `Visit verified at ${propertyTitle}`,
      icon: '✅',
      description: 'You earned verification points!',
    },
  };

  const config = configs[type];

  toast(config.message, {
    ...baseOptions,
    duration: 8000,
    description: config.description,
    icon: config.icon,
    action: visitId ? {
      label: 'View',
      onClick: () => window.location.href = `/visits`,
    } : undefined,
  });
}

/**
 * Show a market signal toast
 */
export function showMarketSignal(
  signalType: string,
  zoneName: string,
  message: string
) {
  const icons: Record<string, string> = {
    'hot_market': '🔥',
    'price_drop': '📉',
    'new_listing': '🏠',
    'high_demand': '📈',
    'default': '📊',
  };

  toast(message, {
    ...baseOptions,
    duration: 8000,
    description: `Zone: ${zoneName}`,
    icon: icons[signalType] || icons.default,
    action: {
      label: 'View Zone',
      onClick: () => window.location.href = `/zones`,
    },
  });
}

/**
 * Show a loading toast that can be updated
 */
export function showLoading(message: string, id?: string) {
  return toast.loading(message, {
    ...baseOptions,
    id,
    duration: Infinity,
  });
}

/**
 * Dismiss a toast by ID
 */
export function dismissToast(id: string | number) {
  toast.dismiss(id);
}

/**
 * Promise toast helper
 */
export function showPromise<T>(
  promise: Promise<T>,
  messages: {
    loading: string;
    success: string | ((data: T) => string);
    error: string | ((error: Error) => string);
  }
) {
  return toast.promise(promise, {
    ...baseOptions,
    loading: messages.loading,
    success: messages.success,
    error: messages.error,
  });
}
