import fs from 'fs';
import path from 'path';
import { glob } from 'glob';
import minimatch from 'minimatch';

async function analyzeSourceMapCoverage(sourceDir = './src', options = {}) {
    try {
        console.log(`Looking for source files in: ${path.resolve(sourceDir)}`);
        
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

        console.log(`Glob pattern used: ${sourceDir}/**/*.{ts,tsx,js,jsx}`);
        console.log(`Current working directory: ${process.cwd()}`);
        
        if (sourceFiles.length === 0) {
            console.warn('⚠️ WARNING: No source files found! Check the sourceDir path and glob pattern.');
            console.log('Trying alternative glob pattern...');
            
            // Try with absolute path
            const absoluteSourceDir = path.resolve(sourceDir);
            const alternativeSourceFiles = await glob(`${absoluteSourceDir}/**/*.{ts,tsx,js,jsx}`, {
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
            
            console.log(`Alternative glob found ${alternativeSourceFiles.length} files`);
            
            if (alternativeSourceFiles.length > 0) {
                console.log('Using alternative source files list');
                sourceFiles.push(...alternativeSourceFiles);
            }
        }

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

        // Missing Files Analysis
        console.log('\n=== Missing Files Analysis ===\n');
        const missingByType = missingInMaps.reduce((acc, file) => {
            const ext = path.extname(file);
            acc[ext] = (acc[ext] || 0) + 1;
            return acc;
        }, {});
        console.log('Missing files by type:', missingByType);

        const missingByFolder = missingInMaps.reduce((acc, file) => {
            const folder = path.dirname(file).split(path.sep)[1]; // Get first folder after src
            acc[folder] = (acc[folder] || 0) + 1;
            return acc;
        }, {});
        console.log('Missing files by folder:', missingByFolder);

        // Extra Files Analysis
        console.log('\n=== Extra Files Analysis ===\n');
        const extraByType = extraInMaps.reduce((acc, file) => {
            const ext = path.extname(file);
            acc[ext] = (acc[ext] || 0) + 1;
            return acc;
        }, {});
        console.log('Extra files by type:', extraByType);

        const extraByFolder = extraInMaps.reduce((acc, file) => {
            const folder = path.dirname(file).split(path.sep)[1]; // Get first folder after src
            acc[folder] = (acc[folder] || 0) + 1;
            return acc;
        }, {});
        console.log('Extra files by folder:', extraByFolder);

        // Path Normalization Debug
        console.log('\n=== Path Normalization Debug ===\n');
        console.log('Sample source file paths:');
        normalizedSourceFiles.slice(0, 3).forEach(file => {
            console.log(`  Original: ${file}`);
        });

        console.log('\nSample map source paths:');
        normalizedMapSources.slice(0, 3).forEach(file => {
            console.log(`  Normalized: ${file}`);
        });

        console.log('\nFiles missing from source maps:');
        missingInMaps.forEach(file => console.log(`  - ${file}`));

        console.log('\nExtra files in source maps:');
        extraInMaps.forEach(file => console.log(`  - ${file}`));

        // 4. Statistics
        const filesInBoth = normalizedSourceFiles.length - missingInMaps.length;
        const coverage = (filesInBoth / normalizedSourceFiles.length) * 100;

        console.log('\n=== Statistics ===\n');
console.log('Source Files:');
console.log(`  Total: ${normalizedSourceFiles.length}`);
console.log(`  Included in maps: ${filesInBoth}`);
console.log(`  Missing from maps: ${missingInMaps.length}`);
console.log('\nSource Map Files:');
console.log(`  Total: ${sortedMapSources.length}`);
console.log(`  Matching source: ${filesInBoth}`);
console.log(`  Extra files: ${extraInMaps.length}`);
console.log('\nCoverage Analysis:');
console.log(`  Source files in maps: ${coverage.toFixed(2)}%`);


        // 5. Detailed matching analysis
        console.log('\n=== Matched Files ===\n');
        normalizedSourceFiles
            .filter(sourceFile => normalizedMapSources.includes(sourceFile))
            .forEach(file => console.log(`  ✓ ${file}`));

        // After the missingInMaps is calculated, add this validation code:
        console.log('\n=== Source Map Coverage Validation ===\n');
        
        // Read the .mapignore file
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
            // Check if file matches any pattern in the allowed list
            return !allowedMissingPatterns.some(pattern => minimatch(file, pattern));
        });
        
        if (unexpectedMissingFiles.length > 0) {
            console.error('\n❌ VALIDATION FAILED: Unexpected files missing from source maps:');
            unexpectedMissingFiles.forEach(file => console.error(`  - ${file}`));
            
            // Exit with error code if validation is required
            if (options.requireValidation) {
                process.exit(1);
            }
        } else {
            console.log('\n✅ VALIDATION PASSED: All missing files are in the allowed list');
        }
    } catch (error) {
        console.error('Error analyzing source maps:', error);
        if (options.requireValidation) {
            process.exit(1);
        }
    }
}

// Parse command line arguments properly
let sourceDir = './src';
let requireValidation = false;

// Process command line arguments
process.argv.slice(2).forEach(arg => {
  if (arg === '--validate') {
    requireValidation = true;
  } else if (!arg.startsWith('--')) {
    sourceDir = arg;
  }
});

console.log(`Source directory: ${sourceDir}`);
console.log(`Validation required: ${requireValidation}`);

analyzeSourceMapCoverage(sourceDir, { requireValidation });
