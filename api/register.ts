import { register } from 'tsconfig-paths';
import { resolve } from 'path';

// Register path aliases for server-side code
register({
  baseUrl: resolve(__dirname, '..'),
  paths: {
    '@src/*': ['src/*'],
    '@type/*': ['src/types/*'],
    '@lib/*': ['src/lib/*']
  }
});