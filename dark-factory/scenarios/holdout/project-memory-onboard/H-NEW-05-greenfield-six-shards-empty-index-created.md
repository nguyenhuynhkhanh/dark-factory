# Scenario: H-NEW-05 — Greenfield: exactly 6 shard files with only YAML frontmatter, zero entry rows in index

## Type
edge-case

## Priority
high — EC-8, FR-13, FR-17b. The exact file count and content structure on greenfield must be documented so structural tests can assert it precisely.

## Preconditions
- Phase 3.7 greenfield handling is documented.
- Phase 7 Memory Sign-Off or Bootstrap Write Exception section documents greenfield file creation.

## Action
Structural test asserts the greenfield bootstrap documentation states:
1. Exactly **six** domain shard files are created:
   - `invariants-security.md`
   - `invariants-architecture.md`
   - `invariants-api.md`
   - `decisions-security.md`
   - `decisions-architecture.md`
   - `decisions-api.md`
2. Each shard file is created with **only YAML frontmatter** — no entry rows, no TEMPLATE placeholder entries, no example content.
3. `ledger.md` is created with frontmatter and a "No features shipped yet" comment (or equivalent single-line explanatory comment).
4. `index.md` is created with YAML frontmatter and exactly `## Memory Index` as a heading, with **zero entry rows** below it.
5. All eight files include a header comment explaining entries will accumulate as features are specced and promoted.
6. The total file count on greenfield is **eight** (six shards + ledger.md + index.md).

## Expected Outcome
- All six shard file names enumerated in the documentation.
- "Only YAML frontmatter" (or equivalent) language for shard files.
- `ledger.md` greenfield comment documented.
- `index.md` zero-entry-rows creation documented.
- Header comment requirement documented.
- Eight-file total implied by the documentation.

## Failure Mode (if applicable)
If any shard file name is missing from the enumeration, test names it. If TEMPLATE or placeholder entries are described, test fails. If `index.md` greenfield behavior is absent, test fails. If the file count diverges from eight, test flags it.

## Notes
This scenario is the counterpart to P-10 (structural assertion that greenfield is documented) but verifies the precision of the documentation — exact file names, exact file count, and the critical "only YAML frontmatter" requirement. The `index.md` heading `## Memory Index` is a stable marker that consumers and tests can assert when checking for a greenfield bootstrap.
