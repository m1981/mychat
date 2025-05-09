import react from '@vitejs/plugin-react-swc';
import { defineConfig } from 'vite';
import type { UserConfig } from 'vite';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';
import fs from 'fs';

// Shared base configuration
const baseConfig: UserConfig = {
  plugins: [
    react(),
    wasm(),
    topLevelAwait()
  ],
  resolve: {
    alias: {
      '@icon/': new URL('./src/assets/icons/', import.meta.url).pathname,
      '@config/': new URL('./src/config/', import.meta.url).pathname,
      '@type/': new URL('./src/types/', import.meta.url).pathname,
      '@store/': new URL('./src/store/', import.meta.url).pathname,
      '@hooks/': new URL('./src/hooks/', import.meta.url).pathname,
      '@constants/': new URL('./src/constants/', import.meta.url).pathname,
      '@api/': new URL('./src/api/', import.meta.url).pathname,
      '@components/': new URL('./src/components/', import.meta.url).pathname,
      '@utils/': new URL('./src/utils/', import.meta.url).pathname,
      '@src/': new URL('./src/', import.meta.url).pathname,
    }
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

// Development-specific configurations
const devConfig: UserConfig = {
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
  build: {
    sourcemap: true,
    minify: false
  },
  logLevel: 'info'
};

export default defineConfig(({ command, mode }) => {
  if (command === 'serve') {
    console.log('🚀 Running development config with mode:', mode);
    console.log('📁 Current working directory:', process.cwd());
    console.log('📦 Node modules exists:', fs.existsSync('/app/node_modules'));
    return { ...baseConfig, ...devConfig };
  }
  throw new Error('This config is for development only');
});