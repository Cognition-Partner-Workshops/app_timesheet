---
name: Analysis / Code Quality Review
description: Comprehensive code review analyzing quality, security, performance, and maintainability
tags: [code-review, quality, security, best-practices]
version: 1.0.0
---

# Code Quality Review Skill

Automatically analyzes code for quality issues, security vulnerabilities, and improvement opportunities.

## When to Use This Skill

Cascade will automatically invoke this skill when you:
- Ask to review code
- Request quality analysis
- Mention security concerns
- Ask about best practices

## Execution Process

### Step 1: Context Gathering
```bash
bash .windsurf/skills/code-quality-review/scripts/extract-structure.sh <file>
bash .windsurf/skills/code-quality-review/scripts/git-context.sh <file>
```

### Step 2: Automated Checks
```bash
bash .windsurf/skills/code-quality-review/scripts/static-analysis.sh <file>
bash .windsurf/skills/code-quality-review/scripts/find-patterns.sh "security-pattern"
```

### Step 3: Review Checklist

**Code Quality**: Readability, naming, complexity, DRY, documentation
**Security**: Input validation, SQL injection, hardcoded secrets, error leakage
**Performance**: Algorithm efficiency, data structures, resource usage, query optimization
**Architecture**: SOLID principles, design patterns, separation of concerns

### Step 4: Generate Report

Provide structured feedback:
- Summary assessment
- Strengths identified
- Issues categorized by severity (Critical / Major / Minor)
- Code examples (before/after)
- Prioritized recommendations
- Next steps

## Output Format

```markdown
## Code Review Report

### Summary
[Overall assessment]

### Issues Found

#### Critical (Must Fix)
- **Issue**: Description
  - Location: file:line
  - Impact: Why it matters
  - Fix: How to resolve

#### Major (Should Fix)
[Similar structure]

#### Minor (Consider)
[Similar structure]

### Recommendations
[Prioritized action items]
```

## Language-Specific Considerations

- **JavaScript/TypeScript**: async/await, type safety, promise handling, memory leaks
- **Python**: PEP 8, exception handling, type hints
- **Go**: error handling, goroutines, defer, race conditions
- **Java**: resource management, thread safety
- **Rust**: ownership, borrowing, unsafe code
