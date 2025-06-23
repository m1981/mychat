import fs from 'fs';
import path from 'path';

import react from '@vitejs/plugin-react-swc';
import { defineConfig } from 'vite';
import type { UserConfig } from 'vite';
import topLevelAwait from 'vite-plugin-top-level-await';
import wasm from 'vite-plugin-wasm';


// Shared aliases for all configurations
const sharedAliases = {
  '@icon': path.resolve(__dirname, './src/assets/icons'),
  '@config': path.resolve(__dirname, './src/config'),
  '@type': path.resolve(__dirname, './src/types'),
  '@contexts': path.resolve(__dirname, './src/contexts'),
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
    build: {
      sourcemap: true,
    },
    server: {
      sourcemapIgnoreList: false,

      hmr: {
        protocol: 'ws',
        host: 'localhost',
        port: 5173,
        clientPort: 5173,
        overlay: true,
        path: 'hmr'
      },
      watch: {
        usePolling: false,  // Change to false for better performance
        interval: 100,
        ignored: ['**/node_modules/**', '**/.git/**']  // Explicitly ignore large directories
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
      },
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:3000',
          changeOrigin: true,
          secure: false,
          ws: true,
          configure: (proxy) => {
            // Increase timeouts
            proxy.options.proxyTimeout = 120000; // 2 minutes
            proxy.options.timeout = 120000;
            
            // Disable connection pooling to prevent socket reuse issues
            proxy.options.agent = false;
            
            // Handle proxy errors
            proxy.on('error', (err, req, res) => {
              console.log('Proxy error:', err);
              if (!res.headersSent) {
                res.writeHead(500, {
                  'Content-Type': 'application/json'
                });
              }
              res.end(JSON.stringify({ error: 'Proxy error', details: err.message }));
            });
          }
        }
      }
    },
    optimizeDeps: {
      exclude: ['@webassembly/*']
    },
    logLevel: 'warn', // Reduce console noise
    customLogger: {
      info: (msg) => {
        // Filter out some of the verbose HMR messages
        if (!msg.includes('hmr update') && !msg.includes('page reload')) {
          console.log(msg);
        }
      },
      warn: console.warn,
      warnOnce: console.warn,
      error: console.error,
      clearScreen: () => {},
      hasErrorLogged: () => false,
      hasWarned: false
    }
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