# Scenario: H-NEW-01 — Security-domain invariant is routed to invariants-security.md, not invariants-architecture.md

## Type
edge-case

## Priority
high — FR-17. Incorrect shard routing would silently place entries in the wrong domain file, misleading consumers that load by domain.

## Preconditions
- Phase 3.7 shard routing is documented in the onboard-agent file.
- Shard routing table maps `domain: security` → `invariants-security.md`.

## Action
Structural test asserts the Phase 3.7 or write-protocol documentation:
1. Explicitly defines a routing table (or equivalent enumeration) mapping each domain value to the correct shard filename:
   - `security` → `invariants-security.md` (NOT `invariants-architecture.md` or any other file)
   - `architecture` → `invariants-architecture.md`
   - `api` → `invariants-api.md`
2. The routing is described as applied based on the candidate's `domain` field — not by the agent guessing from source path or keywords.
3. The routing is applied before writing — the `shard` field on the written entry is set to the destination filename (e.g., `shard: invariants-security.md`).
4. The documentation does NOT describe a fallback where all invariants default to a single file regardless of domain.

Then simulate (via structural assertion): if the documentation describes an invariant candidate with `domain: security`, the agent writes it to `invariants-security.md`, confirmed by the routing table.

## Expected Outcome
- Routing table or equivalent enumeration is present.
- `security → invariants-security.md` mapping is explicit and correct.
- `shard` field assignment is documented.
- No single-file fallback for all domains (other than the `architecture` fallback for UNCLASSIFIED — FR-25, which is distinct from the nominal `security` case).

## Failure Mode (if applicable)
If the routing table is absent or maps `security` to a wrong shard, test names the incorrect mapping. If no `shard` field assignment is documented, test flags it.

## Notes
This scenario specifically guards against the case where a developer implementing the routing copies from the `architecture` case and forgets to distinguish `security`. The routing table must list all three domain values explicitly — not just `architecture` as the only named case.
