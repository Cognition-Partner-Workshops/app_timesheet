#!/bin/bash
# format-code.sh - Format code using appropriate formatter
# Usage: bash format-code.sh <file-or-directory>

set -euo pipefail

TARGET="${1:-}"
OUTPUT_DIR=".windsurf/tmp"
LOG_FILE="$OUTPUT_DIR/workflow-log.txt"

mkdir -p "$OUTPUT_DIR"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

if [ -z "$TARGET" ]; then
    echo "Usage: $0 <file-or-directory>"
    exit 1
fi

if [ ! -e "$TARGET" ]; then
    echo "Error: $TARGET does not exist"
    exit 1
fi

log "Formatting: $TARGET"

# Detect file type and apply appropriate formatter
format_file() {
    local file="$1"
    local ext="${file##*.}"
    
    case "$ext" in
        js|jsx|ts|tsx)
            if command -v prettier &> /dev/null; then
                log "Running prettier on $file"
                prettier --write "$file" 2>&1 | tee -a "$LOG_FILE"
            elif command -v eslint &> /dev/null; then
                log "Running eslint --fix on $file"
                eslint --fix "$file" 2>&1 | tee -a "$LOG_FILE"
            else
                log "No JavaScript formatter found (prettier/eslint)"
            fi
            ;;
        py)
            if command -v black &> /dev/null; then
                log "Running black on $file"
                black "$file" 2>&1 | tee -a "$LOG_FILE"
            elif command -v autopep8 &> /dev/null; then
                log "Running autopep8 on $file"
                autopep8 --in-place "$file" 2>&1 | tee -a "$LOG_FILE"
            else
                log "No Python formatter found (black/autopep8)"
            fi
            ;;
        go)
            if command -v gofmt &> /dev/null; then
                log "Running gofmt on $file"
                gofmt -w "$file" 2>&1 | tee -a "$LOG_FILE"
            else
                log "gofmt not found"
            fi
            ;;
        rs)
            if command -v rustfmt &> /dev/null; then
                log "Running rustfmt on $file"
                rustfmt "$file" 2>&1 | tee -a "$LOG_FILE"
            else
                log "rustfmt not found"
            fi
            ;;
        java)
            if command -v google-java-format &> /dev/null; then
                log "Running google-java-format on $file"
                google-java-format -i "$file" 2>&1 | tee -a "$LOG_FILE"
            else
                log "google-java-format not found"
            fi
            ;;
        cs)
            if command -v dotnet &> /dev/null; then
                log "Running dotnet format on $file"
                dotnet format "$file" 2>&1 | tee -a "$LOG_FILE"
            else
                log "dotnet not found"
            fi
            ;;
        *)
            log "No formatter configured for .$ext files"
            ;;
    esac
}

# Process target
if [ -f "$TARGET" ]; then
    format_file "$TARGET"
elif [ -d "$TARGET" ]; then
    log "Formatting all files in directory: $TARGET"
    find "$TARGET" -type f \( -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" -o -name "*.py" -o -name "*.go" -o -name "*.rs" -o -name "*.java" -o -name "*.cs" \) | while read -r file; do
        format_file "$file"
    done
fi

log "Formatting complete"
echo "Formatting complete. Check $LOG_FILE for details."
