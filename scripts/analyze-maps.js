/* eslint-env node */

import fs from 'fs';
import path from 'path';
import { glob } from 'glob';
import minimatch from 'minimatch';

async function validateSourceMapCoverage(sourceDir = './src') {
    try {
        // 1. Get all source files (excluding tests and icons)
        const sourceFiles = await glob(`${sourceDir}/**/*.{ts,tsx,js,jsx}`, {
            ignore: [
                '**/node_modules/**',
                '**/dist/**',
                '**/__tests__/**',
                '**/icons/**',
                '**/*.test.{ts,tsx,js,jsx}',
                '**/*.spec.{ts,tsx,js,jsx}',
                '**/assets/icons/**'
            ],
            nodir: true
        });

        // Normalize source paths
        const normalizedSourceFiles = sourceFiles
            .map(file => path.normalize(file))
            .sort();

        console.log(`Found ${normalizedSourceFiles.length} source files`);

        // 2. Get all files referenced in source maps (excluding node_modules)
        const mapFiles = await glob('./dist/assets/**/*.map');
        const sourcesFromMaps = new Set();

        for (const mapFile of mapFiles) {
            const content = JSON.parse(await fs.promises.readFile(mapFile, 'utf8'));
            content.sources
                .filter(source => !source.includes('node_modules'))
                .forEach(source => {
                    const cleanPath = path.normalize(source)
                        .replace('../../', '')
                        .replace(/^\//, '');
                    sourcesFromMaps.add(cleanPath);
                });
        }

        const normalizedMapSources = Array.from(sourcesFromMaps)
            .map(file => path.normalize(file).replace(/^.*?src\//, 'src/'))
            .sort();

        console.log(`Found ${normalizedMapSources.length} files in source maps`);

        // 3. Find files missing from source maps
        const missingInMaps = normalizedSourceFiles.filter(sourceFile =>
            !normalizedMapSources.includes(sourceFile)
        );

        // 4. Validate against .mapignore
        let allowedMissingPatterns = [];
        try {
            const mapIgnoreContent = await fs.promises.readFile('.mapignore', 'utf8');
            allowedMissingPatterns = mapIgnoreContent
                .split('\n')
                .filter(line => line.trim() && !line.startsWith('#'));
            console.log(`Loaded ${allowedMissingPatterns.length} patterns from .mapignore`);
        } catch (error) {
            console.warn('No .mapignore file found or error reading it:', error.message);
        }
        
        // Check if any missing files are not in the allowed list
        const unexpectedMissingFiles = missingInMaps.filter(file => {
            return !allowedMissingPatterns.some(pattern => minimatch(file, pattern));
        });
        
        if (unexpectedMissingFiles.length > 0) {
            console.error('\n❌ VALIDATION FAILED: Unexpected files missing from source maps:');
            unexpectedMissingFiles.forEach(file => console.error(`  - ${file}`));
            process.exit(1);
        } else {
            console.log('\n✅ VALIDATION PASSED: All missing files are in the allowed list');
        }
    } catch (error) {
        console.error('Error validating source maps:', error);
        process.exit(1);
    }
}

// Parse command line arguments
let sourceDir = './src';
process.argv.slice(2).forEach(arg => {
    if (!arg.startsWith('--')) {
        sourceDir = arg;
    }
});

validateSourceMapCoverage(sourceDir);