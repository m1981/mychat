/**
 * Vite Configuration
 * Responsibilities:
 * - Build configuration and optimization
 * - Development server setup
 * - Plugin management
 * - Asset bundling and chunking
 * - Path aliases (must match tsconfig.json paths)
 * 
 * Contracts:
 * - Must maintain path aliases in sync with tsconfig.json
 * - Must not override test configurations (handled by vitest.config.ts)
 * - Must maintain manual chunks for optimal code splitting
 * - Must provide all necessary build optimizations
 * - Must handle WASM and top-level await support
 */
import react from '@vitejs/plugin-react-swc';
import { defineConfig, loadEnv } from 'vite';
import topLevelAwait from 'vite-plugin-top-level-await';
import wasm from 'vite-plugin-wasm';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const isProduction = mode === 'production';

  return {
    plugins: [
      react({
        // Enable Fast Refresh
        fastRefresh: true
      }),
      wasm(),
      topLevelAwait()
    ],

    define: {
      'process.env': {},
      'process.platform': JSON.stringify(process.platform),
      'process.version': JSON.stringify(process.version),
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
      'global': 'globalThis',
      'globalThis': 'globalThis',
      '__dirname': JSON.stringify(''),
    },

    build: {
      sourcemap: true,
      target: 'esnext',
      minify: 'esbuild',
      commonjsOptions: {
        include: [/node_modules/],
        transformMixedEsModules: true,
        requireReturnsDefault: 'auto',
        esmExternals: true
      },
      rollupOptions: {
        external: ['fsevents'],
        output: {
          format: 'es',
          manualChunks: {
            'core-vendor': ['react', 'react-dom', 'zustand'],
            'markdown-core': ['react-markdown', 'remark-gfm', 'remark-math'],
            'markdown-plugins': ['rehype-highlight', 'rehype-katex'],
            'mermaid': ['mermaid'],
            'ui-utils': ['react-hot-toast', 'html2canvas', 'jspdf'],
            'i18n': ['i18next', 'react-i18next', 'i18next-browser-languagedetector'],
            'data-utils': ['lodash', 'uuid', 'lz-string', 'papaparse']
          }
        }
      },
      // Additional production optimizations
      reportCompressedSize: isProduction ? false : true,
      chunkSizeWarningLimit: 1000
    },

    server: {
      proxy: {
        '/api': {
          target: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
          changeOrigin: true,
          secure: false,
          ws: true
        }
      },
      hmr: {
        overlay: true
      },
      host: true,
      port: 5173,
      watch: {
        usePolling: false,
        ignored: ['**/node_modules/**', '**/dist/**']
      }
    },

    resolve: {
      alias: {
        '@icon': path.resolve(__dirname, './src/assets/icons'),
        '@type': path.resolve(__dirname, './src/types'),
        '@store': path.resolve(__dirname, './src/store'),
        '@hooks': path.resolve(__dirname, './src/hooks'),
        '@constants': path.resolve(__dirname, './src/constants'),
        '@config': path.resolve(__dirname, './src/config'),
        '@api': path.resolve(__dirname, './src/api'),
        '@components': path.resolve(__dirname, './src/components'),
        '@models': path.resolve(__dirname, './src/config/models'),
        '@utils': path.resolve(__dirname, './src/utils'),
        '@lib': path.resolve(__dirname, './src/lib'),
        '@src': path.resolve(__dirname, './src')
      }
    },

    base: '/',

    // Add preview configuration for production testing
    preview: {
      port: 4173,
      host: true,
      strictPort: true,
    },

    test: {
      globals: true,
      environment: 'jsdom',
      poolOptions: {
        threads: {
          singleThread: true,
        }
      },
      // Adjust memory usage
      pool: 'threads',
      isolate: false,
      deps: {
        inline: [/@testing-library\//, /vitest/]
      },
      setupFiles: ['./vitest.setup.ts']
    },

    // Optimize dependencies
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'zustand',
        'react-markdown',
        'mermaid'
      ],
      exclude: ['@swc/core'],
      esbuildOptions: {
        target: 'esnext',
        platform: 'browser',
        supported: {
          'dynamic-import': true,
          'import-meta': true
        },
        define: {
          global: 'globalThis'
        }
      }
    },

    esbuild: {
      supported: {
        'dynamic-import': true,
        'import-meta': true
      }
    },

    css: {
      devSourcemap: true
    }
  };
});