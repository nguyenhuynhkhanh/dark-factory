# Scenario: Staleness — Hash Differs by Exactly One Commit — Still Triggers Re-Review

## Type
edge-case

## Priority
medium — validates exact SHA equality; confirms there is no "close enough" staleness threshold

## Preconditions
- Manifest entry for `one-commit-ahead-spec` has `architectReviewedCodeHash`: `"aaaa"` (abbreviated for readability)
- Developer made ONE commit after the architect review (docs change — "Fix typo in README")
- Current HEAD is `"bbbb"` (one commit ahead)
- The commit contains no changes to any file touched by the spec
- df-orchestrate reads manifest before spawning implementation-agent

## Action
df-orchestrate compares `architectReviewedCodeHash` (`"aaaa"`) to current HEAD (`"bbbb"`). They differ (even though the commit was trivial).

## Expected Outcome

### Re-review triggered regardless of commit content
- df-orchestrate emits warning and triggers architect re-review
- The re-review runs even though the "relevant" files were not changed
- BR-5 is explicit: "any difference — even a single commit — triggers re-run; there is no 'close enough' threshold"

### Re-review returns APPROVED quickly (likely)
- Architect reviews the spec against the current codebase
- Nothing relevant changed → returns APPROVED (or APPROVED WITH NOTES if the docs change introduced something architecturally relevant)
- findings.md updated (same content or with minor notes)
- Manifest `architectReviewedCodeHash` updated to `"bbbb"`

### Implementation proceeds normally
- After APPROVED, implementation-agent is spawned as usual

## Notes
This scenario maps to BR-5, DEC-TBD-b.
The behavior here may seem over-eager (re-reviewing for a README typo fix), but it is correct per the spec. The alternative (file-content-based staleness) was explicitly rejected as too complex. The cost of an extra architect review pass on an unchanged spec is low (likely one fast APPROVED verdict). The cost of NOT re-reviewing when relevant files changed is a code-agent working from outdated architectural guidance.
