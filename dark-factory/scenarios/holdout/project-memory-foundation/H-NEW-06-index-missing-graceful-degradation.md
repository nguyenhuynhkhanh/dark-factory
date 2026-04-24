# Scenario: Index missing — agents warn and proceed without consulting shard files

## Type
failure-recovery

## Priority
critical — agents must tolerate a missing index without crashing. This is the backward-compatibility guarantee for all existing Dark Factory projects.

## Preconditions
- `.claude/rules/dark-factory-context.md` exists with the memory update applied.
- Simulated state: `dark-factory/memory/` directory is absent OR `dark-factory/memory/index.md` is absent (shard files may or may not exist).

## Action
Read the rule file and verify its handling of a missing index is documented. Then verify two sub-cases:

Sub-case A — index.md missing, directory exists, shard files exist:
Simulate this state (e.g., in a temp directory or by inspection of the rule prose). Confirm the rule instructs agents to:
1. Detect the missing index.
2. Emit a warning ("memory: not-yet-onboarded" or equivalent).
3. Proceed with no memory context — do NOT fall back to reading individual shard files.

Sub-case B — entire `dark-factory/memory/` directory missing:
Simulate or confirm the rule handles this the same way as a missing index: warn and proceed.

## Expected Outcome
- The rule file explicitly states that a missing `index.md` is treated as "not yet onboarded" — warn and proceed.
- The rule does NOT instruct agents to fall back to reading individual shard files when the index is absent.
- Agents that follow this rule emit a warning and proceed normally with the rest of their task.
- No `/df-*` command is blocked by the absence of memory.
- The behavior is identical for (A) missing index file and (B) missing directory: warn and proceed.

## Notes
Validates EC-1, EC-12, FR-15, BR-5. EC-12 specifically covers the partial-install case (shards exist, index missing) — the key requirement is that agents do NOT try to scan shard files when the index is absent. The index is the authoritative source; without it, memory is effectively unavailable. This matches the established pattern for `project-profile.md`.
