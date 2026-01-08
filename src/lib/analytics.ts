/**
 * Analytics utility for tracking user events
 * Supports multiple analytics providers
 */

type EventName =
  | 'user_registered'
  | 'user_logged_in'
  | 'property_viewed'
  | 'property_favorited'
  | 'route_created'
  | 'route_optimized'
  | 'stop_added'
  | 'signal_reported'
  | 'signal_confirmed'
  | 'offer_created'
  | 'visit_scheduled'
  | 'visit_verified'
  | 'navigation_opened'
  | 'route_exported'
  | 'route_shared'
  | 'demo_started'
  | 'demo_property_clicked'
  | 'demo_follow_clicked'
  | 'demo_copilot_opened'
  | 'signup_from_demo'
  | 'onboarding_started'
  | 'onboarding_property_clicked'
  | 'onboarding_follow_clicked'
  | 'onboarding_copilot_opened'
  | 'signup_from_onboarding'
  // Soft launch events (L1.2)
  | 'map_viewed'
  | 'property_followed'
  | 'signal_alert_received'
  | 'copilot_opened'
  | 'copilot_paywall_shown'
  | 'pro_paywall_shown'
  | 'pro_activated';

interface EventProperties {
  [key: string]: string | number | boolean | null | undefined;
}

class Analytics {
  private enabled: boolean;
  private provider: 'posthog' | 'mixpanel' | 'none';

  constructor() {
    // Enable analytics in both development and production
    this.enabled = typeof window !== 'undefined';
    // TODO: Configure provider based on env var
    this.provider = 'none'; // Default to none until configured
  }

  /**
   * Track an event
   */
  track(eventName: EventName, properties?: EventProperties) {
    if (!this.enabled) return;

    // Always log in development for debugging
    if (process.env.NODE_ENV === 'development') {
      console.log('[Analytics]', eventName, properties);
    }

    switch (this.provider) {
      case 'posthog':
        this.trackPostHog(eventName, properties);
        break;
      case 'mixpanel':
        this.trackMixpanel(eventName, properties);
        break;
      default:
        // Log in production even without provider (for debugging)
        if (process.env.NODE_ENV === 'production') {
          console.log('[Analytics]', eventName, properties);
        }
        break;
    }
  }

  /**
   * Identify a user
   */
  identify(userId: string, traits?: EventProperties) {
    if (!this.enabled) return;

    switch (this.provider) {
      case 'posthog':
        if (typeof window !== 'undefined' && (window as any).posthog) {
          (window as any).posthog.identify(userId, traits);
        }
        break;
      case 'mixpanel':
        if (typeof window !== 'undefined' && (window as any).mixpanel) {
          (window as any).mixpanel.identify(userId);
          if (traits) {
            (window as any).mixpanel.people.set(traits);
          }
        }
        break;
      default:
        break;
    }
  }

  /**
   * Track page view
   */
  page(path: string, properties?: EventProperties) {
    this.track('page_viewed' as EventName, { path, ...properties });
  }

  private trackPostHog(eventName: EventName, properties?: EventProperties) {
    if (typeof window !== 'undefined' && (window as any).posthog) {
      (window as any).posthog.capture(eventName, properties);
    }
  }

  private trackMixpanel(eventName: EventName, properties?: EventProperties) {
    if (typeof window !== 'undefined' && (window as any).mixpanel) {
      (window as any).mixpanel.track(eventName, properties);
    }
  }
}

export const analytics = new Analytics();

