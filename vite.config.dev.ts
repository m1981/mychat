import react from '@vitejs/plugin-react-swc';
import { defineConfig } from 'vite';
import type { UserConfig } from 'vite';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';

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
    exclude: ['@webassembly/*']
  }
};

// Development-specific configurations
const devConfig: UserConfig = {
  server: {
    hmr: { timeout: 1000 },
    watch: { usePolling: false },
    host: 'localhost',
    proxy: {
      '/api': {
        target: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
    },
  }
};

export default defineConfig(({ command }) => {
  if (command === 'serve') {
    console.log('🚀 Running development config');
    return { ...baseConfig, ...devConfig };
  }
  throw new Error('This config is for development only');
});