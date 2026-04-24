# Scenario: code-map-slim.md carries the same Git hash as code-map.md

## Type
feature

## Priority
critical — hash parity is the staleness signal. A slim file with a different (or missing) hash is invisible to existing freshness checks.

## Preconditions
- Both `dark-factory/code-map.md` and `dark-factory/code-map-slim.md` exist on disk.

## Action
Read both files. Extract the `Git hash:` header line from each.

## Expected Outcome
- Both files contain a line matching `> Git hash: {sha}`.
- The SHA value is identical in both files.
- The format is identical (same prefix, same hash length).

## Notes
Validates FR-8, BR-3. This is a runtime assertion against the generated files — run after codemap-agent has been executed. The hash parity claim is also verified at the agent-definition level in P-06.
