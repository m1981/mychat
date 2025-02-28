import { register } from 'tsconfig-paths';
import { resolve } from 'path';

register({
  baseUrl: resolve(__dirname, '..'),
  paths: {
    '@src/*': ['src/*'],
    '@type/*': ['src/types/*'],
    '@lib/*': ['src/lib/*']
  }
});