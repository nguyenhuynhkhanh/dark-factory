# Scenario: Test file exists and uses correct framework

## Type
feature

## Priority
critical — the test file must exist and be runnable before any individual test matters

## Preconditions
- Project root contains `tests/` directory
- Node.js test runner is available

## Action
Run `node --test tests/dark-factory-contracts.test.js`

## Expected Outcome
- File exists at `tests/dark-factory-contracts.test.js`
- File uses `require("node:test")` for `describe` and `it`
- File uses `require("node:assert/strict")` for assertions
- File uses `require("fs")` and `require("path")` for file operations
- No external dependencies are imported
- File does NOT import from or modify `tests/dark-factory-setup.test.js`
- All tests pass with exit code 0

## Notes
The test file must be completely independent of the existing structural test file. Helper functions should be defined locally.
