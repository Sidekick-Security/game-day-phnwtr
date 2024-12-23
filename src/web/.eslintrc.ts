// ESLint configuration for GameDay Platform web application
// Dependencies:
// eslint: ^8.0.0
// @typescript-eslint/parser: ^6.0.0
// @typescript-eslint/eslint-plugin: ^6.0.0
// eslint-plugin-react: ^7.33.0
// eslint-plugin-react-hooks: ^4.6.0
// eslint-config-prettier: ^9.0.0

import type { Linter } from 'eslint';

const eslintConfig: Linter.Config = {
  root: true,
  
  // Use TypeScript parser with full type information
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: './tsconfig.json',
    ecmaVersion: 2022,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
    tsconfigRootDir: '.',
  },

  // Environment configuration
  env: {
    browser: true,
    es2022: true,
    node: true,
    jest: true,
  },

  // Extended configurations
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'prettier', // Must be last to properly override other configs
  ],

  // Required plugins
  plugins: ['@typescript-eslint', 'react', 'react-hooks'],

  // Custom rule configurations
  rules: {
    // TypeScript-specific rules
    '@typescript-eslint/explicit-function-return-type': 'error',
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unused-vars': ['error', { 
      argsIgnorePattern: '^_',
    }],
    '@typescript-eslint/strict-boolean-expressions': 'error',
    '@typescript-eslint/no-floating-promises': 'error',
    '@typescript-eslint/await-thenable': 'error',
    '@typescript-eslint/no-misused-promises': 'error',
    '@typescript-eslint/no-non-null-assertion': 'error',
    '@typescript-eslint/explicit-member-accessibility': ['error', {
      accessibility: 'explicit',
      overrides: {
        constructors: 'no-public',
      },
    }],
    '@typescript-eslint/consistent-type-imports': ['error', {
      prefer: 'type-imports',
    }],

    // React-specific rules
    'react/react-in-jsx-scope': 'off', // Not needed in React 17+
    'react/prop-types': 'off', // Using TypeScript for prop validation
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
    'react/jsx-no-target-blank': ['error', {
      allowReferrer: false,
      enforceDynamicLinks: 'always',
    }],
    'react/jsx-key': ['error', {
      checkFragmentShorthand: true,
      checkKeyMustBeforeSpread: true,
    }],

    // General JavaScript/ES6+ rules
    'no-console': ['warn', {
      allow: ['warn', 'error'],
    }],
    'no-debugger': 'error',
    'eqeqeq': 'error',
    'no-eval': 'error',
    'no-var': 'error',
    'prefer-const': 'error',
    'prefer-arrow-callback': 'error',
    'no-throw-literal': 'error',
    'prefer-promise-reject-errors': 'error',
    'no-return-await': 'error',
    'require-atomic-updates': 'error',
    
    // Security rules
    'no-implied-eval': 'error',
    'no-new-func': 'error',
    'no-script-url': 'error',
    'no-param-reassign': 'error',
  },

  // React version configuration
  settings: {
    react: {
      version: 'detect',
    },
  },

  // Ignore patterns
  ignorePatterns: [
    'build/',
    'dist/',
    'coverage/',
    'node_modules/',
    '*.config.js',
    '*.config.ts',
  ],
};

export default eslintConfig;