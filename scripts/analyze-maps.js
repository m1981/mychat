// analyze-maps.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { glob } from 'glob';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function analyzeMaps() {
    try {
        // Find all .map files in dist/assets
        const mapFiles = await glob('./dist/assets/**/*.map');

        const results = [];

        for (const mapFile of mapFiles) {
            const content = JSON.parse(await fs.promises.readFile(mapFile, 'utf8'));
            const jsFile = mapFile.replace('.map', '');

            // Get file sizes
            const mapStats = await fs.promises.stat(mapFile);
            const jsStats = await fs.promises.stat(jsFile).catch(() => null);

            results.push({
                file: path.basename(mapFile),
                sourceCount: content.sources.length,
                mapSize: (mapStats.size / 1024).toFixed(2) + ' KB',
                jsSize: jsStats ? (jsStats.size / 1024).toFixed(2) + ' KB' : 'N/A',
                ratio: jsStats ? (mapStats.size / jsStats.size * 100).toFixed(2) + '%' : 'N/A',
                sources: content.sources.map(src => {
                    // Clean up node_modules paths for better readability
                    return src.replace('../../node_modules/.pnpm/', '')
                        .replace('/node_modules/', '')
                        .split('/').slice(0, 2).join('/');
                })
            });
        }

        // Print summary
        console.log('\n=== Source Map Analysis ===\n');

        results.forEach(result => {
            console.log(`\nFile: ${result.file}`);
            console.log(`JS Size: ${result.jsSize}`);
            console.log(`Map Size: ${result.mapSize}`);
            console.log(`Map/JS Ratio: ${result.ratio}`);
            console.log(`Number of sources: ${result.sourceCount}`);
            console.log('\nTop dependencies:');

            // Count and sort dependencies by frequency
            const deps = result.sources.reduce((acc, src) => {
                acc[src] = (acc[src] || 0) + 1;
                return acc;
            }, {});

            Object.entries(deps)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 10)
                .forEach(([dep, count]) => {
                    console.log(`  ${dep}: ${count} files`);
                });

            console.log('\n' + '='.repeat(50));
        });

    } catch (error) {
        console.error('Error analyzing source maps:', error);
    }
}

analyzeMaps();
