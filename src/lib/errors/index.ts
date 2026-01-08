/**
 * PriceWaze Error Handling System
 *
 * Unified error handling following the Decision Boundaries:
 * - UserError: Input validation failures (400)
 * - DomainError: Business rule violations (422)
 * - SystemError: Infrastructure failures (500)
 */

import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

// Error codes for classification
export type ErrorCode = 'USER_ERROR' | 'DOMAIN_ERROR' | 'SYSTEM_ERROR';

// Base error class for PriceWaze
export class PriceWazeError extends Error {
  constructor(
    message: string,
    public code: ErrorCode,
    public context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'PriceWazeError';
  }
}

// Specific error types
export class UserError extends PriceWazeError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'USER_ERROR', context);
    this.name = 'UserError';
  }
}

export class DomainError extends PriceWazeError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'DOMAIN_ERROR', context);
    this.name = 'DomainError';
  }
}

export class SystemError extends PriceWazeError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'SYSTEM_ERROR', context);
    this.name = 'SystemError';
  }
}

// Map error code to HTTP status
function errorCodeToStatus(code: ErrorCode): number {
  switch (code) {
    case 'USER_ERROR':
      return 400;
    case 'DOMAIN_ERROR':
      return 422;
    case 'SYSTEM_ERROR':
      return 500;
    default:
      return 500;
  }
}

// Unified API error handler
export function handleApiError(
  error: unknown,
  context?: { endpoint?: string; userId?: string }
): NextResponse {
  // Log the error with context
  const logContext = {
    ...context,
    errorType: error instanceof Error ? error.constructor.name : 'Unknown',
  };

  if (error instanceof PriceWazeError) {
    // Known error - log appropriately based on severity
    if (error.code === 'SYSTEM_ERROR') {
      logger.error(`API Error: ${error.message}`, { ...logContext, ...error.context });
    } else {
      logger.warn(`API Error: ${error.message}`, { ...logContext, ...error.context });
    }

    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
      },
      { status: errorCodeToStatus(error.code) }
    );
  }

  // Unknown error - always log as error
  const message = error instanceof Error ? error.message : 'An unexpected error occurred';
  logger.error(`Unexpected API Error: ${message}`, {
    ...logContext,
    stack: error instanceof Error ? error.stack : undefined,
  });

  return NextResponse.json(
    {
      error: 'Internal server error',
      code: 'SYSTEM_ERROR' as ErrorCode,
    },
    { status: 500 }
  );
}

// Safe wrapper for async operations that might fail silently
export async function safeAsync<T>(
  operation: () => Promise<T>,
  options: {
    fallback?: T;
    context?: string;
    silent?: boolean;
  } = {}
): Promise<T | undefined> {
  try {
    return await operation();
  } catch (error) {
    if (!options.silent) {
      logger.warn(`Safe async operation failed: ${options.context || 'unknown'}`, {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
    return options.fallback;
  }
}

// Fire-and-forget wrapper that logs failures
export function fireAndForget(
  operation: () => Promise<unknown>,
  context: string
): void {
  operation().catch((error) => {
    logger.warn(`Background operation failed: ${context}`, {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  });
}
