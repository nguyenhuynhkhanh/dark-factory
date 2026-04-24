# Scenario: code-agent uses index to identify relevant domain, loads only the matching shard

## Type
edge-case

## Priority
high — validates that index is actually used as a routing layer, not just loaded and ignored

## Preconditions
- `dark-factory/memory/index.md` exists with:
  - `INV-0011` `[domain:security]` `[shard:invariants-security.md]` — scope includes `src/auth/tokens.js`
  - `INV-0020` `[domain:architecture]` `[shard:invariants-architecture.md]` — scope includes `src/reporting/`
- `dark-factory/memory/invariants-security.md` contains `INV-0011`
- `dark-factory/memory/invariants-architecture.md` contains `INV-0020`
- A spec tasks code-agent with modifying ONLY `src/auth/tokens.js` (security domain) — no reporting modules are touched
- code-agent is spawned

## Action
code-agent performs Phase 1:
1. Reads `dark-factory/memory/index.md`.
2. Identifies that `src/auth/tokens.js` overlaps with `INV-0011` in the security domain.
3. Identifies that `src/reporting/` is NOT in scope for this implementation.
4. Loads `invariants-security.md` (and `decisions-security.md` if it exists).
5. Does NOT load `invariants-architecture.md` (no overlap with modified files).
6. Treats `INV-0011` as a hard constraint on the implementation.

## Expected Outcome
- code-agent reads only `invariants-security.md` (+ decisions-security.md) during Phase 1 — NOT `invariants-architecture.md`.
- `INV-0011` is recognized as a hard constraint: the rule "tokens must be signed with the production secret; never use static strings for JWT secrets" applies.
- `INV-0020` is NOT evaluated as a constraint (its shard was not loaded; its scope does not overlap).
- The implementation does not hardcode a JWT secret string.
- The index serves as the routing decision — the code-agent does NOT make constraint decisions based solely on the index summary line; it reads the full entry from the shard for `INV-0011` before applying the constraint (BR-10).
- If code-agent were asked to also modify `src/reporting/report.js`, it would load `invariants-architecture.md` as well — but in this scenario it is not, so it correctly skips that shard.

## Failure Mode
If code-agent loads all shards regardless of index data, the token efficiency of the design is defeated — the index becomes a meaningless overhead rather than a routing mechanism. If code-agent makes constraint decisions from the index summary line alone (without reading the shard), it violates BR-10 and may misapply or miss a constraint.

## Notes
Validates FR-10, FR-11, BR-10, EC-9, DEC-TBD-b. The two failure modes (load-all-shards and index-only-decision) are distinct bugs with different consequences. Both must be caught by the prompt design.
