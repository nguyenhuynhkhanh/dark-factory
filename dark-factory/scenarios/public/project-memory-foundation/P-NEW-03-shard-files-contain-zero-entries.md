# Scenario: Shard files contain zero entries on initial ship

## Type
feature

## Priority
high — shard files ship empty by design. An entry in a freshly-installed shard would mean the implementation accidentally wrote content.

## Preconditions
- All six shard files exist with valid frontmatter (see P-NEW-02).

## Action
For each shard file, read the file body (everything after the closing `---` frontmatter delimiter) and count:
1. Lines starting with `## ` (entry headings).
2. Lines containing the word `TEMPLATE`.

## Expected Outcome
- Every shard file has exactly zero `## ` heading lines in its body.
- No shard file body contains the word `TEMPLATE`.
- The file body is either completely empty or contains only whitespace/blank lines.

## Notes
Validates FR-6, BR-6, DEC-TBD-h. Zero entries is the correct initial state. The schema reference lives exclusively in `dark-factory/templates/project-memory-template.md`.
