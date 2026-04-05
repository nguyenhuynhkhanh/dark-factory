# Scenario: Contract tests do not duplicate existing structural tests

## Type
edge-case

## Priority
medium — duplication makes the test suite harder to maintain

## Preconditions
- `tests/dark-factory-contracts.test.js` exists
- `tests/dark-factory-setup.test.js` exists

## Action
Compare the two test files at a logical level:
1. Read both test files
2. Contract tests should NOT test: frontmatter validity, file existence (as primary assertion), individual agent behavior phrases, CLAUDE.md completeness
3. Contract tests SHOULD test: path/format consistency BETWEEN two files, section header agreement between producer and consumer, barrier enforcement on both sides of a handoff

## Expected Outcome
- No contract test duplicates an existing structural test's assertion
- Contract tests always involve reading TWO or more files and asserting consistency between them
- The only exception: file existence checks used as precondition guards before the actual contract assertion (e.g., `assert.ok(fs.existsSync(path))` before reading the file)
- Contract tests do not check frontmatter fields (that is structural testing)
- Contract tests do not check that individual required phrases exist in a single file (that is structural testing)

## Notes
This validates BR-4. The contract tests have a distinct purpose: verifying handoff interface consistency, not agent content correctness.
