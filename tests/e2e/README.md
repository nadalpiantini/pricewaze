# E2E Tests Documentation

## Overview

End-to-end tests for PriceWaze using Playwright. Tests cover critical user flows including authentication, property signals, routes, and integration scenarios.

## Test Status

- **Active Tests**: 2/18 (11%)
  - ✅ Login with valid credentials
  - ✅ Error with invalid credentials

- **Skipped Tests**: 16/18 (89%)
  - All skipped tests include detailed documentation explaining why they're skipped and how to enable them

## Running Tests

```bash
# Run all active tests
npx playwright test

# Run specific test file
npx playwright test tests/e2e/auth.spec.ts

# Run with UI (headed mode)
npx playwright test --headed

# List all tests (including skipped)
npx playwright test --list
```

## Test Structure

### Auth Tests (`auth.spec.ts`)
- Login/logout flows
- User registration
- Redirect behavior

### Signals Tests (`signals.spec.ts`)
- Signal reporting after verified visits
- Signal confirmation (3+ users)
- Signal decay over time
- Map display with signal colors

### Routes Tests (`routes.spec.ts`)
- Route creation and management
- Route optimization
- Drag & drop reordering
- External navigation (Waze/Google Maps)
- Route export and sharing

### Integration Tests (`integration.spec.ts`)
- Complete user flows
- Registration to property search
- Search to route creation
- Property search to signal reporting

## Prerequisites

Most tests require:
- Test users (run `pnpm seed` or create manually)
- Properties in database
- Verified visits for signal reporting

## Enabling Skipped Tests

Each skipped test includes:
1. **Reason**: Why it's skipped
2. **Failure conditions**: What causes failures
3. **Steps to enable**: How to make it work
4. **Requirements**: Data/config needed

See individual test files for detailed documentation.

## Helpers

### `helpers/auth.ts`
- `loginTestUser()` - Login helper with redirect support
- `logout()` - Logout helper
- `createTestUser()` - Create test user helper

## Notes

- Tests use `data-testid` attributes for reliable element selection
- Some tests require seed data (`pnpm seed`)
- External APIs (OSRM, Waze, Google Maps) may need mocking
- Web Share API not available in test environment
