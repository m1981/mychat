import { register } from 'tsconfig-paths';
import { getRootPath } from '../../src/lib/paths';

const baseUrl = getRootPath();

register({
  baseUrl,
  paths: {
    '@lib/*': [`${baseUrl}/src/lib/*`],
    '@src/*': [`${baseUrl}/src/*`],
    '@api/*': [`${baseUrl}/src/api/*`],
    '@utils/*': [`${baseUrl}/src/utils/*`],
  }
});

export { default } from './anthropic';
