# Scenario: H-NEW-04 — Unknown domain candidate defaults to architecture shard and is flagged UNCLASSIFIED

## Type
edge-case

## Priority
high — FR-25, EC-21. An unhandled unknown domain would crash the shard routing or silently drop the entry.

## Preconditions
- Phase 3.7 or Phase 7 sign-off documents unknown domain handling.

## Action
Structural test asserts the shard routing documentation:
1. Explicitly states what happens when a candidate's `domain` value is not one of `security | architecture | api`.
2. The fallback is: route to the `architecture` shard (`invariants-architecture.md` or `decisions-architecture.md`).
3. The candidate is flagged as `[UNCLASSIFIED DOMAIN]` in the sign-off display, alongside the proposed (default) domain value, so the developer can correct it before accepting.
4. The documentation states the developer CAN edit the domain during sign-off to a valid value, after which normal domain routing applies.
5. The documentation does NOT say unclassified candidates are silently dropped or rejected without being presented.

## Expected Outcome
- Unknown domain fallback (→ architecture) is explicitly documented.
- `[UNCLASSIFIED DOMAIN]` flag text (or equivalent) is named in the documentation.
- Developer can correct the domain during sign-off.
- Unclassified candidates are presented (not silently dropped).

## Failure Mode (if applicable)
If the unknown domain handling is absent from the documentation, test fails. If the fallback is to a shard other than `architecture`, test flags the incorrect default. If unclassified candidates are described as silently rejected, test fails — they must be surfaced for developer review.

## Notes
The `architecture` default is chosen to be consistent with the consumers spec rule for unclassified entries (agents loading memory default to the architecture shard for unclassified lookups). The `[UNCLASSIFIED DOMAIN]` flag in the sign-off display is the mechanism for surfacing this to the developer without crashing the flow. A developer may supply a custom domain string (e.g., `compliance`) that onboard-agent does not recognize — this scenario covers that case.
