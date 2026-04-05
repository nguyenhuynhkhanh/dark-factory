# Scenario: Tests contain no network calls, file writes, or randomness sources

## Type
edge-case

## Priority
high — any side effect makes tests non-deterministic or unsafe to run

## Preconditions
- `tests/dark-factory-contracts.test.js` exists

## Action
Read the entire test file and search for:
1. Network calls: `http`, `https`, `fetch`, `request`, `axios`, `net.`
2. File writes: `writeFileSync`, `writeFile`, `appendFile`, `createWriteStream`, `fs.write`
3. Randomness: `Math.random`, `crypto.random`, `Date.now()` used in assertions
4. Process execution: `execSync`, `exec`, `spawn`, `fork`
5. Timers: `setTimeout`, `setInterval`

## Expected Outcome
- Zero occurrences of network call patterns
- Zero occurrences of file write patterns
- Zero occurrences of randomness sources
- Zero occurrences of process execution calls
- Zero occurrences of timer usage
- The only `fs` operations are `readFileSync` and `existsSync`
- The only `path` operations are `join` and `resolve`

## Notes
This validates FR-7 (deterministic) at the implementation level. The test file should be pure: it reads files and makes assertions, nothing more.
