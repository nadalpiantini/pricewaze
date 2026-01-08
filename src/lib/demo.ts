/**
 * Demo Mode Configuration
 * Allows isolating demo data and features from production
 */

export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

/**
 * Demo state management (localStorage-based for demo mode)
 */
export function saveDemoState<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`demo_${key}`, JSON.stringify(value));
  } catch (error) {
    console.error('Failed to save demo state:', error);
  }
}

export function loadDemoState<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const item = localStorage.getItem(`demo_${key}`);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error('Failed to load demo state:', error);
    return defaultValue;
  }
}

export function clearDemoState(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(`demo_${key}`);
  } catch (error) {
    console.error('Failed to clear demo state:', error);
  }
}
