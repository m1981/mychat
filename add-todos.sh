#!/bin/bash

# Usage: ./add-todos.sh ts-prune-output.txt

INPUT_FILE="${1:-/dev/stdin}"

# Check if input file exists or if we're reading from stdin
if [[ ! -f "$INPUT_FILE" && "$INPUT_FILE" != "/dev/stdin" ]]; then
  echo "Error: Input file not found"
  echo "Usage: ./add-todos.sh ts-prune-output.txt"
  echo "   or: ts-prune -i '(test|gatsby)' | ./add-todos.sh"
  exit 1
fi

# Process each line from ts-prune output
while IFS= read -r line; do
  # Skip empty lines
  [[ -z "$line" ]] && continue
  
  # Extract file path, line number, and export name
  if [[ "$line" =~ ([^:]+):([0-9]+)\ -\ ([^\ ]+)(\ \(used\ in\ module\))? ]]; then
    FILE="${BASH_REMATCH[1]}"
    LINE="${BASH_REMATCH[2]}"
    EXPORT="${BASH_REMATCH[3]}"
    USED_IN_MODULE="${BASH_REMATCH[4]}"
    
    # Skip if file doesn't exist
    [[ ! -f "$FILE" ]] && echo "Warning: File not found: $FILE" && continue
    
    # Create different  messages based on whether it's used in module
    if [[ -n "$USED_IN_MODULE" ]]; then
      TODO_MSG="// TODO: Export '$EXPORT' is only used within this module. Consider removing the export."
    else
      TODO_MSG="// TODO: Export '$EXPORT' appears to be unused. Consider removing it or documenting why it's needed."
    fi
    
    # Calculate the line to insert the  (one line before the export)
    INSERT_LINE=$((LINE - 1))
    
    # Use sed to insert the  comment - using | as delimiter instead of /
    if [[ "$OSTYPE" == "darwin"* ]]; then
      # macOS version
      sed -i '' "${INSERT_LINE}s|^|${TODO_MSG}\n|" "$FILE"
    else
      # Linux version
      sed -i "${INSERT_LINE}s|^|${TODO_MSG}\n|" "$FILE"
    fi
    
    echo "Added TODO for '$EXPORT' in $FILE:$LINE"
  else
    echo "Warning: Could not parse line: $line"
  fi
done < "$INPUT_FILE"

echo "Done! Added TODO comments to files with unused exports."