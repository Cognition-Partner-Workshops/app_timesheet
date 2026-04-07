#!/bin/bash
# project-config.sh - Project-specific configuration
# Source this file to set project-specific variables

# Language Settings
export PROJECT_LANGUAGE="auto"  # auto, javascript, python, go, rust, java, csharp
export PROJECT_FRAMEWORK="auto"  # auto, react, vue, django, flask, etc.

# Formatter Settings
export FORMATTER_JS="prettier"  # prettier, eslint
export FORMATTER_PY="black"     # black, autopep8
export FORMATTER_GO="gofmt"
export FORMATTER_RUST="rustfmt"
export FORMATTER_JAVA="google-java-format"

# Linter Settings
export LINTER_JS="eslint"
export LINTER_PY="pylint"  # pylint, flake8
export LINTER_GO="golint"
export LINTER_RUST="clippy"

# Test Runner Settings
export TEST_RUNNER_JS="jest"    # jest, mocha, vitest
export TEST_RUNNER_PY="pytest"  # pytest, unittest
export TEST_RUNNER_GO="go test"
export TEST_RUNNER_RUST="cargo test"

# Coverage Settings
export COVERAGE_THRESHOLD="80"  # Minimum coverage percentage
export COVERAGE_TOOL_JS="jest"  # jest, nyc
export COVERAGE_TOOL_PY="coverage"

# Documentation Settings
export DOC_STYLE="google"  # google, numpy, sphinx
export DOC_REQUIRED="true"  # Require documentation for public APIs

# Quality Gate Settings
export REQUIRE_TESTS="true"
export REQUIRE_LINTING="true"
export REQUIRE_FORMATTING="true"
export ALLOW_WARNINGS="true"

# Git Settings
export AUTO_COMMIT="false"
export COMMIT_MESSAGE_PREFIX="[Cascade]"

# Security Settings
export SCAN_SECRETS="true"
export SCAN_DEPENDENCIES="true"

# Output Settings
export VERBOSE_LOGGING="false"
export SAVE_REPORTS="true"

# Custom Commands (override defaults)
# export CUSTOM_BUILD_CMD="npm run build"
# export CUSTOM_TEST_CMD="npm run test:ci"
# export CUSTOM_LINT_CMD="npm run lint"

echo "Project configuration loaded"
