import type { JestConfigWithTsJest } from 'ts-jest';

/**
 * Jest configuration for GameDay Platform web application
 * Version: 29.1.1
 * 
 * This configuration sets up the testing environment with:
 * - TypeScript support via ts-jest
 * - JSDOM for browser environment simulation
 * - Path aliases matching tsconfig.json
 * - Coverage thresholds of 80% across all metrics
 * - Parallel test execution support
 */
const jestConfig: JestConfigWithTsJest = {
  // Use ts-jest for TypeScript compilation
  preset: 'ts-jest',

  // Set up browser-like test environment
  testEnvironment: 'jsdom',

  // Configure module path aliases to match tsconfig.json
  moduleNameMapper: {
    '@/(.*)': '<rootDir>/src/$1',
    '@components/(.*)': '<rootDir>/src/components/$1',
    '@services/(.*)': '<rootDir>/src/services/$1',
    '@utils/(.*)': '<rootDir>/src/utils/$1',
    '@hooks/(.*)': '<rootDir>/src/hooks/$1',
    '@store/(.*)': '<rootDir>/src/store/$1',
    '@assets/(.*)': '<rootDir>/src/assets/$1',
  },

  // Test setup files
  setupFilesAfterEnv: [
    '<rootDir>/src/setupTests.ts'
  ],

  // Test file patterns
  testMatch: [
    '<rootDir>/tests/**/*.test.{ts,tsx}'
  ],

  // Coverage configuration
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/vite-env.d.ts',
    '!src/main.tsx',
    '!src/assets/**'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },

  // Performance and execution settings
  testTimeout: 10000,
  verbose: true,

  // Transform configuration for TypeScript
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.json'
      }
    ]
  },

  // Module file extensions
  moduleFileExtensions: [
    'ts',
    'tsx',
    'js',
    'jsx',
    'json',
    'node'
  ],

  // Test environment configuration
  globals: {
    'ts-jest': {
      isolatedModules: true
    }
  },

  // Reporter configuration
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: 'coverage/junit',
        outputName: 'junit.xml',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}',
        ancestorSeparator: ' › ',
        usePathForSuiteName: true
      }
    ]
  ]
};

export default jestConfig;