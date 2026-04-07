#!/bin/bash
# git-context.sh - Gather git context for a file or directory
# Usage: bash git-context.sh <file-or-directory>

set -euo pipefail

TARGET="${1:-}"
OUTPUT_DIR=".windsurf/tmp"
LOG_FILE="$OUTPUT_DIR/workflow-log.txt"
REPORT_FILE="$OUTPUT_DIR/git-context-report.txt"

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

if [ ! -d ".git" ]; then
    echo "Error: Not a git repository"
    exit 1
fi

log "Gathering git context for: $TARGET"

# Initialize report
cat > "$REPORT_FILE" << EOF
=== Git Context Report ===
Target: $TARGET
Timestamp: $(date)

EOF

# Get file history
echo "--- Commit History (Last 10) ---" >> "$REPORT_FILE"
git log --oneline -n 10 -- "$TARGET" >> "$REPORT_FILE" 2>&1 || echo "No commit history found" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# Get recent changes
echo "--- Recent Changes ---" >> "$REPORT_FILE"
git log -p -n 3 -- "$TARGET" >> "$REPORT_FILE" 2>&1 || echo "No recent changes found" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# Get blame information (for files only)
if [ -f "$TARGET" ]; then
    echo "--- Blame Information (Last 20 lines) ---" >> "$REPORT_FILE"
    git blame "$TARGET" | tail -20 >> "$REPORT_FILE" 2>&1 || echo "Blame not available" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
fi

# Get authors
echo "--- Contributors ---" >> "$REPORT_FILE"
git log --format='%an' -- "$TARGET" | sort | uniq -c | sort -rn >> "$REPORT_FILE" 2>&1 || echo "No contributors found" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# Get current status
echo "--- Current Status ---" >> "$REPORT_FILE"
git status -- "$TARGET" >> "$REPORT_FILE" 2>&1 || echo "No status changes" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# Get diff if modified
if git diff --quiet -- "$TARGET" 2>/dev/null; then
    echo "No uncommitted changes" >> "$REPORT_FILE"
else
    echo "--- Uncommitted Changes ---" >> "$REPORT_FILE"
    git diff -- "$TARGET" >> "$REPORT_FILE" 2>&1
    echo "" >> "$REPORT_FILE"
fi

echo "==============================" >> "$REPORT_FILE"

log "Git context gathering complete"
echo ""
cat "$REPORT_FILE"
echo ""
echo "Full report saved to: $REPORT_FILE"
