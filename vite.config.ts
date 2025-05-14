import fs from 'fs';
import path from 'path';

import react from '@vitejs/plugin-react-swc';
import { defineConfig } from 'vite';
import type { UserConfig } from 'vite';
import checker from 'vite-plugin-checker';
import topLevelAwait from 'vite-plugin-top-level-await';
import wasm from 'vite-plugin-wasm';


// Shared aliases for all configurations
const sharedAliases = {
  '@icon': path.resolve(__dirname, './src/assets/icons'),
  '@config': path.resolve(__dirname, './src/config'),
  '@type': path.resolve(__dirname, './src/types'),
  '@store': path.resolve(__dirname, './src/store'),
  '@hooks': path.resolve(__dirname, './src/hooks'),
  '@constants': path.resolve(__dirname, './src/constants'),
  '@api': path.resolve(__dirname, './src/api'),
  '@components': path.resolve(__dirname, './src/components'),
  '@utils': path.resolve(__dirname, './src/utils'),
  '@models': path.resolve(__dirname, './src/config/models'),
  '@lib': path.resolve(__dirname, './src/lib'),
  '@src': path.resolve(__dirname, './src')
};

// Shared base configuration
function createBaseConfig(): UserConfig {
  return {
    plugins: [
      react(),
      wasm(),
      topLevelAwait(),
      // Add TypeScript checking during development
      checker({
        typescript: true,
        eslint: {
          lintCommand: 'eslint "./src/**/*.{ts,tsx}"',
        },
      }),
    ],
    resolve: {
      alias: sharedAliases
    },
    optimizeDeps: {
      exclude: ['@webassembly/*'],
      force: true
    },
    define: {
      'process.cwd': 'function() { return "/" }',
      'process.env': JSON.stringify({
        ...process.env,
        npm_package_version: process.env.npm_package_version || '1.0.4'
      })
    }
  };
}

// Development-specific configurations
function createDevConfig(): UserConfig {
  return {
    server: {
      hmr: {
        timeout: 1000,
        protocol: 'ws',
        host: 'localhost',
        port: 5173,
        clientPort: 5173,
        overlay: true,
        path: 'hmr'
      },
      watch: {
        usePolling: true,
        interval: 100
      },
      host: '0.0.0.0',
      port: 5173,
      strictPort: true,
      cors: true,
      headers: {
        'Access-Control-Allow-Origin': '*'
      },
      fs: {
        strict: false,
        allow: ['/app']
      }
    },
    optimizeDeps: {
      exclude: ['@webassembly/*']
    },
    logLevel: 'info'
  };
}

// Production-specific configurations
function createProdConfig(): UserConfig {
  return {
    plugins: [],
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
      rollupOptions: {
        output: {
          sourcemapExcludeSources: false,
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
      sourcemap: true,
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
    }
  };
}

export default defineConfig(({ command, mode }) => {
  if (command === 'serve') {
    console.log('🚀 Running development config with mode:', mode);
    console.log('📁 Current working directory:', process.cwd());
    console.log('📦 Node modules exists:', fs.existsSync('/app/node_modules'));
    return { ...createBaseConfig(), ...createDevConfig() };
  } else if (command === 'build') {
    console.log('📦 Building production bundle with mode:', mode);
    return { ...createBaseConfig(), ...createProdConfig() };
  }
  throw new Error('Unknown command');
});