# Scenario: Each memory file has valid frontmatter with required keys

## Type
feature

## Priority
critical — without valid frontmatter, downstream parsers cannot determine schema version.

## Preconditions
- All eight memory files exist (see P-02).

## Action
Read each of the eight memory files. Parse the YAML frontmatter block delimited by `---` at the top of the file using the same `parseFrontmatter()` helper used in the existing test files.

## Expected Outcome
- Each file's frontmatter parses without error.
- Each file's frontmatter contains: `version` (value `1`), `lastUpdated` (non-empty string), `generatedBy` (non-empty string), `gitHash` (non-empty string).
- `index.md` frontmatter additionally contains: `entryCount` (integer, value `0` for a freshly shipped index), `shardCount` (integer, value `0` for a freshly shipped index).

## Notes
Validates FR-2, NFR-3. Uses the existing frontmatter parsing helper (no new parsing deps). The extra `entryCount` and `shardCount` fields on `index.md` are what allows consumers to validate index integrity without parsing the full body.
