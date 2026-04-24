# Scenario: ledger.md ships with valid frontmatter, append-only note, and zero entries

## Type
feature

## Priority
high — ledger is append-only (BR-2); the note must be visible and the file must ship with no entries.

## Preconditions
- `dark-factory/memory/ledger.md` exists with valid frontmatter (see P-03).

## Action
Read `dark-factory/memory/ledger.md` and inspect:
(a) the YAML frontmatter for required keys,
(b) the body for an append-only note,
(c) the presence or absence of any `## FEAT-` heading.

## Expected Outcome
- The file's frontmatter parses without error and contains `version`, `lastUpdated`, `generatedBy`, `gitHash`.
- The file body contains a prominent append-only note using language such as "append-only", "never modify existing entries", or "do not edit past entries", visible near the top of the file.
- Zero `## FEAT-NNNN:` entry headings are present (the ledger ships empty).
- Zero `## FEAT-TEMPLATE:` headings are present (no placeholder entries).

## Notes
Validates FR-7, BR-2. The ledger ships empty — no TEMPLATE entry. The append-only note is the behavioral documentation for contributors. Replaces the old P-06 which required a FEAT-TEMPLATE entry.
