# Scenario: No external dependencies and no modification of existing test file

## Type
edge-case

## Priority
critical — modifying the existing test file risks breaking the current 113+ tests

## Preconditions
- `tests/dark-factory-setup.test.js` exists with current content
- `tests/dark-factory-contracts.test.js` is created by this feature

## Action
1. Read `tests/dark-factory-contracts.test.js` and check all `require()` calls
2. Verify `tests/dark-factory-setup.test.js` is unmodified (compare against git HEAD)

## Expected Outcome
- The new file only requires: `node:test`, `node:assert/strict`, `fs`, `path` — all Node.js built-in modules
- No `require()` calls reference npm packages, URLs, or non-standard modules
- No `require()` calls reference `dark-factory-setup.test.js`
- `tests/dark-factory-setup.test.js` has zero diff against git HEAD (completely unmodified)
- The new file does not use `child_process` (the existing file uses it, but the new file should not need it)

## Notes
This is a hard constraint. The contract test file must be a standalone, self-contained unit.
