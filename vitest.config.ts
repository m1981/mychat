/**
 * Vitest Test Configuration
 * Responsibilities:
 * - Test environment setup
 * - Coverage configuration
 * - Test timeouts and retries
 * - Test-specific path aliases
 * 
 * Contracts:
 * - Must extend/inherit path aliases from vite.config.ts
 * - Must maintain coverage thresholds
 * - Must not conflict with Jest DOM matchers
 * - Must handle all test-specific environment needs
 * - Must maintain isolation between tests
 */
import path from 'path';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,

    setupFiles: ['./vitest.setup.ts'],
    typecheck: {
      enabled: true,
      tsconfig: './tsconfig.test.json'
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.d.ts',
        '**/*.test.ts',
        '**/*.config.ts',
        'coverage/**',
        '**/*.stories.*',
        '**/*.constant.*',
        '**/index.*'
      ],
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80
      }
    },
    deps: {
      inline: [
        '@testing-library/jest-dom',
        '@testing-library/react'
      ]
    },
    testTimeout: 10000,
    hookTimeout: 10000,
    pool: 'forks',
    poolOptions: {
      threads: {
        singleThread: true
      }
    },
    retry: 2,
    isolate: true,
    watch: {
      ignored: [
        '**/node_modules/**',
        '**/dist/**',
        '**/.git/**',
        '**/coverage/**'
      ]
    },
    snapshotFormat: {
      printBasicPrototype: false,
      escapeString: false
    },
    env: {
      NODE_ENV: 'test',
      VITE_TEST_MODE: 'true'
    }
  },
  resolve: {
    alias: {
      '@src': path.resolve(__dirname, './src'),
      '@type': path.resolve(__dirname, './src/types'),
      '@store': path.resolve(__dirname, './src/store'),
      '@config': path.resolve(__dirname, './src/config'),
      '@constants': path.resolve(__dirname, './src/constants'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@models': path.resolve(__dirname, './src/config/models'),
    },
  },
});
