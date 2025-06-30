# Claude Memory

## Project Context
This is a Polkadot web migration tool built with Next.js, TypeScript, and Vitest for testing. The codebase uses pnpm as the package manager and has comprehensive test coverage requirements.

## Important Instructions

### Package Manager
- **ALWAYS use pnpm** - never use npm
- All commands should use pnpm (e.g., `pnpm test`, `pnpm lint`, `pnpm build`)

### Testing Requirements
- Keep ALL tests passing at the end of each phase - no broken CI allowed
- Run tests after changes to ensure nothing breaks
- 100% test pass rate is mandatory before proceeding to next tasks

### Linting Strategy
- **ALWAYS fix errors before warnings** when addressing linting issues
- Errors are marked with × symbols and should be prioritized
- Warnings are marked with ! symbols and can be addressed after errors
- Use `pnpm lint` to see issues, `pnpm lint:fix` for auto-fixes
- **FREQUENTLY check the linter when writing tests or new code** to avoid technical debt
- Run `pnpm lint` after writing any new code to catch issues early
- Never let linting errors accumulate - fix them immediately

### Coverage Strategy
- Exclude untestable files from coverage before adding new tests
- Focus on 0% coverage files first for maximum impact
- Use vitest.config.ts coverage.exclude patterns
- Target critical business logic files

### Code Quality
- Never use forEach in tests - use for...of loops instead
- Add proper assertions before non-null assertions in tests
- Remove unused parameters in mock functions
- Fix accessibility issues in test mocks

## Current Status
- Test coverage baseline: ~64% after exclusions
- All 66 tests passing (46 fixed from failing state)
- Focus areas: lib/account.ts, error management system, remaining 0% coverage files