import type { Config } from '@jest/types'; // v29.6.4

/**
 * Jest configuration for GameDay Platform backend services
 * Configures test environment, coverage requirements, TypeScript compilation,
 * and module resolution for comprehensive testing of all backend services.
 * 
 * @returns {Config.InitialOptions} Complete Jest configuration object
 */
export default async (): Promise<Config.InitialOptions> => {
  const config: Config.InitialOptions = {
    // Use ts-jest preset for TypeScript support
    preset: 'ts-jest',

    // Configure Node.js test environment
    testEnvironment: 'node',

    // Define test file locations
    roots: [
      '<rootDir>/src',
      '<rootDir>/tests'
    ],

    // Test file patterns
    testMatch: [
      '**/__tests__/**/*.+(ts|tsx)',
      '**/?(*.)+(spec|test).+(ts|tsx)'
    ],

    // TypeScript transformation
    transform: {
      '^.+\\.(ts|tsx)$': 'ts-jest'
    },

    // Module path aliases for clean imports
    moduleNameMapper: {
      '@/(.*)': '<rootDir>/src/$1',
      '@shared/(.*)': '<rootDir>/src/shared/$1',
      '@exercise/(.*)': '<rootDir>/src/exercise-service/$1',
      '@notification/(.*)': '<rootDir>/src/notification-service/$1'
    },

    // Coverage configuration
    collectCoverage: true,
    coverageDirectory: 'coverage',
    coverageThreshold: {
      global: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80
      }
    },
    collectCoverageFrom: [
      'src/**/*.{ts,tsx}',
      '!src/**/*.d.ts',
      '!src/**/*.interface.ts',
      '!src/**/index.ts',
      '!src/**/*.mock.ts'
    ],

    // Test setup and execution configuration
    setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
    verbose: true,
    testTimeout: 30000,
    maxWorkers: '50%',

    // Module resolution settings
    moduleFileExtensions: [
      'ts',
      'tsx',
      'js',
      'jsx',
      'json',
      'node'
    ],

    // Global settings
    globals: {
      'ts-jest': {
        tsconfig: '<rootDir>/tsconfig.json',
        diagnostics: {
          warnOnly: true
        }
      }
    },

    // Reporter configuration
    reporters: [
      'default',
      [
        'jest-junit',
        {
          outputDirectory: 'coverage',
          outputName: 'junit.xml',
          classNameTemplate: '{classname}',
          titleTemplate: '{title}',
          ancestorSeparator: ' › ',
          usePathForSuiteName: true
        }
      ]
    ],

    // Clear mocks between tests
    clearMocks: true,
    restoreMocks: true,

    // Fail tests on console errors/warnings
    errorOnDeprecated: true
  };

  return config;
};