# Test Standards Enforcement

This document describes the mechanisms in place to ensure test quality and consistency.

## 1. Biome Linting Rules

### Project-wide Rules (`biome.json`)
- **noRestrictedImports** - Warns against importing old mockData files
- **noForEach** - Enforces for...of loops in tests
- **noUnusedImports** - Keeps imports clean

### Test-specific Rules (`tests/.biome.json`)
- **noRestrictedImports** (error level) - Blocks old mockData imports
- **noSkippedTests** - Warns about .skip() and .todo() tests
- **noUnusedImports** (error level) - Strict import hygiene in tests

## 2. Pattern Checking Script

### Running the Check
```bash
pnpm test:patterns
```

### What it Checks
1. **Hardcoded Addresses** - Detects Polkadot addresses not from fixtures
2. **Hardcoded BN Values** - Finds `new BN()` calls outside fixtures
3. **Skipped Tests** - Lists all .skip() and .todo() tests
4. **Fixture Usage** - Counts files not using the new structure
5. **Duplicate Mocks** - Finds repeated mock setups

### Output
- ✅ Green: All patterns good
- ⚠️  Yellow: Warnings (won't fail CI)
- ❌ Red: Errors (will fail CI)

## 3. CI Integration

### Pull Request Checks
The `ci-test-patterns.yml` workflow:
1. Runs on PRs that modify test files
2. Executes pattern checks
3. Comments on PR if issues found
4. Blocks merge if errors detected

### Pre-commit Hook (Optional)
Add to `.git/hooks/pre-commit`:
```bash
#!/bin/bash
if git diff --cached --name-only | grep -E '\.(test\.ts|test\.tsx)$'; then
  ./tests/lint-test-patterns.sh
fi
```

## 4. Editor Integration

### VS Code Settings
Add to `.vscode/settings.json`:
```json
{
  "files.associations": {
    "*.test.ts": "typescript",
    "*.test.tsx": "typescriptreact"
  },
  "editor.codeActionsOnSave": {
    "source.organizeImports": true
  },
  "biome.lspBin": "./node_modules/@biomejs/biome/bin/biome"
}
```

### Snippets
Create `.vscode/test.code-snippets`:
```json
{
  "Test with Fixtures": {
    "prefix": "testfix",
    "body": [
      "import { describe, it, expect } from 'vitest'",
      "import { TEST_ADDRESSES, TEST_AMOUNTS } from '@/tests/fixtures'",
      "import { createTestAccount } from '@/tests/utils/testHelpers'",
      "",
      "describe('${1:Component}', () => {",
      "  it('should ${2:behavior}', () => {",
      "    const account = createTestAccount()",
      "    $0",
      "  })",
      "})"
    ]
  }
}
```

## 5. Migration Support

### Resources
- `tests/MIGRATION_GUIDE.md` - Step-by-step migration instructions
- `tests/examples/` - Example migrated tests
- `tests/fixtures/TEST_CATEGORIES.md` - Fixture documentation

### Gradual Migration
1. New tests must use fixtures
2. Modified tests should be migrated
3. Bulk migration PRs welcome

## 6. Monitoring

### Metrics to Track
```bash
# Count tests using old patterns
./tests/lint-test-patterns.sh | grep "Warning" | wc -l

# Count migrated tests
grep -r "from.*fixtures" --include="*.test.ts*" . | wc -l

# Progress percentage
echo "scale=2; $(grep -r "from.*fixtures" --include="*.test.ts*" . | wc -l) / $(find . -name "*.test.ts*" | wc -l) * 100" | bc
```

### Monthly Review
- Review skipped test count
- Check fixture usage percentage
- Update enforcement rules as needed

## 7. Exceptions

### When to Skip Enforcement
- E2E tests (different patterns)
- Performance benchmarks
- Third-party integrations

### Documenting Exceptions
```typescript
// biome-ignore lint/style/noRestrictedImports: Legacy integration test
import { oldMockData } from './mockData'

// biome-ignore suspicious/noSkippedTests: Waiting for API update
it.skip('should handle new endpoint', () => {})
```

## Getting Help

- **Questions**: Create a discussion in the repo
- **Issues**: File a bug if enforcement is too strict
- **PRs**: Propose improvements to patterns

Remember: These rules exist to make tests more maintainable, not to slow development!