# Scenario: ledger.md prominently communicates append-only semantics and ships with zero entries

## Type
edge-case

## Priority
high — ledger is append-only (BR-2). If that constraint is not obvious in the file itself, a future contributor will edit an existing entry and quietly damage the ledger.

## Preconditions
- `dark-factory/memory/ledger.md` exists.

## Action
Read `ledger.md` and inspect the body.

1. Check the top prose section (before any `## FEAT-` entry) for an append-only note.
2. Count any `## FEAT-NNNN:` headings in the file.
3. Check for any `## FEAT-TEMPLATE:` heading.

## Expected Outcome
- The file contains explicit language communicating the append-only rule. Acceptable phrasings include (but are not limited to):
  - "append-only"
  - "never modify existing entries"
  - "do not edit past entries"
  - "entries once written are frozen"
- The language appears near the top of the file (within the first 20 lines) so a reader sees it immediately.
- The language is specific enough that a contributor cannot miss it — NOT buried inside a bullet or comment.
- Zero `## FEAT-NNNN:` entry headings are present (ledger ships empty).
- Zero `## FEAT-TEMPLATE:` headings are present (no placeholder entries — shard files and ledger ship empty by design).

## Notes
Validates FR-7, BR-2, BR-6. This is a documentation-as-contract test: the rule must be visible, not just implied. The "zero entries" assertion is new compared to the original H-11, reflecting that the ledger now ships empty rather than with a FEAT-TEMPLATE placeholder.
