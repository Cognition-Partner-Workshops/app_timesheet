#!/bin/bash
# summarize-changes.sh - Generate a summary of changes made
# Usage: bash summarize-changes.sh

set -euo pipefail

OUTPUT_DIR=".windsurf/tmp"
LOG_FILE="$OUTPUT_DIR/workflow-log.txt"
REPORT_FILE="$OUTPUT_DIR/change-summary.txt"

mkdir -p "$OUTPUT_DIR"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

log "Generating change summary"

# Initialize report
cat > "$REPORT_FILE" << EOF
=== Change Summary ===
Generated: $(date)

EOF

# Git changes
if [ -d ".git" ]; then
    echo "--- Modified Files ---" >> "$REPORT_FILE"
    git status --porcelain | while read -r status file; do
        case "$status" in
            M*)
                echo "  Modified: $file" >> "$REPORT_FILE"
                ;;
            A*)
                echo "  Added: $file" >> "$REPORT_FILE"
                ;;
            D*)
                echo "  Deleted: $file" >> "$REPORT_FILE"
                ;;
            ??)
                echo "  Untracked: $file" >> "$REPORT_FILE"
                ;;
        esac
    done
    echo "" >> "$REPORT_FILE"
    
    # Statistics
    echo "--- Change Statistics ---" >> "$REPORT_FILE"
    MODIFIED=$(git status --porcelain | grep "^ M" | wc -l | tr -d ' ')
    ADDED=$(git status --porcelain | grep "^A" | wc -l | tr -d ' ')
    DELETED=$(git status --porcelain | grep "^D" | wc -l | tr -d ' ')
    UNTRACKED=$(git status --porcelain | grep "^??" | wc -l | tr -d ' ')
    
    echo "  Modified files: $MODIFIED" >> "$REPORT_FILE"
    echo "  Added files: $ADDED" >> "$REPORT_FILE"
    echo "  Deleted files: $DELETED" >> "$REPORT_FILE"
    echo "  Untracked files: $UNTRACKED" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
    
    # Diff summary
    echo "--- Diff Summary ---" >> "$REPORT_FILE"
    git diff --stat >> "$REPORT_FILE" 2>&1 || echo "No diff available" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
    
    # Recent commits (if any)
    if git log -1 &> /dev/null; then
        echo "--- Last Commit ---" >> "$REPORT_FILE"
        git log -1 --pretty=format:"Commit: %h%nAuthor: %an%nDate: %ad%nMessage: %s%n" >> "$REPORT_FILE"
        echo "" >> "$REPORT_FILE"
    fi
fi

# File count changes
echo "--- File Count Changes ---" >> "$REPORT_FILE"
CURRENT_FILES=$(find . -type f ! -path '*/\.*' ! -path '*/node_modules/*' ! -path '*/venv/*' | wc -l | tr -d ' ')
echo "  Current file count: $CURRENT_FILES" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# Recent workflow activity
if [ -f "$LOG_FILE" ]; then
    echo "--- Recent Workflow Activity ---" >> "$REPORT_FILE"
    tail -20 "$LOG_FILE" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
fi

echo "==============================" >> "$REPORT_FILE"

log "Change summary generated"
echo ""
cat "$REPORT_FILE"
echo ""
echo "Full summary saved to: $REPORT_FILE"
