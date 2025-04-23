import react from '@vitejs/plugin-react-swc';
import { defineConfig } from 'vite';
import type { UserConfig } from 'vite';

// Shared base configuration
const baseConfig: UserConfig = {
  plugins: [react()],
  resolve: {
    alias: {
      '@': '/src',
      '@components': '/src/components',
    }
  }
};

// Environment-specific configurations
const devConfig: UserConfig = {
  server: {
    hmr: { timeout: 1000 },
    watch: { usePolling: false },
    host: 'localhost',
  },
  build: {
    minify: false,
    sourcemap: true,
    rollupOptions: { output: { manualChunks: undefined } },
    cssCodeSplit: false
  }
};

const prodConfig: UserConfig = {
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'core-vendor': ['react', 'react-dom'],
          'ui-utils': ['react-hot-toast'],
          'data-utils': ['lodash', 'uuid']
        }
      }
    },
    minify: 'terser',
    cssCodeSplit: true
  }
};

export default defineConfig(({ command, mode }) => {
  if (command === 'serve') {
    console.log('🚀 Running development config');
    return { ...baseConfig, ...devConfig };
  } else {
    console.log('📦 Running production config');
    return { ...baseConfig, ...prodConfig };
  }
});