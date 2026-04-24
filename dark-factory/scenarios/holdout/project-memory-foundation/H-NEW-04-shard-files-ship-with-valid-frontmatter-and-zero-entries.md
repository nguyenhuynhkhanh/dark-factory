# Scenario: All six shard files ship with valid frontmatter and precisely zero entries — no TEMPLATE, no TBD entries

## Type
edge-case

## Priority
critical — shard files are the write targets for real memory entries. Any content shipped in them (TEMPLATE, partial entry, invalid frontmatter) would corrupt the starting state for all downstream sub-specs.

## Preconditions
- All six shard files exist.

## Action
For each of the six shard files:
1. Read the file.
2. Parse YAML frontmatter — expect success with no errors.
3. Verify frontmatter contains all required keys: `version`, `lastUpdated`, `generatedBy`, `gitHash`.
4. Verify frontmatter does NOT contain `entryCount` or `shardCount` (those are index-only fields).
5. Read the body after the closing `---`. Scan for ANY heading (line starting with `## `).
6. Scan for the substring `TEMPLATE` anywhere in the body.
7. Scan for any line matching `^## (INV|DEC)-TBD-` (TBD placeholder entries).

## Expected Outcome
- All six files parse frontmatter successfully.
- All six files have zero `## ` heading lines in their body.
- No body line contains `TEMPLATE`.
- No body line matches the TBD placeholder heading pattern.
- No file has `entryCount` or `shardCount` in its frontmatter (those are index-only).
- The body after closing `---` is either completely empty or contains only whitespace.

## Notes
Validates FR-6, BR-6, EC-3, DEC-TBD-h. This is the strictest check for the "ships empty" contract. It verifies not just zero entries but also the absence of any heading-like content that could be misinterpreted as an entry.
