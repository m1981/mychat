import { register } from 'tsconfig-paths';

// Register path aliases
register({
  baseUrl: process.cwd(),
  paths: {
    "@src/*": ["src/*"],
    "@lib/*": ["src/lib/*"],
    "@type/*": ["src/types/*"],
    "@constants/*": ["src/constants/*"],
    "@utils/*": ["src/utils/*"],
    "@config/*": ["src/config/*"]
  }
});

export { default } from './anthropic';
