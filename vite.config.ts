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
import { defineConfig } from 'vite';
import topLevelAwait from 'vite-plugin-top-level-await';
import wasm from 'vite-plugin-wasm';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    wasm(),
    topLevelAwait()
  ],
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          // Core vendor chunks
          'core-vendor': ['react', 'react-dom', 'zustand'],

          // Markdown processing
          'markdown-core': [
            'react-markdown',
            'remark-gfm',
            'remark-math'
          ],
          'markdown-plugins': [
            'rehype-highlight',
            'rehype-katex'
          ],

          // Mermaid - simplified chunking
          'mermaid': ['mermaid'],

          // UI and functionality
          'ui-utils': [
            'react-hot-toast',
            'html2canvas',
            'jspdf'
          ],

          // i18n
          'i18n': [
            'i18next',
            'react-i18next',
            'i18next-browser-languagedetector',
            'i18next-http-backend'
          ],

          // Data handling
          'data-utils': [
            'lodash',
            'uuid',
            'lz-string',
            'papaparse'
          ],
          'testing-utils': [
            '@testing-library/react',
            '@testing-library/user-event',
            '@testing-library/jest-dom'
          ],
          'state-management': ['zustand', '@store'],
          'api-layer': ['@api', '@models']
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

    // Improve build performance
    reportCompressedSize: false,
    cssCodeSplit: true
  },

  optimizeDeps: {
    include: ['mermaid'],
    esbuildOptions: {
      target: 'esnext'
    }
  },
  server: {
    proxy: {
      '/api': {
        target: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
    },
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
  }
});
