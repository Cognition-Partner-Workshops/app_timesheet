#!/bin/bash
# extract-structure.sh - Extract code structure for documentation
# Usage: bash extract-structure.sh <file>

set -euo pipefail

TARGET="${1:-}"
OUTPUT_DIR=".windsurf/tmp"
LOG_FILE="$OUTPUT_DIR/workflow-log.txt"
REPORT_FILE="$OUTPUT_DIR/code-structure.txt"

mkdir -p "$OUTPUT_DIR"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

if [ -z "$TARGET" ]; then
    echo "Usage: $0 <file>"
    exit 1
fi

if [ ! -f "$TARGET" ]; then
    echo "Error: $TARGET is not a file"
    exit 1
fi

log "Extracting structure from: $TARGET"

EXT="${TARGET##*.}"

# Initialize report
cat > "$REPORT_FILE" << EOF
=== Code Structure ===
File: $TARGET
Type: $EXT
Timestamp: $(date)

EOF

# Extract based on file type
case "$EXT" in
    js|jsx|ts|tsx)
        echo "--- Functions ---" >> "$REPORT_FILE"
        grep -n "function\|const.*=.*=>.*{" "$TARGET" | head -50 >> "$REPORT_FILE" 2>&1 || echo "None found" >> "$REPORT_FILE"
        echo "" >> "$REPORT_FILE"
        
        echo "--- Classes ---" >> "$REPORT_FILE"
        grep -n "class " "$TARGET" >> "$REPORT_FILE" 2>&1 || echo "None found" >> "$REPORT_FILE"
        echo "" >> "$REPORT_FILE"
        
        echo "--- Exports ---" >> "$REPORT_FILE"
        grep -n "export " "$TARGET" >> "$REPORT_FILE" 2>&1 || echo "None found" >> "$REPORT_FILE"
        echo "" >> "$REPORT_FILE"
        ;;
    py)
        echo "--- Functions ---" >> "$REPORT_FILE"
        grep -n "^def " "$TARGET" >> "$REPORT_FILE" 2>&1 || echo "None found" >> "$REPORT_FILE"
        echo "" >> "$REPORT_FILE"
        
        echo "--- Classes ---" >> "$REPORT_FILE"
        grep -n "^class " "$TARGET" >> "$REPORT_FILE" 2>&1 || echo "None found" >> "$REPORT_FILE"
        echo "" >> "$REPORT_FILE"
        
        echo "--- Imports ---" >> "$REPORT_FILE"
        grep -n "^import \|^from " "$TARGET" >> "$REPORT_FILE" 2>&1 || echo "None found" >> "$REPORT_FILE"
        echo "" >> "$REPORT_FILE"
        ;;
    go)
        echo "--- Functions ---" >> "$REPORT_FILE"
        grep -n "^func " "$TARGET" >> "$REPORT_FILE" 2>&1 || echo "None found" >> "$REPORT_FILE"
        echo "" >> "$REPORT_FILE"
        
        echo "--- Types ---" >> "$REPORT_FILE"
        grep -n "^type " "$TARGET" >> "$REPORT_FILE" 2>&1 || echo "None found" >> "$REPORT_FILE"
        echo "" >> "$REPORT_FILE"
        
        echo "--- Interfaces ---" >> "$REPORT_FILE"
        grep -n "interface {" "$TARGET" >> "$REPORT_FILE" 2>&1 || echo "None found" >> "$REPORT_FILE"
        echo "" >> "$REPORT_FILE"
        ;;
    java)
        echo "--- Classes ---" >> "$REPORT_FILE"
        grep -n "class \|interface " "$TARGET" >> "$REPORT_FILE" 2>&1 || echo "None found" >> "$REPORT_FILE"
        echo "" >> "$REPORT_FILE"
        
        echo "--- Methods ---" >> "$REPORT_FILE"
        grep -n "public\|private\|protected" "$TARGET" | grep "(" | head -50 >> "$REPORT_FILE" 2>&1 || echo "None found" >> "$REPORT_FILE"
        echo "" >> "$REPORT_FILE"
        ;;
    rs)
        echo "--- Functions ---" >> "$REPORT_FILE"
        grep -n "^fn \|^pub fn " "$TARGET" >> "$REPORT_FILE" 2>&1 || echo "None found" >> "$REPORT_FILE"
        echo "" >> "$REPORT_FILE"
        
        echo "--- Structs ---" >> "$REPORT_FILE"
        grep -n "^struct \|^pub struct " "$TARGET" >> "$REPORT_FILE" 2>&1 || echo "None found" >> "$REPORT_FILE"
        echo "" >> "$REPORT_FILE"
        
        echo "--- Traits ---" >> "$REPORT_FILE"
        grep -n "^trait \|^pub trait " "$TARGET" >> "$REPORT_FILE" 2>&1 || echo "None found" >> "$REPORT_FILE"
        echo "" >> "$REPORT_FILE"
        ;;
    *)
        echo "Unsupported file type: $EXT" >> "$REPORT_FILE"
        ;;
esac

# Count lines
echo "--- Statistics ---" >> "$REPORT_FILE"
TOTAL_LINES=$(wc -l < "$TARGET" | tr -d ' ')
CODE_LINES=$(grep -v "^\s*$\|^\s*#\|^\s*//" "$TARGET" | wc -l | tr -d ' ')
echo "Total lines: $TOTAL_LINES" >> "$REPORT_FILE"
echo "Code lines (approx): $CODE_LINES" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

echo "==============================" >> "$REPORT_FILE"

log "Structure extraction complete"
echo ""
cat "$REPORT_FILE"
echo ""
echo "Full report saved to: $REPORT_FILE"
