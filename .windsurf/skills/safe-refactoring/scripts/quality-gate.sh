#!/bin/bash
# quality-gate.sh - Run quality checks before completion
# Usage: bash quality-gate.sh

set -euo pipefail

OUTPUT_DIR=".windsurf/tmp"
LOG_FILE="$OUTPUT_DIR/workflow-log.txt"
REPORT_FILE="$OUTPUT_DIR/quality-gate-report.txt"

mkdir -p "$OUTPUT_DIR"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

log "Running quality gate checks"

# Initialize report
cat > "$REPORT_FILE" << EOF
=== Quality Gate Report ===
Timestamp: $(date)

EOF

PASS_COUNT=0
FAIL_COUNT=0
WARN_COUNT=0

check_pass() {
    echo "✓ $1" >> "$REPORT_FILE"
    PASS_COUNT=$((PASS_COUNT + 1))
}

check_fail() {
    echo "✗ $1" >> "$REPORT_FILE"
    FAIL_COUNT=$((FAIL_COUNT + 1))
}

check_warn() {
    echo "⚠ $1" >> "$REPORT_FILE"
    WARN_COUNT=$((WARN_COUNT + 1))
}

# Check 1: Compilation/Syntax
echo "--- Compilation/Syntax Checks ---" >> "$REPORT_FILE"

if [ -f "package.json" ]; then
    if command -v npm &> /dev/null; then
        if npm run build --if-present &> /dev/null; then
            check_pass "JavaScript/TypeScript compilation successful"
        else
            check_fail "JavaScript/TypeScript compilation failed"
        fi
    fi
elif [ -f "setup.py" ] || [ -f "pyproject.toml" ]; then
    if command -v python &> /dev/null; then
        if python -m py_compile **/*.py &> /dev/null; then
            check_pass "Python syntax check passed"
        else
            check_fail "Python syntax errors found"
        fi
    fi
elif [ -f "go.mod" ]; then
    if command -v go &> /dev/null; then
        if go build ./... &> /dev/null; then
            check_pass "Go compilation successful"
        else
            check_fail "Go compilation failed"
        fi
    fi
elif [ -f "Cargo.toml" ]; then
    if command -v cargo &> /dev/null; then
        if cargo check &> /dev/null; then
            check_pass "Rust check passed"
        else
            check_fail "Rust check failed"
        fi
    fi
fi

echo "" >> "$REPORT_FILE"

# Check 2: Tests
echo "--- Test Execution ---" >> "$REPORT_FILE"

if [ -f "package.json" ] && grep -q "\"test\"" package.json; then
    if npm test &> /dev/null; then
        check_pass "All tests passed"
    else
        check_fail "Some tests failed"
    fi
elif [ -f "pytest.ini" ] || [ -f "setup.py" ]; then
    if command -v pytest &> /dev/null; then
        if pytest &> /dev/null; then
            check_pass "All Python tests passed"
        else
            check_fail "Some Python tests failed"
        fi
    fi
elif [ -f "go.mod" ]; then
    if go test ./... &> /dev/null; then
        check_pass "All Go tests passed"
    else
        check_fail "Some Go tests failed"
    fi
elif [ -f "Cargo.toml" ]; then
    if cargo test &> /dev/null; then
        check_pass "All Rust tests passed"
    else
        check_fail "Some Rust tests failed"
    fi
else
    check_warn "No test framework detected"
fi

echo "" >> "$REPORT_FILE"

# Check 3: Linting
echo "--- Linting Checks ---" >> "$REPORT_FILE"

if command -v eslint &> /dev/null && [ -f ".eslintrc.js" ] || [ -f ".eslintrc.json" ]; then
    if eslint . &> /dev/null; then
        check_pass "ESLint checks passed"
    else
        check_fail "ESLint found issues"
    fi
elif command -v pylint &> /dev/null; then
    if pylint **/*.py &> /dev/null; then
        check_pass "Pylint checks passed"
    else
        check_warn "Pylint found issues"
    fi
elif command -v golint &> /dev/null; then
    if golint ./... &> /dev/null; then
        check_pass "Golint checks passed"
    else
        check_warn "Golint found issues"
    fi
else
    check_warn "No linter configured"
fi

echo "" >> "$REPORT_FILE"

# Check 4: Git Status
echo "--- Git Status ---" >> "$REPORT_FILE"

if [ -d ".git" ]; then
    UNCOMMITTED=$(git status --porcelain | wc -l | tr -d ' ')
    if [ "$UNCOMMITTED" -eq 0 ]; then
        check_pass "No uncommitted changes"
    else
        check_warn "$UNCOMMITTED uncommitted changes present"
    fi
    
    # Check for merge conflicts
    if git diff --name-only --diff-filter=U | grep -q .; then
        check_fail "Merge conflicts detected"
    else
        check_pass "No merge conflicts"
    fi
fi

echo "" >> "$REPORT_FILE"

# Check 5: Security
echo "--- Security Checks ---" >> "$REPORT_FILE"

# Check for common secrets patterns
if grep -r -E "(password|secret|api_key|token)\s*=\s*['\"][^'\"]+['\"]" . --include="*.js" --include="*.py" --include="*.go" --exclude-dir=node_modules --exclude-dir=venv 2>/dev/null | grep -v "test" | grep -q .; then
    check_warn "Potential hardcoded secrets detected"
else
    check_pass "No obvious hardcoded secrets found"
fi

# Check for dependency vulnerabilities
if [ -f "package.json" ] && command -v npm &> /dev/null; then
    if npm audit --audit-level=high &> /dev/null; then
        check_pass "No high-severity npm vulnerabilities"
    else
        check_warn "High-severity npm vulnerabilities found"
    fi
fi

echo "" >> "$REPORT_FILE"

# Summary
echo "==============================" >> "$REPORT_FILE"
echo "Summary:" >> "$REPORT_FILE"
echo "  Passed: $PASS_COUNT" >> "$REPORT_FILE"
echo "  Warnings: $WARN_COUNT" >> "$REPORT_FILE"
echo "  Failed: $FAIL_COUNT" >> "$REPORT_FILE"
echo "==============================" >> "$REPORT_FILE"

log "Quality gate checks complete: $PASS_COUNT passed, $WARN_COUNT warnings, $FAIL_COUNT failed"

# Display report
echo ""
cat "$REPORT_FILE"
echo ""
echo "Full report saved to: $REPORT_FILE"

# Exit with appropriate code
if [ "$FAIL_COUNT" -gt 0 ]; then
    exit 1
else
    exit 0
fi
