import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

async function analyzeSourceMapCoverage(sourceDir = './src') {
    try {
        // 1. Get all source files (excluding tests and icons)
        const sourceFiles = await glob(`${sourceDir}/**/*.{ts,tsx,js,jsx}`, {
            ignore: [
                '**/node_modules/**',
                '**/dist/**',
                '**/__tests__/**',
                '**/icons/**',
                '**/*.test.{ts,tsx,js,jsx}',
                '**/*.spec.{ts,tsx,js,jsx}'
            ],
            nodir: true
        });

        // Sort and normalize source paths
        const normalizedSourceFiles = sourceFiles
            .map(file => path.normalize(file))
            .sort();

        console.log('\n=== Source Files ===\n');
        console.log(`Found ${normalizedSourceFiles.length} source files`);
        normalizedSourceFiles.forEach(file => console.log(file));

        // 2. Get all files referenced in source maps (excluding node_modules)
        const mapFiles = await glob('./dist/assets/**/*.map');
        const sourcesFromMaps = new Set();

        for (const mapFile of mapFiles) {
            const content = JSON.parse(await fs.promises.readFile(mapFile, 'utf8'));
            content.sources
                .filter(source => !source.includes('node_modules')) // Exclude node_modules
                .forEach(source => {
                // Clean up source paths (remove relative paths, etc.)
                const cleanPath = path.normalize(source)
                    .replace('../../', '')
                    .replace(/^\//, '');
                sourcesFromMaps.add(cleanPath);
            });
        }

        const sortedMapSources = Array.from(sourcesFromMaps).sort();

        console.log('\n=== Files in Source Maps (excluding node_modules) ===\n');
        console.log(`Found ${sortedMapSources.length} files in source maps`);
        sortedMapSources.forEach(file => console.log(file));

        // 3. Compare lists
        console.log('\n=== Coverage Analysis ===\n');

        // Normalize paths for comparison
        const normalizedMapSources = sortedMapSources.map(file =>
            path.normalize(file).replace(/^.*?src\//, 'src/')
        );

        // Files in source but not in maps
        const missingInMaps = normalizedSourceFiles.filter(sourceFile =>
            !normalizedMapSources.includes(sourceFile)
        );

        // Files in maps but not in source
        const extraInMaps = normalizedMapSources.filter(mapSource =>
            !normalizedSourceFiles.includes(mapSource)
        );

        console.log('Files missing from source maps:');
        missingInMaps.forEach(file => console.log(`  - ${file}`));

        console.log('\nExtra files in source maps:');
        extraInMaps.forEach(file => console.log(`  - ${file}`));

        // 4. Statistics
        const filesInBoth = normalizedSourceFiles.length - missingInMaps.length;
        const coverage = (filesInBoth / normalizedSourceFiles.length) * 100;

        console.log('\n=== Statistics ===\n');
        console.log(`Total source files: ${normalizedSourceFiles.length}`);
        console.log(`Files found in source maps: ${sortedMapSources.length}`);
        console.log(`Files present in both: ${filesInBoth}`);
        console.log(`Files missing from maps: ${missingInMaps.length}`);
        console.log(`Extra files in maps: ${extraInMaps.length}`);
        console.log(`Coverage: ${coverage.toFixed(2)}%`);

        // 5. Detailed matching analysis
        console.log('\n=== Matched Files ===\n');
        normalizedSourceFiles
            .filter(sourceFile => normalizedMapSources.includes(sourceFile))
            .forEach(file => console.log(`  ✓ ${file}`));

    } catch (error) {
        console.error('Error analyzing source maps:', error);
    }
}

// Execute with command line argument or default to './src'
const sourceDir = process.argv[2] || './src';
analyzeSourceMapCoverage(sourceDir);
