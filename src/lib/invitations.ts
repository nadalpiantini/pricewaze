/**
 * Invitation System for Soft Launch (L2)
 * Controls access via private invitation links
 */

/**
 * Check if invitations are enabled
 */
export const INVITATIONS_ENABLED = process.env.NEXT_PUBLIC_INVITATIONS_ENABLED === 'true';

/**
 * Invitation token from environment (for soft launch)
 * In production, this would be stored in database per user
 */
export const INVITATION_TOKEN = process.env.NEXT_PUBLIC_INVITATION_TOKEN || '';

/**
 * Validate invitation token
 */
export function isValidInvitationToken(token: string | null): boolean {
  if (!INVITATIONS_ENABLED) {
    // If invitations are disabled, allow all access
    return true;
  }

  if (!token) {
    return false;
  }

  // For soft launch, check against env var
  // In production, check against database
  return token === INVITATION_TOKEN;
}

/**
 * Get invitation token from URL (client-side only)
 */
export function getInvitationTokenFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  
  const params = new URLSearchParams(window.location.search);
  return params.get('invite') || params.get('token');
}

/**
 * Store invitation token in localStorage (client-side only)
 */
export function storeInvitationToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('pricewaze_invitation_token', token);
}

/**
 * Get stored invitation token (client-side only)
 */
export function getStoredInvitationToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('pricewaze_invitation_token');
}

/**
 * Check if user has valid invitation (client-side)
 */
export function hasValidInvitation(): boolean {
  if (!INVITATIONS_ENABLED) {
    return true; // No restrictions if disabled
  }

  const token = getInvitationTokenFromUrl() || getStoredInvitationToken();
  return isValidInvitationToken(token);
}

/**
 * Server-side validation of invitation token
 */
export function validateInvitationTokenServer(token: string | null): boolean {
  if (!INVITATIONS_ENABLED) {
    return true;
  }

  if (!token) {
    return false;
  }

  return token === INVITATION_TOKEN;
}

