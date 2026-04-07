#!/bin/bash
# static-analysis.sh - Run static analysis on code
# Usage: bash static-analysis.sh <file-or-directory>

set -euo pipefail

TARGET="${1:-}"
OUTPUT_DIR=".windsurf/tmp"
LOG_FILE="$OUTPUT_DIR/workflow-log.txt"
REPORT_FILE="$OUTPUT_DIR/static-analysis-report.txt"

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

log "Running static analysis on: $TARGET"

# Initialize report
cat > "$REPORT_FILE" << EOF
=== Static Analysis Report ===
Target: $TARGET
Timestamp: $(date)

EOF

# Detect file type and run appropriate analyzer
analyze_file() {
    local file="$1"
    local ext="${file##*.}"
    
    echo "Analyzing: $file" >> "$REPORT_FILE"
    
    case "$ext" in
        js|jsx|ts|tsx)
            if command -v eslint &> /dev/null; then
                log "Running eslint on $file"
                echo "--- ESLint Results ---" >> "$REPORT_FILE"
                eslint "$file" >> "$REPORT_FILE" 2>&1 || true
            fi
            ;;
        py)
            if command -v pylint &> /dev/null; then
                log "Running pylint on $file"
                echo "--- Pylint Results ---" >> "$REPORT_FILE"
                pylint "$file" >> "$REPORT_FILE" 2>&1 || true
            elif command -v flake8 &> /dev/null; then
                log "Running flake8 on $file"
                echo "--- Flake8 Results ---" >> "$REPORT_FILE"
                flake8 "$file" >> "$REPORT_FILE" 2>&1 || true
            fi
            
            if command -v mypy &> /dev/null; then
                log "Running mypy on $file"
                echo "--- MyPy Results ---" >> "$REPORT_FILE"
                mypy "$file" >> "$REPORT_FILE" 2>&1 || true
            fi
            ;;
        go)
            if command -v golint &> /dev/null; then
                log "Running golint on $file"
                echo "--- Golint Results ---" >> "$REPORT_FILE"
                golint "$file" >> "$REPORT_FILE" 2>&1 || true
            fi
            
            if command -v go &> /dev/null; then
                log "Running go vet on $file"
                echo "--- Go Vet Results ---" >> "$REPORT_FILE"
                go vet "$file" >> "$REPORT_FILE" 2>&1 || true
            fi
            ;;
        rs)
            if command -v cargo &> /dev/null; then
                log "Running cargo clippy"
                echo "--- Clippy Results ---" >> "$REPORT_FILE"
                cargo clippy -- -D warnings >> "$REPORT_FILE" 2>&1 || true
            fi
            ;;
        java)
            if command -v checkstyle &> /dev/null; then
                log "Running checkstyle on $file"
                echo "--- Checkstyle Results ---" >> "$REPORT_FILE"
                checkstyle "$file" >> "$REPORT_FILE" 2>&1 || true
            fi
            ;;
        *)
            echo "No static analyzer configured for .$ext files" >> "$REPORT_FILE"
            ;;
    esac
    
    echo "" >> "$REPORT_FILE"
}

# Process target
if [ -f "$TARGET" ]; then
    analyze_file "$TARGET"
elif [ -d "$TARGET" ]; then
    log "Analyzing all files in directory: $TARGET"
    find "$TARGET" -type f \( -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" -o -name "*.py" -o -name "*.go" -o -name "*.rs" -o -name "*.java" \) ! -path '*/node_modules/*' ! -path '*/venv/*' ! -path '*/target/*' ! -path '*/build/*' | while read -r file; do
        analyze_file "$file"
    done
fi

# Summary
echo "==============================" >> "$REPORT_FILE"
echo "Analysis complete" >> "$REPORT_FILE"

log "Static analysis complete"
echo ""
cat "$REPORT_FILE"
echo ""
echo "Full report saved to: $REPORT_FILE"
