/**
 * Vite Production Configuration
 * Responsibilities:
 * - Build configuration and optimization
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
import { defineConfig } from 'vite';
import topLevelAwait from 'vite-plugin-top-level-await';
import wasm from 'vite-plugin-wasm';
import path from 'path';

export default defineConfig({
  cacheDir: '.vite-cache',
  plugins: [
    react(),
    wasm(),
    topLevelAwait()
  ],
  define: {
    'process.cwd': 'function() { return "/" }',
    'process.env': JSON.stringify(process.env)
  },
  optimizeDeps: {
    include: ['mermaid'],
    esbuildOptions: {
      target: 'esnext',
      platform: 'browser',
      supported: {
        'dynamic-import': true
      }
    }
  },
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'core-vendor': ['react', 'react-dom', 'zustand'],
          'markdown-core': [
            'react-markdown',
            'remark-gfm',
            'remark-math'
          ],
          'markdown-plugins': [
            'rehype-highlight',
            'rehype-katex'
          ],
          'mermaid': ['mermaid'],
          'ui-utils': [
            'react-hot-toast',
            'html2canvas',
            'jspdf'
          ],
          'i18n': [
            'i18next',
            'react-i18next',
            'i18next-browser-languagedetector',
            'i18next-http-backend'
          ],
          'data-utils': [
            'lodash',
            'uuid',
            'lz-string',
            'papaparse'
          ]
        }
      }
    },
    chunkSizeWarningLimit: 1600,
    target: 'esnext',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false,
        drop_debugger: false
      }
    },
    reportCompressedSize: false,
    cssCodeSplit: true
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
  preview: {
    port: 4173,
    host: true,
    strictPort: true,
  }
});