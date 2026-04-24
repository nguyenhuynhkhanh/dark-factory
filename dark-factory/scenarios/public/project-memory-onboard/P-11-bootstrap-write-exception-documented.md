# Scenario: P-11 — Bootstrap Write Exception is a dedicated, labeled section referencing shards and index

## Type
feature

## Priority
critical — FR-18, BR-6. Without a dedicated section, future edits will gradually erode the single-writer invariant.

## Preconditions
- onboard-agent file has been updated for this feature.

## Action
Structural test asserts:
1. The file contains a section with a heading matching `Bootstrap Write Exception` (case-sensitive; H2 or H3 level — `##` or `###`).
2. The section body documents four points:
   a. Onboard-agent is the only non-promote writer to `dark-factory/memory/`.
   b. The exception is narrowly scoped to onboard time (no specs in flight → single-writer trivially preserved).
   c. On re-run, onboard-agent must NOT overwrite existing entries — only propose diffs.
   d. The exception covers the six domain shard files (`invariants-security.md`, `invariants-architecture.md`, `invariants-api.md`, `decisions-security.md`, `decisions-architecture.md`, `decisions-api.md`), `ledger.md`, AND `index.md` — eight files total.
3. The section is positioned between Phase 7 Sign-Off and Phase 7.5 Git Hook Setup (based on heading byte offsets).

## Expected Outcome
- All four body points present.
- Heading is present and correctly positioned.
- At least one shard file name (e.g., `invariants-security.md`) is named explicitly in the section.
- `index.md` is explicitly named in the section.
- No reference to the monolithic `invariants.md` or `decisions.md` as write targets.
- Mirror file has the same section.

## Failure Mode (if applicable)
If the section is missing, or any of the four body points is absent, or the section is in the wrong position, test names the defect. If only monolithic file names appear and no shard names appear, test fails.

## Notes
This is a documentation-only gate but is critical because it pins the exception architecturally. D2 ("only promote-agent writes memory") is relaxed ONLY here. The section must enumerate all eight write targets — six shards, ledger.md, index.md — because the single-writer invariant applies to all of them, not just the shards.
