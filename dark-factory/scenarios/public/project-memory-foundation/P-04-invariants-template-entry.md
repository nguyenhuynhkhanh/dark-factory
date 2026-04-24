# Scenario: Shard files ship with valid frontmatter and zero entries

## Type
feature

## Priority
high — shard files must be parseable (valid frontmatter) but contain no entries on initial ship.

## Preconditions
- All six shard files exist (see P-02).

## Action
For each of the six shard files (`invariants-security.md`, `invariants-architecture.md`, `invariants-api.md`, `decisions-security.md`, `decisions-architecture.md`, `decisions-api.md`):
1. Read the file.
2. Parse the YAML frontmatter.
3. Count lines that start with `## ` (second-level headings — entry markers).

## Expected Outcome
- Each file's frontmatter parses without error and contains `version`, `lastUpdated`, `generatedBy`, `gitHash`.
- Each file contains zero second-level headings (no entries, no TEMPLATE headings, no placeholder headings).
- The file body after the closing `---` frontmatter delimiter is either empty or contains only whitespace/blank lines.

## Notes
Validates FR-6, BR-6. Shard files ship empty by design (DEC-TBD-h). The schema reference lives in `dark-factory/templates/project-memory-template.md`, not in placeholder entries in the shard files. This replaces the old P-04 which checked for a TEMPLATE entry — that pattern is eliminated.
