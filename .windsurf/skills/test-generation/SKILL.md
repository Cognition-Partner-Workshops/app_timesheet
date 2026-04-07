---
name: Transform / Test Generation
description: Generate comprehensive test suites with coverage analysis and best practices
tags: [testing, test-generation, unit-tests, coverage, quality-assurance]
version: 1.0.0
---

# Test Generation Skill

Automatically generates comprehensive test suites following testing best practices.

## When to Use This Skill

Cascade will automatically invoke this skill when you:
- Ask to generate or write tests
- Request test coverage
- Mention testing needs
- Ask about test cases

## Execution Process

### Step 1: Analyze Target Code
```bash
bash .windsurf/skills/test-generation/scripts/extract-structure.sh <file>
bash .windsurf/skills/test-generation/scripts/find-patterns.sh "test|spec"
bash .windsurf/skills/test-generation/scripts/coverage-check.sh
```

### Step 2: Identify Test Cases

**Test Categories**:
- Happy path (normal behavior)
- Edge cases (boundaries, limits)
- Error cases (invalid inputs)
- State changes (transitions)
- Side effects (external interactions)

### Step 3: Generate Tests

Follow the **Arrange-Act-Assert** pattern:
- **Arrange**: Set up test data and mocks
- **Act**: Execute the function under test
- **Assert**: Verify the results

**Naming**: `test_<function>_<scenario>_<expected>` or `should_<behavior>_when_<condition>`

### Step 4: Verify Quality
```bash
bash .windsurf/skills/test-generation/scripts/quality-gate.sh
bash .windsurf/skills/test-generation/scripts/coverage-check.sh
```

## Test Quality Checklist

- Tests are independent (run in any order)
- Tests are deterministic (same input = same output)
- Tests are fast
- Tests are readable
- Meaningful assertions
- Proper cleanup
- No external dependencies
- Edge cases covered

## Mocking Guidelines

**Mock**: External APIs, databases, file systems, time/dates, third-party services
**Don't Mock**: Simple utilities, pure functions, value objects, internal logic

## Coverage Goals

- **Minimum**: 80% code coverage
- **Target**: 90% code coverage
- **Critical Paths**: 100% coverage
