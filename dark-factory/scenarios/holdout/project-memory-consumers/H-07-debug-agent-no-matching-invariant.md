# Scenario: debug-agent produces clean report (no invariant note) when root cause has no matching invariant

## Type
edge-case

## Priority
medium — negative case for the cross-reference

## Preconditions
- `dark-factory/memory/index.md` exists
- Memory contains 10 active invariants in the architecture domain, none of which match the root cause of the bug under investigation
- Bug: A typo in a string literal ("lgoin" instead of "login") causes a redirect loop — the module under investigation is `src/ui/redirect.js`
- debug-agent is spawned

## Action
debug-agent performs Phase 2 (memory load) and Phase 3 (root cause analysis).

## Expected Outcome
- debug-agent reads `dark-factory/memory/index.md` first.
- debug-agent identifies from the index that `src/ui/redirect.js` maps to the architecture domain.
- debug-agent loads `dark-factory/memory/invariants-architecture.md`.
- Phase 3 identifies the root cause: typo in redirect URL.
- debug-agent checks the root cause against each active architecture-domain invariant — no match.
- The debug report does NOT include an invariant note in the Root Cause section (the one-liner from FR-14 is OMITTED when there is no match).
- Report template structure is normal — no placeholder "no invariant match found" note either.
- Normal fix approach is proposed.

## Notes
Validates FR-14 in the negative case. The cross-reference is additive; absent a match, nothing is added. This prevents noise in routine bug reports. The shard-selective load (only architecture shard) applies even in the no-match case — the debug-agent does not broaden its load just because no match was found.
