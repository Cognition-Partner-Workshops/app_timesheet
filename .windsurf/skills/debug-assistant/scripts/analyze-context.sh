#!/bin/bash
# analyze-context.sh - Gather comprehensive context about the workspace
# Usage: bash analyze-context.sh [optional-path]

set -euo pipefail

WORKSPACE_ROOT="${1:-$(pwd)}"
OUTPUT_DIR=".windsurf/tmp"
OUTPUT_FILE="$OUTPUT_DIR/context-report.json"
LOG_FILE="$OUTPUT_DIR/workflow-log.txt"

mkdir -p "$OUTPUT_DIR"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

log "Starting context analysis for: $WORKSPACE_ROOT"

# Initialize JSON structure
cat > "$OUTPUT_FILE" << 'EOF'
{
  "timestamp": "",
  "workspace_root": "",
  "project_info": {},
  "file_stats": {},
  "git_info": {},
  "dependencies": {},
  "recent_changes": []
}
EOF

# Update timestamp and workspace root
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
jq --arg ts "$TIMESTAMP" --arg root "$WORKSPACE_ROOT" \
   '.timestamp = $ts | .workspace_root = $root' \
   "$OUTPUT_FILE" > "$OUTPUT_FILE.tmp" && mv "$OUTPUT_FILE.tmp" "$OUTPUT_FILE"

# Detect project type
detect_project_type() {
    local project_type="unknown"
    local language="unknown"
    local framework="unknown"
    
    if [ -f "package.json" ]; then
        project_type="nodejs"
        language="javascript"
        if grep -q "\"react\"" package.json 2>/dev/null; then
            framework="react"
        elif grep -q "\"vue\"" package.json 2>/dev/null; then
            framework="vue"
        elif grep -q "\"next\"" package.json 2>/dev/null; then
            framework="nextjs"
        fi
    elif [ -f "requirements.txt" ] || [ -f "setup.py" ] || [ -f "pyproject.toml" ]; then
        project_type="python"
        language="python"
        if [ -f "manage.py" ]; then
            framework="django"
        elif grep -q "flask" requirements.txt 2>/dev/null; then
            framework="flask"
        fi
    elif [ -f "pom.xml" ]; then
        project_type="java"
        language="java"
        framework="maven"
    elif [ -f "build.gradle" ] || [ -f "build.gradle.kts" ]; then
        project_type="java"
        language="java"
        framework="gradle"
    elif [ -f "Cargo.toml" ]; then
        project_type="rust"
        language="rust"
        framework="cargo"
    elif [ -f "go.mod" ]; then
        project_type="go"
        language="go"
        framework="go-modules"
    elif [ -f "*.csproj" ] || [ -f "*.sln" ]; then
        project_type="dotnet"
        language="csharp"
        framework="dotnet"
    fi
    
    jq --arg type "$project_type" --arg lang "$language" --arg fw "$framework" \
       '.project_info.type = $type | .project_info.language = $lang | .project_info.framework = $fw' \
       "$OUTPUT_FILE" > "$OUTPUT_FILE.tmp" && mv "$OUTPUT_FILE.tmp" "$OUTPUT_FILE"
    
    log "Detected project: $project_type ($language - $framework)"
}

# Gather file statistics
gather_file_stats() {
    log "Gathering file statistics..."
    
    local total_files=$(find . -type f ! -path '*/\.*' ! -path '*/node_modules/*' ! -path '*/venv/*' ! -path '*/target/*' ! -path '*/build/*' | wc -l | tr -d ' ')
    local total_dirs=$(find . -type d ! -path '*/\.*' ! -path '*/node_modules/*' ! -path '*/venv/*' ! -path '*/target/*' ! -path '*/build/*' | wc -l | tr -d ' ')
    
    # Count by extension
    local code_files=$(find . -type f \( -name "*.js" -o -name "*.ts" -o -name "*.py" -o -name "*.java" -o -name "*.go" -o -name "*.rs" -o -name "*.cs" \) ! -path '*/node_modules/*' ! -path '*/venv/*' ! -path '*/target/*' ! -path '*/build/*' | wc -l | tr -d ' ')
    local test_files=$(find . -type f \( -name "*.test.*" -o -name "*.spec.*" -o -name "*_test.*" \) ! -path '*/node_modules/*' ! -path '*/venv/*' | wc -l | tr -d ' ')
    
    jq --arg total "$total_files" --arg dirs "$total_dirs" --arg code "$code_files" --arg tests "$test_files" \
       '.file_stats.total_files = ($total | tonumber) | 
        .file_stats.total_directories = ($dirs | tonumber) |
        .file_stats.code_files = ($code | tonumber) |
        .file_stats.test_files = ($tests | tonumber)' \
       "$OUTPUT_FILE" > "$OUTPUT_FILE.tmp" && mv "$OUTPUT_FILE.tmp" "$OUTPUT_FILE"
    
    log "Files: $total_files, Directories: $total_dirs, Code files: $code_files, Test files: $test_files"
}

# Gather git information
gather_git_info() {
    if [ -d ".git" ]; then
        log "Gathering git information..."
        
        local branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
        local commit=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
        local has_changes=$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')
        local remote=$(git remote get-url origin 2>/dev/null || echo "none")
        
        jq --arg branch "$branch" --arg commit "$commit" --arg changes "$has_changes" --arg remote "$remote" \
           '.git_info.branch = $branch | 
            .git_info.commit = $commit |
            .git_info.uncommitted_changes = ($changes | tonumber) |
            .git_info.remote = $remote' \
           "$OUTPUT_FILE" > "$OUTPUT_FILE.tmp" && mv "$OUTPUT_FILE.tmp" "$OUTPUT_FILE"
        
        log "Git: branch=$branch, commit=$commit, changes=$has_changes"
    else
        log "Not a git repository"
    fi
}

# Gather recent changes
gather_recent_changes() {
    if [ -d ".git" ]; then
        log "Gathering recent changes..."
        
        # Get last 10 commits
        git log --pretty=format:'{"commit":"%h","author":"%an","date":"%ai","message":"%s"}' -n 10 2>/dev/null | \
        jq -s '.' > "$OUTPUT_DIR/recent-commits.json" || echo "[]" > "$OUTPUT_DIR/recent-commits.json"
        
        # Get recently modified files
        git diff --name-only HEAD~5..HEAD 2>/dev/null | head -20 > "$OUTPUT_DIR/recent-files.txt" || touch "$OUTPUT_DIR/recent-files.txt"
        
        local recent_count=$(wc -l < "$OUTPUT_DIR/recent-files.txt" | tr -d ' ')
        log "Recent changes: $recent_count files modified in last 5 commits"
    fi
}

# Analyze dependencies
analyze_dependencies() {
    log "Analyzing dependencies..."
    
    if [ -f "package.json" ]; then
        jq '.dependencies // {} | keys' package.json > "$OUTPUT_DIR/dependencies.json" 2>/dev/null || echo "[]" > "$OUTPUT_DIR/dependencies.json"
        local dep_count=$(jq 'length' "$OUTPUT_DIR/dependencies.json")
        log "Found $dep_count npm dependencies"
    elif [ -f "requirements.txt" ]; then
        grep -v "^#" requirements.txt | grep -v "^$" | cut -d'=' -f1 | cut -d'>' -f1 | cut -d'<' -f1 | jq -R . | jq -s . > "$OUTPUT_DIR/dependencies.json" 2>/dev/null || echo "[]" > "$OUTPUT_DIR/dependencies.json"
        local dep_count=$(jq 'length' "$OUTPUT_DIR/dependencies.json")
        log "Found $dep_count Python dependencies"
    elif [ -f "go.mod" ]; then
        grep "^\s*[a-z]" go.mod | awk '{print $1}' | jq -R . | jq -s . > "$OUTPUT_DIR/dependencies.json" 2>/dev/null || echo "[]" > "$OUTPUT_DIR/dependencies.json"
        local dep_count=$(jq 'length' "$OUTPUT_DIR/dependencies.json")
        log "Found $dep_count Go dependencies"
    else
        echo "[]" > "$OUTPUT_DIR/dependencies.json"
    fi
}

# Main execution
main() {
    cd "$WORKSPACE_ROOT" || exit 1
    
    detect_project_type
    gather_file_stats
    gather_git_info
    gather_recent_changes
    analyze_dependencies
    
    log "Context analysis complete. Report saved to: $OUTPUT_FILE"
    
    # Pretty print summary
    echo ""
    echo "=== Context Analysis Summary ==="
    jq -r '
        "Project Type: \(.project_info.type)",
        "Language: \(.project_info.language)",
        "Framework: \(.project_info.framework)",
        "Total Files: \(.file_stats.total_files)",
        "Code Files: \(.file_stats.code_files)",
        "Test Files: \(.file_stats.test_files)",
        "Git Branch: \(.git_info.branch // "N/A")",
        "Uncommitted Changes: \(.git_info.uncommitted_changes // 0)"
    ' "$OUTPUT_FILE"
    echo "================================"
}

main "$@"
