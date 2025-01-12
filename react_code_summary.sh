#!/bin/bash

process_file() {
    local file="$1"
    local relative_file=$(basename "$file")

    echo "$relative_file"

    # Imports
    local imports=$(grep -E "^import .*" "$file" | sed 's/ as .*//g' | awk '!seen[$NF]++' | sort -u)
    if [ ! -z "$imports" ]; then
        echo "$imports"
    fi

    # Types and Interfaces
    local types=$(grep -E "^(export )?(interface|type) [A-Z]" "$file")
    if [ ! -z "$types" ]; then
        echo "$types"
    fi

    # Hook Definitions
    local hook_defs=$(grep -E "^const use[A-Z][a-zA-Z]* = .*=>" "$file")
    if [ ! -z "$hook_defs" ]; then
        echo "$hook_defs"
    fi

    # React Hooks Usage
    local react_hooks=$(grep -E "  const .* = (useState|useEffect|useRef|useCallback|useMemo)" "$file" | sort | uniq)
    if [ ! -z "$react_hooks" ]; then
        echo "$react_hooks"
    fi

    # Custom Hooks Usage
    local custom_hooks=$(grep -E "  const .* = use[A-Z][a-zA-Z]*" "$file" | grep -v "useState\|useStore" | awk '!seen[$0]++' | sort)
    if [ ! -z "$custom_hooks" ]; then
        echo "$custom_hooks"
    fi

    # Store Selectors
    local selectors=$(grep -E "  const .* = useStore\(.*\);" "$file" | grep -v "set[A-Z]" | sort | uniq)
    if [ ! -z "$selectors" ]; then
        echo "$selectors"
    fi

    # Store Actions
    local actions=$(grep -E "  const .* = useStore\(.*\);" "$file" | grep "set[A-Z]" | sort | uniq)
    if [ ! -z "$actions" ]; then
        echo "$actions"
    fi

    # Store State Access
    local state_access=$(grep -E "\.getState\(\)" "$file" | sort | uniq)
    if [ ! -z "$state_access" ]; then
        echo "$state_access"
    fi

    # Exported Items
    local exports=$(grep -E "^export (const|default|function)" "$file")
    if [ ! -z "$exports" ]; then
        echo "$exports"
    fi

    # Component Definitions
    local components=$(grep -E "^const [A-Z][a-zA-Z]* = (React\.memo\(|React\.forwardRef\(|\([^)]*\).*=>)" "$file")
    if [ ! -z "$components" ]; then
        echo "$components"
    fi

    echo -e "\n"
}

# Function to run regression test
run_regression_test() {
    local test_dir=$(realpath "$1")  # Changed from $2 to $1
    echo "🧪 Running regression test from directory: $test_dir"

    # Check if test directory exists
    if [ ! -d "$test_dir" ]; then
        echo "❌ Error: Test directory doesn't exist: $test_dir"
        exit 1
    fi

    # Check if test files exist in the specified directory
    if [ ! -f "$test_dir/test-file.tsx" ] || [ ! -f "$test_dir/summary_output.txt" ]; then
        echo "❌ Error: Missing test files in $test_dir (test-file.tsx or summary_output.txt)"
        exit 1
    fi

    # Create temporary output file
    local temp_output=$(mktemp)

    # Run analysis on test file
    process_file "$test_dir/test-file.tsx" > "$temp_output"

    # Compare with reference output
    echo "=== Diff ================================================="
    if diff -u "$test_dir/summary_output.txt" "$temp_output"; then
        echo "✅ Regression test passed! Output matches reference."
        rm "$temp_output"
        exit 0
    else
        echo "❌ Regression test failed! See differences above."
        rm "$temp_output"
        exit 1
    fi
}


# Main script logic
if [ "$1" == "--test" ]; then
    if [ -z "$2" ]; then
        echo "Error: Please provide test directory path"
        echo "Usage for test: $0 --test <test_directory_path>"
        exit 1
    fi
    run_regression_test "$2"  # Pass the second argument to run_regression_test
else
    if [ -z "$1" ]; then
        echo "Error: Please provide a directory path or use --test"
        echo "Usage: $0 <directory_path>"
        echo "       $0 --test <test_directory_path>"
        exit 1
    fi

    if [ ! -d "$1" ]; then
        echo "Error: '$1' is not a valid directory"
        exit 1
    fi

    echo "🔮 Ultimate File Analysis Magic V11 - FINAL PERFECTION ✨"
    echo "=================================================="

    # Find all .ts and .tsx files and process them
    find "$1" -type f \( -name "*.ts" -o -name "*.tsx" \) -not -path "*/node_modules/*" | while read -r file; do
        process_file "$file"
    done
fi

