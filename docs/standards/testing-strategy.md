# Testing Strategy

## Overview

Este documento define la estrategia de testing para PriceWaze, incluyendo tipos de tests, herramientas, y targets de cobertura.

---

## Testing Pyramid

```
        /\
       /E2E\        <- Playwright (Critical flows)
      /------\
     /Integr. \     <- API + Component tests
    /----------\
   /   Unit     \   <- Jest + React Testing Library
  /--------------\
```

---

## Tipos de Tests

### 1. Unit Tests

**Proposito**: Validar funciones y componentes aislados

**Herramientas**:
- Jest (test runner)
- React Testing Library (componentes)

**Scope**:
- Funciones de utilidad (`/src/lib/`)
- Hooks personalizados (`/src/hooks/`)
- Store logic (`/src/stores/`)
- Zod schemas

**Target de Cobertura**: 80%

```typescript
// tests/unit/lib/pricing.test.ts
import { calculateFairnessScore } from '@/lib/ai/pricing';

describe('calculateFairnessScore', () => {
  it('returns high score for fair price', () => {
    const result = calculateFairnessScore({
      offerPrice: 100000,
      marketPrice: 105000,
      zoneAverage: 102000,
    });

    expect(result.score).toBeGreaterThan(0.8);
    expect(result.tier).toBe('fair');
  });

  it('returns low score for overpriced', () => {
    const result = calculateFairnessScore({
      offerPrice: 150000,
      marketPrice: 100000,
      zoneAverage: 102000,
    });

    expect(result.score).toBeLessThan(0.5);
    expect(result.tier).toBe('overpriced');
  });
});
```

### 2. Integration Tests

**Proposito**: Validar interaccion entre multiples componentes/servicios

**Herramientas**:
- Jest
- MSW (Mock Service Worker) para API mocking
- Supabase local (testing container)

**Scope**:
- API routes completas
- Hooks con React Query
- Flujos multi-componente

**Target de Cobertura**: 60%

```typescript
// tests/integration/api/offers.test.ts
import { POST } from '@/app/api/offers/route';
import { createMockRequest } from '@/tests/helpers';

describe('POST /api/offers', () => {
  it('creates offer with valid data', async () => {
    const request = createMockRequest({
      method: 'POST',
      body: {
        property_id: 'uuid-123',
        amount: 100000,
        message: 'Interested in this property',
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.id).toBeDefined();
    expect(data.status).toBe('pending');
  });
});
```

### 3. End-to-End Tests

**Proposito**: Validar flujos completos de usuario

**Herramientas**:
- Playwright

**Scope**:
- Flujos criticos de negocio
- Happy paths
- Edge cases importantes

**Target de Cobertura**: Flujos criticos 100%

```typescript
// tests/e2e/auth.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('user can login with valid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.getByTestId('email-input').fill('test@example.com');
    await page.getByTestId('password-input').fill('password123');
    await page.getByTestId('login-button').click();

    await expect(page).toHaveURL('/dashboard');
    await expect(page.getByTestId('user-menu')).toBeVisible();
  });

  test('shows error for invalid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.getByTestId('email-input').fill('wrong@example.com');
    await page.getByTestId('password-input').fill('wrongpassword');
    await page.getByTestId('login-button').click();

    await expect(page.getByText('Invalid credentials')).toBeVisible();
    await expect(page).toHaveURL('/login');
  });
});
```

### 4. Mobile Tests

**Proposito**: Validar responsive design

**Herramientas**:
- Playwright con viewports

**Scope**:
- 5 dispositivos target
- 130 validaciones por device

```typescript
// tests/mobile/responsive.spec.ts
import { test, expect, devices } from '@playwright/test';

const MOBILE_DEVICES = [
  devices['iPhone 14'],
  devices['Pixel 7'],
  devices['iPad Mini'],
  devices['Galaxy S23'],
  devices['iPhone SE'],
];

MOBILE_DEVICES.forEach((device) => {
  test.describe(`Mobile: ${device.name}`, () => {
    test.use({ ...device });

    test('sidebar is hidden by default', async ({ page }) => {
      await page.goto('/dashboard');
      await expect(page.getByTestId('sidebar-nav')).not.toBeVisible();
    });

    test('can open mobile menu', async ({ page }) => {
      await page.goto('/dashboard');
      await page.getByTestId('mobile-menu-button').click();
      await expect(page.getByTestId('sidebar-nav')).toBeVisible();
    });
  });
});
```

---

## Data-TestID Conventions

### Naming Pattern

```
[component]-[element]-[modifier]
```

### Standard TestIDs

#### Forms
```typescript
data-testid="email-input"
data-testid="password-input"
data-testid="login-button"
data-testid="register-button"
data-testid="submit-button"
data-testid="cancel-button"
```

#### Navigation
```typescript
data-testid="sidebar-nav"
data-testid="user-menu"
data-testid="mobile-menu-button"
data-testid="nav-link-[name]"
data-testid="breadcrumb"
```

#### Lists & Cards
```typescript
data-testid="property-card"
data-testid="property-list"
data-testid="offer-card"
data-testid="alert-item"
```

#### Modals & Dialogs
```typescript
data-testid="modal-[name]"
data-testid="dialog-confirm"
data-testid="dialog-cancel"
data-testid="toast-message"
```

#### Specific Components
```typescript
data-testid="copilot-alerts-badge"
data-testid="fairness-score"
data-testid="offer-tier-conservative"
data-testid="map-container"
data-testid="property-gallery"
```

---

## Test File Structure

```
tests/
├── unit/
│   ├── lib/
│   │   ├── pricing.test.ts
│   │   ├── validation.test.ts
│   │   └── formatting.test.ts
│   ├── hooks/
│   │   ├── useProperty.test.ts
│   │   └── useCopilot.test.ts
│   └── stores/
│       └── property-store.test.ts
├── integration/
│   ├── api/
│   │   ├── auth.test.ts
│   │   ├── offers.test.ts
│   │   └── properties.test.ts
│   └── flows/
│       └── offer-flow.test.ts
├── e2e/
│   ├── auth.spec.ts
│   ├── offers.spec.ts
│   ├── negotiation.spec.ts
│   └── copilot.spec.ts
├── mobile/
│   ├── responsive.spec.ts
│   └── touch.spec.ts
└── helpers/
    ├── mocks.ts
    ├── factories.ts
    └── setup.ts
```

---

## Test Commands

```bash
# Unit + Integration
pnpm test              # Run all tests
pnpm test:watch        # Watch mode
pnpm test:coverage     # With coverage report

# E2E
pnpm test:e2e          # Run all E2E tests
pnpm test:e2e:ui       # Interactive UI mode
pnpm test:e2e:debug    # Debug mode

# Mobile
pnpm test:mobile       # Run mobile tests
pnpm test:mobile:ui    # Interactive mode

# Specific file
npx playwright test tests/e2e/auth.spec.ts
npx jest tests/unit/lib/pricing.test.ts
```

---

## Test Environment Setup

### E2E Test Users

```env
# .env.local (for testing)
TEST_USER_EMAIL=test@pricewaze.local
TEST_USER_PASSWORD=TestPassword123!
```

### Database Seeding

```bash
pnpm seed          # Seed test data
pnpm seed:clear    # Clear test data
```

### Mocking External Services

```typescript
// tests/helpers/mocks.ts
import { http, HttpResponse } from 'msw';

export const handlers = [
  // Mock DeepSeek API
  http.post('https://api.deepseek.com/v1/chat/completions', () => {
    return HttpResponse.json({
      choices: [{
        message: {
          content: JSON.stringify({
            fairness_score: 0.85,
            tier: 'moderate',
          }),
        },
      }],
    });
  }),

  // Mock CrewAI
  http.post('http://localhost:8000/pricing', () => {
    return HttpResponse.json({
      analysis: { /* mock data */ },
    });
  }),
];
```

---

## Coverage Targets

| Type | Target | Minimum |
|------|--------|---------|
| Unit Tests | 80% | 70% |
| Integration | 60% | 50% |
| E2E (Critical Flows) | 100% | 90% |
| Overall | 75% | 65% |

### Critical Flows (Must be 100%)

1. User Registration
2. User Login
3. Property Search
4. Create Offer
5. Counter Offer
6. Accept/Reject Offer
7. Copilot Alert Interaction

---

## CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  unit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm test:coverage

  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: npx playwright install --with-deps
      - run: pnpm build
      - run: pnpm test:e2e

  mobile:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: npx playwright install --with-deps
      - run: pnpm build
      - run: pnpm test:mobile
```

---

## Best Practices

### DO

- Write tests before or with code (TDD/BDD)
- Use descriptive test names
- Test behavior, not implementation
- Keep tests independent
- Use factories for test data
- Mock external services
- Add data-testid for E2E selectors

### DON'T

- Test implementation details
- Share state between tests
- Use timeouts instead of proper waits
- Write flaky tests
- Skip tests permanently
- Test third-party libraries

---

## Debugging Tests

### Playwright Debug

```bash
# Run with debug
PWDEBUG=1 npx playwright test tests/e2e/auth.spec.ts

# Generate trace
npx playwright test --trace on
npx playwright show-trace trace.zip
```

### Jest Debug

```bash
# Run single test with verbose
npx jest tests/unit/lib/pricing.test.ts --verbose

# Debug in VS Code
# Add breakpoint, then run "Debug Jest Tests" launch config
```

---

*Ultima actualizacion: 2026-01-08*
