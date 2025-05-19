#!/bin/bash
# git_files.sh - Parse git status --porcelain output and return list of files
# Usage: git status --porcelain | grep -E "\.(js|ts)$" | ./git_files.sh

# Function to display help
show_help() {
    cat << EOF
git_files.sh - Extract filenames from git status --porcelain output

USAGE:
    git status --porcelain | ./git_files.sh [OPTIONS]

    Or with filtering:
    git status --porcelain | grep -E "\.(js|ts)$" | ./git_files.sh

OPTIONS:
    -h, --help     Show this help message and exit

DESCRIPTION:
    This script parses the output of 'git status --porcelain' and returns
    a list of all files. By default outputs one file per line.

EXAMPLES:
    # Get all modified files as newline-separated list
    git status --porcelain | ./git_files.sh

    # Get only TypeScript files as space-separated list
    git status --porcelain | grep -E "\.(ts|tsx)$" | ./git_files.sh --space
EOF
}

# Process command line arguments
SEPARATOR="\n"
while [[ "$#" -gt 0 ]]; do
    case $1 in
        -h|--help)
    show_help
    exit 0
            ;;
        *)
            echo "Unknown parameter: $1"
            show_help
            exit 1
            ;;
    esac
    shift
done

# Check if stdin is empty
if [ -t 0 ]; then
    # No input provided
    echo "No input provided. Run with --help for usage information."
    exit 0
fi

# Read from stdin and extract filenames
awk -v sep="$SEPARATOR" '{
    # Extract the status and filename
    status = substr($0, 1, 2)
    filename = substr($0, 4)

    # Handle renamed files (contains " -> ")
    if (filename ~ / -> /) {
        split(filename, parts, " -> ")
        filename = parts[2]  # Use the destination filename
    }

    # Print the filename with the specified separator
    printf "%s%s", filename, sep
}' | sed "s/$SEPARATOR$//"
