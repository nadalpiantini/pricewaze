import { NextResponse } from 'next/server';

/**
 * Standard API Error Response
 * See: docs/standards/error-handling.md
 */
export interface APIErrorResponse {
  error: string;
  code: string;
  details?: Record<string, unknown>;
  timestamp: string;
}

/**
 * Error codes by domain
 */
export const ErrorCodes = {
  // Authentication
  AUTH_001: 'AUTH_001', // Invalid credentials
  AUTH_002: 'AUTH_002', // Email already registered
  AUTH_003: 'AUTH_003', // Session expired
  AUTH_004: 'AUTH_004', // Invalid token
  AUTH_005: 'AUTH_005', // Account locked

  // Offers
  OFFER_001: 'OFFER_001', // Property not found
  OFFER_002: 'OFFER_002', // Invalid offer amount
  OFFER_003: 'OFFER_003', // Offer already exists
  OFFER_004: 'OFFER_004', // Offer expired
  OFFER_005: 'OFFER_005', // Not authorized to make offer

  // AI
  AI_001: 'AI_001', // AI service unavailable
  AI_002: 'AI_002', // Invalid AI response
  AI_003: 'AI_003', // AI rate limited
  AI_004: 'AI_004', // AI timeout

  // Validation
  VAL_001: 'VAL_001', // Required field missing
  VAL_002: 'VAL_002', // Invalid format
  VAL_003: 'VAL_003', // Value out of range
  VAL_004: 'VAL_004', // Invalid reference

  // Visits
  VISIT_001: 'VISIT_001', // Property not found
  VISIT_002: 'VISIT_002', // Invalid date
  VISIT_003: 'VISIT_003', // Visit already exists
  VISIT_004: 'VISIT_004', // Cannot visit own property

  // System
  SYS_001: 'SYS_001', // Internal server error
  SYS_002: 'SYS_002', // Database error
  SYS_003: 'SYS_003', // External service error
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

/**
 * Create a standardized API error response
 */
export function apiError(
  message: string,
  code: string,
  status: number,
  details?: Record<string, unknown>
): NextResponse<APIErrorResponse> {
  return NextResponse.json(
    {
      error: message,
      code,
      details,
      timestamp: new Date().toISOString(),
    },
    { status }
  );
}

/**
 * Common error responses
 */
export const Errors = {
  unauthorized: () =>
    apiError('Authentication required', ErrorCodes.AUTH_001, 401),

  forbidden: (message = 'Access denied') =>
    apiError(message, ErrorCodes.AUTH_005, 403),

  notFound: (resource = 'Resource') =>
    apiError(`${resource} not found`, ErrorCodes.VAL_004, 404),

  badRequest: (message: string, details?: Record<string, unknown>) =>
    apiError(message, ErrorCodes.VAL_001, 400, details),

  validationFailed: (details: Record<string, unknown>) =>
    apiError('Validation failed', ErrorCodes.VAL_002, 400, details),

  conflict: (message: string) =>
    apiError(message, ErrorCodes.OFFER_003, 409),

  serverError: (message = 'Internal server error') =>
    apiError(message, ErrorCodes.SYS_001, 500),

  serviceUnavailable: (service = 'Service') =>
    apiError(`${service} is temporarily unavailable`, ErrorCodes.SYS_003, 503),
} as const;

/**
 * Custom API Error class for throwing typed errors
 */
export class APIError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'APIError';
  }

  toResponse(): NextResponse<APIErrorResponse> {
    return apiError(this.message, this.code, this.status, this.details);
  }

  toJSON(): APIErrorResponse {
    return {
      error: this.message,
      code: this.code,
      details: this.details,
      timestamp: new Date().toISOString(),
    };
  }
}
