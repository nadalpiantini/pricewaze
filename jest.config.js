/**
 * Jest Configuration for PriceWaze Unit Tests
 *
 * Run: pnpm test (unit tests)
 *      pnpm test:watch (watch mode)
 *      pnpm test:coverage (with coverage report)
 */

/** @type {import('jest').Config} */
const config = {
  // Use ts-jest for TypeScript support
  preset: 'ts-jest',

  // Use jsdom for React component testing
  testEnvironment: 'jest-environment-jsdom',

  // Setup files to run before each test
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],

  // Test file patterns - only unit tests in tests/unit/
  testMatch: [
    '<rootDir>/tests/unit/**/*.test.ts',
    '<rootDir>/tests/unit/**/*.test.tsx',
  ],

  // Module path aliases matching tsconfig
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },

  // Transform TypeScript files
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      useESM: true,
      tsconfig: {
        jsx: 'react-jsx',
        module: 'ESNext',
        moduleResolution: 'bundler',
        esModuleInterop: true,
        strict: true,
        skipLibCheck: true,
        target: 'ES2022',
        lib: ['ES2022', 'DOM', 'DOM.Iterable'],
        baseUrl: '.',
        paths: {
          '@/*': ['src/*'],
        },
      },
    }],
  },

  // Files to ignore
  testPathIgnorePatterns: [
    '/node_modules/',
    '/tests/e2e/',
    '/tests/mobile/',
  ],

  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],

  // Coverage configuration
  collectCoverageFrom: [
    'src/lib/**/*.{ts,tsx}',
    'src/components/**/*.{ts,tsx}',
    'src/hooks/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
  ],

  // Coverage thresholds (start low, increase over time)
  coverageThreshold: {
    global: {
      branches: 10,
      functions: 10,
      lines: 10,
      statements: 10,
    },
  },

  // Verbose output
  verbose: true,

  // Clear mocks between tests
  clearMocks: true,

  // Detect open handles
  detectOpenHandles: true,
};

module.exports = config;
