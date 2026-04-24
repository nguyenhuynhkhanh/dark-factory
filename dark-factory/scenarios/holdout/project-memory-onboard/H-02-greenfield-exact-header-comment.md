# Scenario: H-02 — Greenfield: header comment text is distinctive and consistent; shard files have no placeholder entries

## Type
edge-case

## Priority
medium — BR-9, FR-9, FR-13, EC-8. The header comment content must be consistent across all files so downstream consumers can recognize a greenfield-bootstrapped registry.

## Preconditions
- Phase 3.7 is present; greenfield fallback documented in all three sub-phases.

## Action
Structural test asserts:
1. All three sub-phases reference the SAME exact header comment template OR a close paraphrase with a distinctive stable phrase (e.g., the phrase `will accumulate as features are specced` or `memory will accumulate` — pick one and use it consistently across 3.7a, 3.7b, 3.7c).
2. Each file-specific header comment is tagged with the file's entity type (invariants / decisions / ledger) so a reader of the written file can tell what KIND of registry is empty.
3. The documentation explicitly states that the six shard files are created with ONLY YAML frontmatter — no TEMPLATE entries, no placeholder entries, no example entries of any kind.
4. The `index.md` is described as containing `## Memory Index` heading and zero entry rows on a greenfield run — no example rows.
5. The `ledger.md` is described as containing a "No features shipped yet" comment or equivalent.

## Expected Outcome
- The distinctive phrase appears in all three sub-phases.
- Each sub-phase qualifies the greenfield message with its entity type.
- Explicit prohibition on placeholder/TEMPLATE entries in shard files is documented.
- `index.md` zero-entry-rows behavior is documented.
- `ledger.md` greenfield comment is documented.

## Failure Mode (if applicable)
If the phrase varies significantly across sub-phases, test fails and highlights the diff. If TEMPLATE entries or placeholder entries are described as being written, test fails. If `index.md` greenfield behavior is absent, test fails.

## Notes
A consumer agent reading an empty `decisions-security.md` needs to distinguish "greenfield — no decisions yet" from "decisions file corrupted" from "decisions file was intentionally emptied by rejection". The header comment is the only signal. The absence of TEMPLATE placeholder entries is a deliberate design choice — it prevents onboard-agent from producing pre-seeded IDs that clash with the global ID assignment algorithm (BR-12).
