#!/usr/bin/env node
import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const SENTRY_ORG = process.env.SENTRY_ORG;
const SENTRY_PROJECT = process.env.SENTRY_PROJECT;

// Validation functions
const validateEnvironment = () => {
  if (!process.env.SENTRY_AUTH_TOKEN) {
    throw new Error('SENTRY_AUTH_TOKEN is not set');
  }
  if (!SENTRY_ORG) {
    throw new Error('SENTRY_ORG is not set');
  }
  if (!SENTRY_PROJECT) {
    throw new Error('SENTRY_PROJECT is not set');
  }
};

const validateDistFolder = () => {
  const distPath = resolve(__dirname, '../dist');
  if (!existsSync(distPath)) {
    throw new Error('dist folder not found. Please run build first.');
  }
};

// Sentry CLI execution wrapper
const runSentryCLI = (command, description) => {
  console.log(`\n📦 ${description}...`);
  try {
    execSync(`npx @sentry/cli ${command}`, { stdio: 'inherit' });
  } catch (error) {
    throw new Error(`Failed to ${description.toLowerCase()}: ${error.message}`);
  }
};

async function main() {
  try {
    // Initial validations
    validateEnvironment();
    validateDistFolder();

    // Read package.json and set release version
const pkg = JSON.parse(readFileSync(resolve(__dirname, '../package.json'), 'utf8'));
const release = `v${pkg.version}`;

    console.log(`\n🚀 Processing source maps for release: ${release}`);

    // Step 1: Inject Debug IDs
    runSentryCLI(
      'sourcemaps inject ./dist',
      'Injecting Debug IDs'
    );

    // Step 2: Upload source maps
    runSentryCLI(
      `sourcemaps upload --org=${SENTRY_ORG} --project=${SENTRY_PROJECT} --release=${release} ./dist`,
      'Uploading source maps'
  );

    // Step 3: Create and finalize release
    runSentryCLI(
      `releases new --org=${SENTRY_ORG} --project=${SENTRY_PROJECT} ${release}`,
      `Creating release ${release}`
  );
  
    runSentryCLI(
      `releases finalize --org=${SENTRY_ORG} --project=${SENTRY_PROJECT} ${release}`,
      'Finalizing release'
  );

    // Step 4: Add deployment marker
    if (process.env.NODE_ENV === 'production') {
      runSentryCLI(
        `releases deploys ${release} new -e production --org=${SENTRY_ORG} --project=${SENTRY_PROJECT}`,
        'Adding deployment marker'
    );
  }

    console.log('\n✅ Source maps processing completed successfully!');
    console.log(`   Release: ${release}`);
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log('\n💡 To verify source maps are working:');
    console.log('   1. Wait for the first error to occur');
    console.log('   2. Get the error event ID from Sentry');
    console.log(`   3. Run: npx @sentry/cli sourcemaps explain <EVENT_ID>`);

} catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the script
main().catch((error) => {
  console.error('\n💥 Fatal error:', error);
  process.exit(1);
});
