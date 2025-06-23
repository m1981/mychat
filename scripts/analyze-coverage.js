// scripts/analyze-coverage.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const coverageDir = path.join(__dirname, '../coverage-report');

// Ensure the directory exists
if (!fs.existsSync(coverageDir)) {
  fs.mkdirSync(coverageDir, { recursive: true });
}

console.log('📊 Coverage Analysis');
console.log('-------------------');
console.log('1. Run your app with: pnpm dev:coverage');
console.log('2. Open Chrome DevTools and go to the Coverage tab (Ctrl+Shift+P > Show Coverage)');
console.log('3. Record coverage while using your app');
console.log('4. Export the coverage report as JSON');
console.log('5. Save it to:', coverageDir);
console.log('6. Run: node scripts/analyze-coverage.js <filename.json>');

// If a file is provided, analyze it
const coverageFile = process.argv[2];
if (coverageFile) {
  const filePath = path.join(coverageDir, coverageFile);
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    process.exit(1);
  }

  const coverageData = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  // Sort by unused percentage (highest first)
  const sortedData = [...coverageData].sort((a, b) => {
    const aUnused = (a.unusedBytes / a.totalBytes) * 100;
    const bUnused = (b.unusedBytes / b.totalBytes) * 100;
    return bUnused - aUnused;
  });

  console.log('\n🔍 Files with highest unused code percentage:');
  console.log('-------------------------------------------');

  sortedData.slice(0, 20).forEach((item, index) => {
    const unusedPercentage = (item.unusedBytes / item.totalBytes) * 100;
    console.log(`${index + 1}. ${item.url}`);
    console.log(`   Unused: ${unusedPercentage.toFixed(2)}% (${item.unusedBytes}/${item.totalBytes} bytes)`);
  });
}
