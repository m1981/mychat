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
        // Global thresholds
        branches: 62,
        functions: 37,

        // File-specific thresholds
        'src/handlers/ChatStreamHandler.ts': {
          statements: 2,
        },
        'src/hooks/useStreamHandler.ts': {
          statements: 23,
        },
        'src/hooks/useSubmit.ts': {
          statements: 10,
        },
        'src/hooks/useTitleGeneration.ts': {
          statements: 12,
        },
        'src/services/TitleGenerator.ts': {
          statements: 8,
        },
        'src/services/SubmissionService.ts': {
          statements: 7,
        },
        'src/services/StorageService.ts': {
          statements: 7,
        },
        'src/store/request-slice.ts': {
          statements: 22,
        },
        'src/hooks/useMessageManager.ts': {
          statements: 6,
        },
        'src/hooks/useAddChat.ts': {
          statements: 17,
        },
        'src/store/chat-slice.ts': {
          statements: 32,
        },
        'src/store/config-slice.ts': {
          statements: 32,
        },
        'src/components/Chat/ChatContent/Message/ViewMode/ContentView.tsx': {
          statements: 88,
        },
        'src/components/Chat/ChatContent/Message/context/MessageEditorContext.tsx': {
          statements: 96,
        },
        'src/components/Chat/ChatContent/Message/EditMode/EditView.tsx': {
          statements: 87,
        },
        'src/components/Menu/NewChat.tsx': {
          statements: 87,
        },
        'src/api/base.ts': {
          statements: 93,
        },
        'src/config/models/model.registry.ts': {
          statements: 79,
        },
        'src/config/providers/provider.registry.ts': {
          statements: 97,
        },
        'src/hooks/useFileDropHandler.ts': {
          statements: 100,
        },
        'src/hooks/useMessageEditor.ts': {
          statements: 91,
        },
        'src/hooks/usePasteHandler.ts': {
          statements: 100,
        },
        'src/hooks/useTextSelection.ts': {
          statements: 88,
        },
      }
    },
    deps: {
      optimizer: {
        web: {
          include: ['@testing-library/jest-dom', '@testing-library/react']
        }
      }
    },
    testTimeout: 10000,
    hookTimeout: 10000,
    pool: 'vmThreads',
    poolOptions: {
      vmThreads: {
        useAtomics: true,
      }
    },
    typecheck: {
      enabled: false, // Enable only in CI
    },
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    retry: 0,
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
    }
  },
  cacheDir: '.vite/vitest',
  resolve: {
    alias: {
      '@src': path.resolve(__dirname, './src'),
      '@icon': path.resolve(__dirname, './src/assets/icons'),
      '@type': path.resolve(__dirname, './src/types'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@store': path.resolve(__dirname, './src/store'),
      '@config': path.resolve(__dirname, './src/config'),
      '@constants': path.resolve(__dirname, './src/constants'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@models': path.resolve(__dirname, './src/config/models'),
      '@api': path.resolve(__dirname, './src/api'),
      '@components': path.resolve(__dirname, './src/components'),
    },
  },
});
