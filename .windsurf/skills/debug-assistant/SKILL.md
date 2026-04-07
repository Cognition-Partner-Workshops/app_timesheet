---
name: Analysis / Debug Assistant
description: Systematic debugging workflow for identifying root causes and implementing fixes
tags: [debugging, troubleshooting, bug-fixing, error-analysis]
version: 1.0.0
---

# Debug Assistant Skill

Systematically identifies and fixes bugs using structured debugging methodology.

## When to Use This Skill

Cascade will automatically invoke this skill when you:
- Report an error or bug
- Share error messages or stack traces
- Ask to fix an issue
- Mention unexpected behavior

## Execution Process

### Step 1: Gather Error Information
```bash
bash .windsurf/skills/debug-assistant/scripts/git-context.sh <affected-file>
bash .windsurf/skills/debug-assistant/scripts/analyze-context.sh
```

### Step 2: Reproduce and Isolate
- Create minimal reproduction case
- Identify exact trigger conditions
- Use binary search debugging or strategic logging

### Step 3: Analyze Root Cause

**Common Bug Categories**:
- Logic errors (off-by-one, wrong conditions)
- State management (race conditions, stale state)
- Type/data issues (null/undefined, type mismatches)
- Async/concurrency (missing await, deadlocks)
- Resource issues (memory leaks, exhaustion)
- Integration issues (API mismatches, config errors)

### Step 4: Implement Fix

**Fix Checklist**:
- Addresses root cause (not symptoms)
- Minimal and focused
- Handles edge cases
- Includes error handling

### Step 5: Add Regression Test

- Test reproduces original bug (fails before fix)
- Test passes after fix
- Test covers edge cases
- Test is deterministic

### Step 6: Verify
```bash
bash .windsurf/skills/safe-refactoring/scripts/quality-gate.sh
```

## Common Error Patterns

| Error | Likely Cause | Quick Fix |
|-------|--------------|-----------|
| Cannot read property of undefined | Null value | Add null check |
| Maximum call stack exceeded | Infinite recursion | Check base case |
| EADDRINUSE | Port in use | Change port/kill process |
| Module not found | Missing dependency | Install package |

## Debugging Commands

- **Node.js**: `node --inspect-brk app.js`, `DEBUG=* node app.js`
- **Python**: `python -m pdb script.py`, `python -W all script.py`
- **Go**: `go run -race main.go`, `go test -v`
