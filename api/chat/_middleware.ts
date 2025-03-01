import { register } from 'tsconfig-paths';
import { getRootPath } from '../../src/lib/paths';

console.log('=== MIDDLEWARE DEBUG ===');
console.log('Current working directory:', process.cwd());
console.log('__dirname:', __dirname);
console.log('Module paths:', module.paths);

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
