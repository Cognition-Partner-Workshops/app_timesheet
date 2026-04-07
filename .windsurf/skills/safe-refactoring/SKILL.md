---
name: Transform / Safe Refactoring
description: Incremental code refactoring with automated verification and quality assurance
tags: [refactoring, code-improvement, clean-code, architecture]
version: 1.0.0
---

# Safe Refactoring Skill

Systematically improves code quality through safe, incremental refactoring.

## When to Use This Skill

Cascade will automatically invoke this skill when you:
- Ask to refactor code
- Request code improvements
- Mention code smells
- Ask to clean up or simplify code

## Execution Process

### Step 1: Analyze Current Code
```bash
bash .windsurf/skills/safe-refactoring/scripts/extract-structure.sh <file>
bash .windsurf/skills/safe-refactoring/scripts/static-analysis.sh <file>
bash .windsurf/skills/safe-refactoring/scripts/coverage-check.sh
```

**Identify Code Smells**: Long methods, large classes, duplicate code, complex conditionals, magic numbers, god objects, feature envy

### Step 2: Ensure Test Coverage
- Run existing tests as baseline
- Add tests if coverage is low
- Document current behavior

### Step 3: Plan Refactoring

**Common Patterns**:
- Extract Method/Function
- Extract Class
- Replace Conditional with Polymorphism
- Introduce Parameter Object
- Move Method/Field
- Rename for Clarity

### Step 4: Execute Incrementally
1. Make one small change
2. Run tests
3. Verify behavior unchanged
4. Commit if tests pass
5. Repeat

### Step 5: Verify Quality
```bash
bash .windsurf/skills/safe-refactoring/scripts/quality-gate.sh
```

## Refactoring Principles

1. **Red-Green-Refactor**: Tests pass → Refactor → Tests still pass
2. **Small Steps**: Make tiny, verifiable changes
3. **One Thing at a Time**: Don't mix refactoring with features
4. **Preserve Behavior**: Functionality must not change
5. **Commit Often**: Each successful step is a commit point

## Code Complexity Metrics

- **Cyclomatic Complexity**: 1-10 simple, 11-20 moderate, 21-50 complex, 50+ must refactor
- **Function Length**: <20 good, 20-50 acceptable, 50-100 consider refactoring, 100+ refactor
- **Class Size**: <200 good, 200-500 acceptable, 500-1000 large, 1000+ too large
