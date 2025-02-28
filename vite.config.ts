import react from '@vitejs/plugin-react-swc';
import { defineConfig } from 'vite';
import topLevelAwait from 'vite-plugin-top-level-await';
import wasm from 'vite-plugin-wasm';

// https://vitejs.dev/config/
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

          // Mermaid chunks
          'mermaid-core': ['mermaid/dist/mermaid-core'],
          'mermaid-diagrams': [
            'mermaid/dist/diagrams/flowchart/flowDb',
            'mermaid/dist/diagrams/sequence/sequenceDb',
            'mermaid/dist/diagrams/gantt/ganttDb',
            'mermaid/dist/diagrams/class/classDb'
          ],

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

          // AI/API related
          'ai-sdk': [
            '@anthropic-ai/sdk',
            'openai'
          ]
        }
      }
    },
    chunkSizeWarningLimit: 1600,

    // Additional build optimizations
    target: 'esnext',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
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
      '@icon/': new URL('./src/assets/icons/', import.meta.url).pathname,
      '@type/': new URL('./src/types/', import.meta.url).pathname,
      '@store/': new URL('./src/store/', import.meta.url).pathname,
      '@hooks/': new URL('./src/hooks/', import.meta.url).pathname,
      '@constants/': new URL('./src/constants/', import.meta.url).pathname,
      '@api/': new URL('./src/api/', import.meta.url).pathname,
      '@components/': new URL('./src/components/', import.meta.url).pathname,
      '@models/': new URL('.src/config/models/', import.meta.url).pathname,
      '@utils/': new URL('./src/utils/', import.meta.url).pathname,
      '@src/': new URL('./src/', import.meta.url).pathname,
      '@config/': new URL('./src/config/', import.meta.url).pathname,
    },
  },

  // Performance optimizations
  esbuild: {
    logOverride: { 'this-is-undefined-in-esm': 'silent' }
  },

  base: '/',

  // Add preview configuration for production testing
  preview: {
    port: 4173,
    host: true,
    strictPort: true,
  }
});
