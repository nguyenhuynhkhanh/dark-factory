# Scenario: P-01 — Hash Match — No Refresh Triggered

## Type
feature

## Priority
critical — this is the hot path executed on every pipeline invocation; incorrect behavior here would add latency or re-scan unnecessarily on every single run

## Preconditions
- `dark-factory/code-map.md` exists
- The map header contains: `> Git hash: abc1234567890abcdef1234567890abcdef123456`
- `git rev-parse HEAD` on the repo returns: `abc1234567890abcdef1234567890abcdef123456` (same hash)
- `dark-factory/code-map.md` Coverage line reads: `> Coverage: FULL`
- The developer runs `/df-intake some feature description`

## Action
The df-intake skill executes its Step 0 pre-phase:
1. Read the `Git hash:` line from `dark-factory/code-map.md` header
2. Run `git rev-parse HEAD`
3. Compare the two values

## Expected Outcome
- The hashes match exactly (full 40-character SHA-1 comparison)
- NO codemap-agent is spawned
- NO `git diff` is run
- The skill proceeds immediately to Step 1 (spawn spec leads)
- The map file is NOT modified
- The spec leads receive the existing, unmodified `dark-factory/code-map.md` as their structural reference
- Total overhead of the pre-phase: 2 operations (read map header + run git command)

## Failure Mode (if applicable)
If the hash comparison performs a substring match instead of exact match, a hash prefix collision could incorrectly suppress a needed refresh. The comparison must be exact, full-length string equality.

## Notes
This scenario applies identically to `/df-debug` and `/df-orchestrate` — the same pre-phase logic runs in all three skills. Testing it in df-intake is sufficient to validate the logic; the other skills use the same implementation.
