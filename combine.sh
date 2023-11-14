#!/bin/bash

set -euo pipefail

# The file where everything will be concatenated
outputFile="all.txt"

# Empty the file if it already exists
> "$outputFile"

# Function to safely handle each file
handle_file() {
    local file="$1"
    echo "Appending $file to $outputFile"
    
    # Append the filename, then the code block start marker
    echo "File: $file" >> "$outputFile"
    echo '```' >> "$outputFile"
    # Append the contents of the current file
    cat "$file" >> "$outputFile"
    # Append the code block end marker
    echo '```' >> "$outputFile"
    # Add a newline for spacing between files entries
    echo -e "\n" >> "$outputFile"
}

# Check if any arguments were passed
if [ "$#" -eq 0 ]; then
    echo "No files specified. Usage: $0 file1.ts file2.js ..."
    exit 1
fi

# Iterate over the positional parameters
for file in "$@"; do
    # Check if file exists and is a regular file
    if [ -f "$file" ]; then
        handle_file "$file"
    else
        echo "Warning: File $file does not exist or is not a regular file. Skipping."
    fi
done

echo "Concatenation complete. Result is in $outputFile"
