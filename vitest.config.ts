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
import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

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
        '**/*.config.ts',
        'coverage/**',
        '**/*.stories.*',
        '**/*.constant.*',
        '**/index.*'
      ],
      thresholds: {
        // Global thresholds
        branches: 64,
        functions: 44,

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
          statements: 11,
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
        // Add thresholds for API handlers
        'api/chat/anthropic.ts': {
          statements: 79,
          branches: 54,
        },
        'api/chat/openai.ts': {
          statements: 80,
          branches: 75,
          functions: 80,
          lines: 80
        }
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
    // Update include pattern to find tests in both src/ and api/ directories
    include: [
      'src/**/*.{test,spec}.{ts,tsx}',
      'api/**/*.{test,spec}.{ts,tsx}'
    ],
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
      '@src': resolve(__dirname, './src'),
      '@icon': resolve(__dirname, './src/assets/icons'),
      '@type': resolve(__dirname, './src/types'),
      '@contexts': resolve(__dirname, './src/contexts'),
      '@capabilities': resolve(__dirname, './src/capabilities'),
      '@hooks': resolve(__dirname, './src/hooks'),
      '@store': resolve(__dirname, './src/store'),
      '@config': resolve(__dirname, './src/config'),
      '@constants': resolve(__dirname, './src/constants'),
      '@utils': resolve(__dirname, './src/utils'),
      '@models': resolve(__dirname, './src/config/models'),
      '@api': resolve(__dirname, './src/api'),
      '@components': resolve(__dirname, './src/components'),
    },
  },
});
