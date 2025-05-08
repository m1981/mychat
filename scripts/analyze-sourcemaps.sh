#!/bin/bash
# Script to analyze source maps and their content

DIST_DIR="dist"
ASSETS_DIR="$DIST_DIR/assets"
OUTPUT_DIR="sourcemap_analysis"

mkdir -p "$OUTPUT_DIR"
rm -rf "$OUTPUT_DIR/*"

echo "Analyzing source maps in $ASSETS_DIR..."

# Count total source maps
TOTAL_MAPS=$(find "$ASSETS_DIR" -name "*.map" | wc -l)
echo "Total source maps: $TOTAL_MAPS"

# Count maps with app code
APP_MAPS=$(grep -l "src/components/" "$ASSETS_DIR"/*.map 2>/dev/null | wc -l)
echo "Maps with app components: $APP_MAPS"

# List all unique source paths
echo "Extracting unique source paths from all maps..."
if command -v jq &> /dev/null; then
  for map in $(find "$ASSETS_DIR" -name "*.map"); do
    jq -r '.sources[]' "$map" 2>/dev/null
  done | sort | uniq > "$OUTPUT_DIR/all_source_paths.txt"
  
  echo "Top source paths:"
  cat "$OUTPUT_DIR/all_source_paths.txt" | grep -v "node_modules" | head -10
  
  # Count source paths by directory
  echo "Source path distribution:"
  cat "$OUTPUT_DIR/all_source_paths.txt" | grep -v "^$" | 
    sed 's|/[^/]*$||' | sort | uniq -c | sort -nr | head -10

  # Generate coverage report for app source files
  echo -e "\n=== Source Map Coverage Report ==="
  echo "Analyzing which app source files are mapped in source maps..."

  # Extract all app source files (excluding node_modules)
  grep -v "node_modules" "$OUTPUT_DIR/all_source_paths.txt" | sort > "$OUTPUT_DIR/app_source_paths.txt"
  APP_SOURCE_COUNT=$(wc -l < "$OUTPUT_DIR/app_source_paths.txt")
  echo "Total app source files found in maps: $APP_SOURCE_COUNT"

  # Create a report of which source maps contain which app files
  echo -e "\nGenerating coverage matrix..."
  echo "Source Map File,App Files Count,Component Files,Store Files,Util Files" > "$OUTPUT_DIR/coverage_matrix.csv"

  for map in $(find "$ASSETS_DIR" -name "*.map"); do
    MAP_BASENAME=$(basename "$map")
    APP_FILES_COUNT=$(jq -r '.sources[]' "$map" 2>/dev/null | grep -v "node_modules" | wc -l)
    COMPONENT_FILES=$(jq -r '.sources[]' "$map" 2>/dev/null | grep "src/components/" | wc -l)
    STORE_FILES=$(jq -r '.sources[]' "$map" 2>/dev/null | grep "src/store/" | wc -l)
    UTIL_FILES=$(jq -r '.sources[]' "$map" 2>/dev/null | grep "src/utils/" | wc -l)

    echo "$MAP_BASENAME,$APP_FILES_COUNT,$COMPONENT_FILES,$STORE_FILES,$UTIL_FILES" >> "$OUTPUT_DIR/coverage_matrix.csv"

    # Save detailed source list for maps with app files
    if [ "$APP_FILES_COUNT" -gt 0 ]; then
      echo -e "\nSource files in $MAP_BASENAME:" > "$OUTPUT_DIR/map_contents_$MAP_BASENAME.txt"
      jq -r '.sources[]' "$map" 2>/dev/null | grep -v "node_modules" | sort >> "$OUTPUT_DIR/map_contents_$MAP_BASENAME.txt"
    fi
  done

  # Generate summary of maps with app files
  echo -e "\nSource maps with app files:"
  grep -v "^Source Map File" "$OUTPUT_DIR/coverage_matrix.csv" | awk -F, '$2 > 0 {print $0}' | sort -t, -k2,2nr | head -10

  # Find unmapped source files
  echo -e "\nChecking for unmapped source files..."
  if [ -d "src" ]; then
    find src -type f -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" | sed 's|^|../../|' > "$OUTPUT_DIR/all_source_files.txt"
    TOTAL_SOURCE_FILES=$(wc -l < "$OUTPUT_DIR/all_source_files.txt")

    # Compare with mapped files
    comm -23 <(sort "$OUTPUT_DIR/all_source_files.txt") <(sort "$OUTPUT_DIR/app_source_paths.txt") > "$OUTPUT_DIR/unmapped_files.txt"
    UNMAPPED_FILES=$(wc -l < "$OUTPUT_DIR/unmapped_files.txt")

    echo "Total source files in project: $TOTAL_SOURCE_FILES"
    echo "Unmapped source files: $UNMAPPED_FILES ($(( UNMAPPED_FILES * 100 / TOTAL_SOURCE_FILES ))%)"
    echo "Top 10 unmapped files:"
    head -10 "$OUTPUT_DIR/unmapped_files.txt" | sed 's|^../../||'
else
    echo "Source directory not found. Skipping unmapped files check."
  fi

  # Check for sourceMappingURL comments in JS files
  echo -e "\nChecking for sourceMappingURL comments in JS files..."
  JS_FILES=$(find "$ASSETS_DIR" -name "*.js" | wc -l)
  JS_WITH_SOURCEMAP=$(grep -l "sourceMappingURL" "$ASSETS_DIR"/*.js 2>/dev/null | wc -l)
  echo "JS files with sourceMappingURL comments: $JS_WITH_SOURCEMAP / $JS_FILES ($(( JS_WITH_SOURCEMAP * 100 / JS_FILES ))%)"

  # Check for debug IDs
  echo -e "\nChecking for Sentry debug IDs in JS files..."
  DEBUG_ID_COUNT=$(grep -a -o "_sentryDebugIds\[[^]]*\][[:space:]]*=[[:space:]]*\"[^\"]*\"" "$ASSETS_DIR"/*.js 2>/dev/null | wc -l)
  echo "Files with Sentry debug IDs: $DEBUG_ID_COUNT"

else
  echo "jq not installed, skipping detailed source path analysis"
  echo "Install jq with: apt-get install jq or brew install jq"
fi

echo -e "\nAnalysis complete. See $OUTPUT_DIR for detailed reports."