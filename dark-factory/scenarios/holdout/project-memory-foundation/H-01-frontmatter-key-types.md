# Scenario: Frontmatter key types and values validate strictly across all eight memory files

## Type
edge-case

## Priority
high — string-vs-number confusion in frontmatter would break downstream parsing.

## Preconditions
- All eight memory files exist with frontmatter.

## Action
Parse each memory file's frontmatter. Check the TYPE and value constraints of each required key:
- `version` MUST equal `1` (number or string `"1"` acceptable — parseFrontmatter returns strings).
- `lastUpdated` MUST be a non-empty string; format should look like an ISO date (matches `/^\d{4}-\d{2}-\d{2}/`).
- `generatedBy` MUST be a non-empty string from a known enum-ish set: `promote-agent`, `onboard-agent`, or `bootstrap` (skeletons ship with `bootstrap` since promote-agent hasn't touched them yet).
- `gitHash` MUST be a non-empty string (7 to 40 hex chars, or the literal token `TBD` for skeletons).

For `index.md` additionally check:
- `entryCount` MUST be a non-negative integer (value `0` for a freshly shipped index).
- `shardCount` MUST be a non-negative integer (value `0` for a freshly shipped index).

## Expected Outcome
- All eight files satisfy the base constraints above.
- `index.md` also satisfies the `entryCount` and `shardCount` constraints.
- If any file uses a different `generatedBy` value, it is flagged.
- `entryCount` on `index.md` matches the actual number of `## ` heading rows in the body (zero for a fresh install).

## Notes
Validates FR-2, FR-4 at the value level. Public scenario P-03 only checks presence; this tightens the contract to value types and cross-field consistency.
