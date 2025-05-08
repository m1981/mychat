#!/usr/bin/env node
import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Get current file path and directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read package.json
const pkg = JSON.parse(readFileSync(resolve(__dirname, '../package.json'), 'utf8'));

// Get release version from package.json
const release = `v${pkg.version}`;

console.log(`Uploading source maps for release: ${release}`);

try {
  // Run Sentry CLI to upload source maps
  execSync(`npx @sentry/cli sourcemaps upload \
    --auth-token ${process.env.SENTRY_AUTH_TOKEN} \
    --org pixelcrate \
    --project chatai \
    --release ${release} \
    --url-prefix '~/assets' \
    ./dist/assets`, 
    { stdio: 'inherit' }
  );
  
  console.log('✅ Source maps uploaded successfully to Sentry!');
} catch (error) {
  console.error('❌ Failed to upload source maps:', error);
  process.exit(1);
}