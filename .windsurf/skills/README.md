# Cascade Skills - Intelligent Code Assistant

A unified skill that provides comprehensive coding assistance.

## Available Skill

### Code Assistant (`code-assistant.md`)
**Comprehensive coding assistance with automatic mode detection**

Automatically handles:
- 🔍 **Code Review** - Quality, security, performance analysis
- 🧪 **Testing** - Test generation and coverage
- 🐛 **Debugging** - Bug fixing and troubleshooting  
- ♻️ **Refactoring** - Code improvement and cleanup

## How It Works

Just describe what you need in natural language:

```
"Review this code" → Code review mode
"Add tests" → Testing mode
"Fix this error" → Debugging mode
"Refactor this function" → Refactoring mode
```

Cascade automatically:
1. Detects your intent
2. Selects the appropriate mode
3. Uses deterministic utilities
4. Provides structured feedback

## Utilities

All modes leverage shell utilities in `.windsurf/workflows/utils/`:
- `analyze-context.sh` - Project analysis
- `static-analysis.sh` - Code quality
- `coverage-check.sh` - Test coverage
- `quality-gate.sh` - Verification
- And more...

## Usage

No commands needed - just ask naturally:
- "Is this code secure?"
- "Generate tests for this"
- "Why is this failing?"
- "Clean up this function"

See `code-assistant.md` for full documentation.
