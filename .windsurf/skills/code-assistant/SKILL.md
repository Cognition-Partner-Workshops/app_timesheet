---
name: General / Code Assistant
description: Comprehensive coding assistance including review, testing, debugging, and refactoring
tags: [code-review, testing, debugging, refactoring, quality, security]
version: 1.0.0
---

# Code Assistant Skill

A comprehensive skill that provides intelligent coding assistance across multiple domains.

## Capabilities

This skill automatically handles:

### 🔍 Code Quality & Review
- Security vulnerability scanning
- Performance analysis  
- Best practices verification
- Architecture review

### 🧪 Testing
- Test generation (unit, integration)
- Coverage analysis
- Test quality verification

### 🐛 Debugging
- Root cause analysis
- Bug fixing
- Regression test creation

### ♻️ Refactoring
- Code smell detection
- Safe incremental refactoring
- Complexity reduction

## When to Use

Cascade automatically invokes this skill when you:
- Ask to review code
- Request tests
- Report bugs or errors
- Ask to refactor or improve code
- Mention quality, security, or performance

## How It Works

Based on your request, this skill:

1. **Analyzes context** using utilities:
   ```bash
   bash .windsurf/skills/code-assistant/scripts/analyze-context.sh
   bash .windsurf/skills/code-assistant/scripts/analyze-context.sh <file>
   ```

2. **Determines focus area**:
   - Quality/Security → Code review mode
   - Testing → Test generation mode
   - Errors/Bugs → Debugging mode
   - Improvements → Refactoring mode

3. **Executes appropriate workflow**:
   - Runs relevant utilities
   - Performs analysis
   - Generates recommendations
   - Verifies changes

4. **Provides structured output**:
   - Summary
   - Findings (categorized by severity)
   - Code examples
   - Actionable recommendations

## Execution Modes

### Code Review Mode
**Triggered by**: "review", "security", "quality", "check"

**Process**:
```bash
# Static analysis
bash .windsurf/skills/code-quality-review/scripts/static-analysis.sh <file>

# Security patterns
bash .windsurf/skills/code-quality-review/scripts/find-patterns.sh "security-pattern"

# Git context
bash .windsurf/skills/code-quality-review/scripts/git-context.sh <file>
```

**Output**: Categorized issues (Critical/Major/Minor) with fixes

---

### Testing Mode
**Triggered by**: "test", "coverage", "unit test", "integration"

**Process**:
```bash
# Check existing coverage
bash .windsurf/skills/test-generation/scripts/coverage-check.sh

# Extract structure
bash .windsurf/skills/test-generation/scripts/extract-structure.sh <file>
```

**Output**: Generated tests with coverage metrics

---

### Debugging Mode
**Triggered by**: "error", "bug", "fix", "crash", "exception"

**Process**:
```bash
# Analyze recent changes
bash .windsurf/skills/debug-assistant/scripts/git-context.sh <file>

# Find patterns
bash .windsurf/skills/debug-assistant/scripts/find-patterns.sh <error-pattern>
```

**Output**: Root cause analysis with fix and regression test

---

### Refactoring Mode
**Triggered by**: "refactor", "improve", "clean up", "simplify"

**Process**:
```bash
# Analyze complexity
bash .windsurf/skills/safe-refactoring/scripts/static-analysis.sh <file>

# Check test coverage
bash .windsurf/skills/safe-refactoring/scripts/coverage-check.sh
```

**Output**: Incremental refactoring steps with verification

## Quality Verification

All modes use quality gates:
```bash
bash .windsurf/skills/safe-refactoring/scripts/quality-gate.sh
```

Ensures:
- ✓ Code compiles/runs
- ✓ Tests pass
- ✓ Linting satisfied
- ✓ No security issues
- ✓ Documentation updated

## Integration with Utilities

Each skill embeds its own scripts in a local `scripts/` subdirectory:
- `code-assistant/scripts/` - Context analysis, formatting, config
- `code-quality-review/scripts/` - Static analysis, pattern matching, structure extraction
- `debug-assistant/scripts/` - Git context, pattern matching, context analysis
- `safe-refactoring/scripts/` - Structure extraction, static analysis, coverage, quality gate
- `test-generation/scripts/` - Structure extraction, coverage, quality gate, pattern matching

## Example Invocations

**Code Review**:
- "Review this code for security issues"
- "Is this implementation following best practices?"
- "Check the payment service for vulnerabilities"

**Testing**:
- "Generate tests for this function"
- "Add test coverage"
- "Write unit tests for authentication"

**Debugging**:
- "Fix the null pointer error"
- "Why is this crashing?"
- "Debug the login issue"

**Refactoring**:
- "This function is too complex"
- "Refactor the UserService class"
- "Clean up this code"

## Output Format

```markdown
## [Mode] Report

### Summary
[High-level assessment]

### Analysis
[Detailed findings]

### Recommendations
1. [Prioritized actions]
2. [Best practices]

### Code Examples
**Before:**
```language
[current code]
```

**After:**
```language
[improved code]
```

### Next Steps
- [ ] Action items
```

## Language Support

- **JavaScript/TypeScript**: async/await, type safety, promises
- **Python**: PEP 8, exception handling, type hints
- **Go**: error handling, goroutines, defer
- **Java**: resource management, thread safety
- **Rust**: ownership, borrowing, unsafe code

## Customization

Configure via `.windsurf/skills/code-assistant/scripts/project-config.sh`:
```bash
export PROJECT_LANGUAGE="javascript"
export FORMATTER_JS="prettier"
export TEST_RUNNER_JS="jest"
export COVERAGE_THRESHOLD="80"
```
