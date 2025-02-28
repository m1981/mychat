// vitest.config.ts
import path from 'path';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@type': path.resolve(__dirname, './src/types'),
      '@config': path.resolve(__dirname, './src/config'),
      '@models': path.resolve(__dirname, './src/config/models'),
    },
  },
});
