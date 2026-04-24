# Scenario: Architect security reviewer loads ONLY invariants-security.md and decisions-security.md

## Type
edge-case

## Priority
critical — shard isolation is the token-efficiency guarantee; cross-loading breaks the design

## Preconditions
- `dark-factory/memory/index.md` exists with entries in all three domains:
  - `INV-0002` `[domain:security]` `[shard:invariants-security.md]`
  - `INV-0004` `[domain:architecture]` `[shard:invariants-architecture.md]`
  - `INV-0006` `[domain:api]` `[shard:invariants-api.md]`
- `dark-factory/memory/invariants-security.md` contains `INV-0002`
- `dark-factory/memory/decisions-security.md` exists
- `dark-factory/memory/invariants-architecture.md` contains `INV-0004`
- `dark-factory/memory/invariants-api.md` contains `INV-0006`
- A spec exists; implementation-agent spawns architect-agents with explicit domain parameters
- The security-domain architect-agent is spawned with `domain: security`

## Action
The security-domain architect-agent performs Step 1 Deep Review:
1. Reads `dark-factory/memory/index.md`.
2. Selects shards for the security domain only.
3. Loads `invariants-security.md` + `decisions-security.md`.
4. Does NOT attempt to load `invariants-architecture.md`, `decisions-architecture.md`, `invariants-api.md`, or `decisions-api.md`.
5. Performs the invariant/decision probe against security-domain entries only.
6. Emits `### Memory Findings (Security)` in its review file.

## Expected Outcome
- The security review file contains a `### Memory Findings (Security)` block that discusses `INV-0002`.
- The security review file does NOT reference `INV-0004` or `INV-0006` in its Memory Findings block.
- The architect-agent prompt for the security domain explicitly states it MUST NOT load other-domain shards.
- If the security reviewer's Implementation Notes or other sections happen to discuss `INV-0004` or `INV-0006` (e.g., mentioned in the spec), that is acceptable — but it must be sourced from the spec text, NOT from loading the architecture or api shards.
- Total memory reads by the security reviewer: 1 index + 2 security shards. No more.

## Failure Mode
If the security reviewer loads `invariants-architecture.md` or `invariants-api.md`:
- Token budget for that reviewer grows by up to 16,000 additional tokens — potentially doubling or tripling memory consumption.
- Architecture or API findings could bleed into the security review, creating cross-domain duplication that the synthesis step was not designed to deduplicate.
- The entire domain-isolation guarantee (BR-2, BR-3, BR-9) is violated.

## Notes
Validates FR-6, BR-2, BR-3, BR-9, INV-TBD-c, DEC-TBD-a. This is the hardest-to-detect violation of the shard-selective design — the security reviewer may load extra shards "just to be thorough" without realizing it breaks the design invariant. The prompt must contain an EXPLICIT prohibition, not just implicit guidance.
