# Error Handling Standards

## Overview

Este documento define los estandares para manejo de errores en PriceWaze, cubriendo API responses, frontend handling, y logging.

---

## API Error Response Format

### Standard Error Response

```typescript
interface APIError {
  error: string;          // Mensaje legible para el usuario
  code: string;           // Codigo unico de error (ej: "AUTH_001")
  details?: Record<string, unknown>; // Detalles adicionales
  timestamp: string;      // ISO timestamp
  requestId?: string;     // ID para tracing (si disponible)
}
```

### Ejemplo de Respuesta

```json
{
  "error": "Email already registered",
  "code": "AUTH_002",
  "details": {
    "field": "email",
    "suggestion": "Try logging in instead"
  },
  "timestamp": "2026-01-08T10:30:00.000Z"
}
```

---

## HTTP Status Codes

| Code | Uso | Ejemplo |
|------|-----|---------|
| 200 | Exito | GET/PUT/PATCH exitoso |
| 201 | Creado | POST exitoso |
| 204 | Sin contenido | DELETE exitoso |
| 400 | Bad Request | Validacion fallida |
| 401 | Unauthorized | No autenticado |
| 403 | Forbidden | Sin permisos |
| 404 | Not Found | Recurso no existe |
| 409 | Conflict | Duplicado/conflicto |
| 422 | Unprocessable | Logica de negocio fallida |
| 429 | Rate Limited | Demasiadas requests |
| 500 | Server Error | Error interno |
| 503 | Service Unavailable | Servicio externo caido |

---

## Error Codes por Dominio

### Authentication (AUTH_XXX)

| Code | Error | HTTP |
|------|-------|------|
| AUTH_001 | Invalid credentials | 401 |
| AUTH_002 | Email already registered | 409 |
| AUTH_003 | Session expired | 401 |
| AUTH_004 | Invalid token | 401 |
| AUTH_005 | Account locked | 403 |

### Offers (OFFER_XXX)

| Code | Error | HTTP |
|------|-------|------|
| OFFER_001 | Property not found | 404 |
| OFFER_002 | Invalid offer amount | 400 |
| OFFER_003 | Offer already exists | 409 |
| OFFER_004 | Offer expired | 422 |
| OFFER_005 | Not authorized to make offer | 403 |

### AI (AI_XXX)

| Code | Error | HTTP |
|------|-------|------|
| AI_001 | AI service unavailable | 503 |
| AI_002 | Invalid AI response | 500 |
| AI_003 | AI rate limited | 429 |
| AI_004 | AI timeout | 504 |

### Validation (VAL_XXX)

| Code | Error | HTTP |
|------|-------|------|
| VAL_001 | Required field missing | 400 |
| VAL_002 | Invalid format | 400 |
| VAL_003 | Value out of range | 400 |
| VAL_004 | Invalid reference | 400 |

---

## API Route Implementation

### Standard Pattern

```typescript
// src/app/api/example/route.ts
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const requestSchema = z.object({
  // Define schema
});

export async function POST(request: Request) {
  try {
    // 1. Authentication
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        {
          error: 'Authentication required',
          code: 'AUTH_001',
          timestamp: new Date().toISOString(),
        },
        { status: 401 }
      );
    }

    // 2. Validation
    const body = await request.json();
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          code: 'VAL_001',
          details: parsed.error.flatten(),
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    // 3. Business Logic
    const result = await performOperation(parsed.data);

    // 4. Success Response
    return NextResponse.json(result, { status: 201 });

  } catch (error) {
    // 5. Error Handling
    console.error('API Error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        code: 'SYS_001',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
```

### Error Helper Function

```typescript
// src/lib/api/errors.ts
export function apiError(
  message: string,
  code: string,
  status: number,
  details?: Record<string, unknown>
) {
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

// Usage
return apiError('Email already registered', 'AUTH_002', 409, { field: 'email' });
```

---

## Frontend Error Handling

### React Error Boundary

```typescript
// src/components/ErrorBoundary.tsx
'use client';

import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log to error tracking service
    console.error('Error caught by boundary:', error, errorInfo);
    // TODO: Send to Sentry
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="p-4 text-center">
          <h2 className="text-xl font-bold text-red-600">Something went wrong</h2>
          <p className="text-muted-foreground">Please refresh the page</p>
        </div>
      );
    }

    return this.props.children;
  }
}
```

### API Error Handling Hook

```typescript
// src/hooks/useApiError.ts
import { toast } from 'sonner';

interface APIErrorResponse {
  error: string;
  code: string;
  details?: Record<string, unknown>;
}

export function useApiError() {
  const handleError = (error: unknown) => {
    if (error instanceof Response) {
      return error.json().then((data: APIErrorResponse) => {
        toast.error(data.error);
        return data;
      });
    }

    if (error instanceof Error) {
      toast.error(error.message);
      return { error: error.message, code: 'CLIENT_ERROR' };
    }

    toast.error('An unexpected error occurred');
    return { error: 'Unknown error', code: 'UNKNOWN' };
  };

  return { handleError };
}
```

### React Query Error Handling

```typescript
// src/lib/react-query.ts
import { QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors
        if (error instanceof Error && error.message.includes('4')) {
          return false;
        }
        return failureCount < 3;
      },
      staleTime: 30_000,
    },
    mutations: {
      onError: (error) => {
        if (error instanceof Error) {
          toast.error(error.message);
        }
      },
    },
  },
});
```

---

## Async Error Patterns

### Try-Catch con Logging

```typescript
async function fetchData() {
  try {
    const response = await fetch('/api/data');

    if (!response.ok) {
      const errorData = await response.json();
      throw new APIError(errorData.error, errorData.code, response.status);
    }

    return response.json();
  } catch (error) {
    // Log error
    console.error('Fetch error:', error);

    // Re-throw for caller to handle
    throw error;
  }
}
```

### Custom APIError Class

```typescript
// src/lib/errors.ts
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

  toJSON() {
    return {
      error: this.message,
      code: this.code,
      status: this.status,
      details: this.details,
      timestamp: new Date().toISOString(),
    };
  }
}
```

---

## Form Error Handling

### React Hook Form Integration

```typescript
// src/components/forms/LoginForm.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

export function LoginForm() {
  const form = useForm({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginData) => {
    try {
      await login(data);
    } catch (error) {
      if (error instanceof APIError) {
        // Set field-specific errors
        if (error.details?.field) {
          form.setError(error.details.field as any, {
            message: error.message,
          });
        } else {
          // Set root error
          form.setError('root', {
            message: error.message,
          });
        }
      }
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      {/* Form fields */}
      {form.formState.errors.root && (
        <p className="text-red-500">{form.formState.errors.root.message}</p>
      )}
    </form>
  );
}
```

---

## Error Logging Strategy

### Console Logging (Development)

```typescript
if (process.env.NODE_ENV === 'development') {
  console.error('Error details:', {
    message: error.message,
    stack: error.stack,
    context,
  });
}
```

### Production Logging (Sentry - Future)

```typescript
// TODO: Implement Sentry integration
// import * as Sentry from '@sentry/nextjs';
//
// Sentry.captureException(error, {
//   extra: {
//     userId: user?.id,
//     endpoint,
//     requestBody,
//   },
// });
```

### Database Logging

```typescript
// Log critical errors to database
await supabase.from('pricewaze_error_logs').insert({
  error_code: error.code,
  message: error.message,
  stack: error.stack,
  user_id: user?.id,
  context: JSON.stringify(context),
  created_at: new Date().toISOString(),
});
```

---

## Best Practices

### DO

- Use consistent error codes across the application
- Include actionable messages for users
- Log errors with context
- Use Error Boundaries for React components
- Validate all inputs with Zod
- Handle both expected and unexpected errors

### DON'T

- Expose stack traces to users in production
- Use generic "Something went wrong" without codes
- Swallow errors without logging
- Return 200 for error responses
- Include sensitive data in error messages

---

## Testing Error Scenarios

```typescript
// tests/api/offers.test.ts
describe('POST /api/offers', () => {
  it('returns 400 for invalid amount', async () => {
    const response = await POST({
      body: { amount: -100 },
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.code).toBe('VAL_003');
  });

  it('returns 401 for unauthenticated user', async () => {
    // Mock no session
    const response = await POST({
      body: { amount: 100000 },
    });

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.code).toBe('AUTH_001');
  });
});
```

---

*Ultima actualizacion: 2026-01-08*
