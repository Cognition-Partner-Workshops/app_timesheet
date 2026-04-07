#!/bin/bash
# find-patterns.sh - Find code patterns in the codebase
# Usage: bash find-patterns.sh <pattern> [file-extension]

set -euo pipefail

PATTERN="${1:-}"
EXTENSION="${2:-*}"
OUTPUT_DIR=".windsurf/tmp"
LOG_FILE="$OUTPUT_DIR/workflow-log.txt"

mkdir -p "$OUTPUT_DIR"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

if [ -z "$PATTERN" ]; then
    echo "Usage: $0 <pattern> [file-extension]"
    echo "Example: $0 'class.*extends' js"
    echo "Example: $0 'def test_' py"
    exit 1
fi

log "Searching for pattern: $PATTERN (extension: $EXTENSION)"

# Build find command based on extension
FIND_CMD="find . -type f"

if [ "$EXTENSION" != "*" ]; then
    FIND_CMD="$FIND_CMD -name \"*.$EXTENSION\""
fi

# Exclude common directories
FIND_CMD="$FIND_CMD ! -path '*/node_modules/*' ! -path '*/venv/*' ! -path '*/target/*' ! -path '*/build/*' ! -path '*/.git/*' ! -path '*/dist/*'"

# Execute search
OUTPUT_FILE="$OUTPUT_DIR/pattern-matches.txt"
echo "=== Pattern Search Results ===" > "$OUTPUT_FILE"
echo "Pattern: $PATTERN" >> "$OUTPUT_FILE"
echo "Extension: $EXTENSION" >> "$OUTPUT_FILE"
echo "Timestamp: $(date)" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# Use grep with context
eval "$FIND_CMD" | while read -r file; do
    if grep -l -E "$PATTERN" "$file" 2>/dev/null; then
        echo "File: $file" >> "$OUTPUT_FILE"
        grep -n -E "$PATTERN" "$file" 2>/dev/null | head -10 >> "$OUTPUT_FILE"
        echo "" >> "$OUTPUT_FILE"
    fi
done

# Count matches
MATCH_COUNT=$(grep -c "^File:" "$OUTPUT_FILE" || echo "0")

log "Found $MATCH_COUNT files matching pattern"

# Display results
if [ "$MATCH_COUNT" -gt 0 ]; then
    echo ""
    echo "=== Pattern Matches Found ==="
    cat "$OUTPUT_FILE"
    echo "============================="
    echo ""
    echo "Full results saved to: $OUTPUT_FILE"
else
    echo "No matches found for pattern: $PATTERN"
fi

exit 0
