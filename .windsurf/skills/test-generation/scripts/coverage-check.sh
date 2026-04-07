#!/bin/bash
# coverage-check.sh - Check code coverage
# Usage: bash coverage-check.sh

set -euo pipefail

OUTPUT_DIR=".windsurf/tmp"
LOG_FILE="$OUTPUT_DIR/workflow-log.txt"
REPORT_FILE="$OUTPUT_DIR/coverage-report.txt"

mkdir -p "$OUTPUT_DIR"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

log "Checking code coverage"

# Initialize report
cat > "$REPORT_FILE" << EOF
=== Code Coverage Report ===
Timestamp: $(date)

EOF

# Detect project type and run coverage
if [ -f "package.json" ]; then
    echo "--- JavaScript/TypeScript Coverage ---" >> "$REPORT_FILE"
    if command -v jest &> /dev/null; then
        log "Running Jest with coverage"
        jest --coverage --silent >> "$REPORT_FILE" 2>&1 || echo "Jest coverage failed" >> "$REPORT_FILE"
    elif command -v nyc &> /dev/null; then
        log "Running nyc"
        nyc npm test >> "$REPORT_FILE" 2>&1 || echo "NYC coverage failed" >> "$REPORT_FILE"
    else
        echo "No coverage tool found (jest/nyc)" >> "$REPORT_FILE"
    fi
elif [ -f "pytest.ini" ] || [ -f "setup.py" ] || [ -f "pyproject.toml" ]; then
    echo "--- Python Coverage ---" >> "$REPORT_FILE"
    if command -v pytest &> /dev/null && command -v coverage &> /dev/null; then
        log "Running pytest with coverage"
        coverage run -m pytest >> "$REPORT_FILE" 2>&1 || echo "Coverage run failed" >> "$REPORT_FILE"
        coverage report >> "$REPORT_FILE" 2>&1 || echo "Coverage report failed" >> "$REPORT_FILE"
    else
        echo "pytest-cov not found" >> "$REPORT_FILE"
    fi
elif [ -f "go.mod" ]; then
    echo "--- Go Coverage ---" >> "$REPORT_FILE"
    if command -v go &> /dev/null; then
        log "Running go test with coverage"
        go test -cover ./... >> "$REPORT_FILE" 2>&1 || echo "Go coverage failed" >> "$REPORT_FILE"
    fi
elif [ -f "Cargo.toml" ]; then
    echo "--- Rust Coverage ---" >> "$REPORT_FILE"
    if command -v cargo &> /dev/null && command -v tarpaulin &> /dev/null; then
        log "Running cargo tarpaulin"
        cargo tarpaulin >> "$REPORT_FILE" 2>&1 || echo "Tarpaulin failed" >> "$REPORT_FILE"
    else
        echo "cargo-tarpaulin not found" >> "$REPORT_FILE"
    fi
else
    echo "No supported project type detected" >> "$REPORT_FILE"
fi

echo "" >> "$REPORT_FILE"
echo "==============================" >> "$REPORT_FILE"

log "Coverage check complete"
echo ""
cat "$REPORT_FILE"
echo ""
echo "Full report saved to: $REPORT_FILE"
