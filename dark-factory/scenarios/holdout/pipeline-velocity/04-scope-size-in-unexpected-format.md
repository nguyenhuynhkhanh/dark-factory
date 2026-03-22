# Scenario: Implementation Size Estimate section exists but uses unexpected format

## Type
edge-case

## Priority
high -- robustness against real-world spec variation

## Preconditions
- A feature spec has an Implementation Size Estimate section but the format varies from expected:
  - Case A: "Scope size: Small" (capitalized, not lowercase)
  - Case B: "Size: medium" (different field name)
  - Case C: "Scope size: 3 files" (file count instead of tier name)
  - Case D: Section exists but is empty (no content under the header)

## Action
Run `/df-orchestrate test-feature` for each case.

## Expected Outcome
- Case A: Case-insensitive matching resolves "Small" to `small` tier. Review is skipped (if no high-risk patterns).
- Case B: The orchestrator cannot find a recognized scope size. Falls through to the safe default (full review).
- Case C: The orchestrator cannot parse "3 files" as a valid tier. Falls through to the safe default.
- Case D: The section header exists but no content. Treated the same as missing estimate -- full review.
- In all fallback cases, the developer is warned about the unrecognized format.
- The manifest records `scopeSize: null` for unrecognized formats.

## Failure Mode (if applicable)
If the orchestrator crashes on unexpected format instead of falling through to the safe default, the entire pipeline halts on a formatting issue.

## Notes
The orchestrator should be lenient in parsing but strict in defaulting. Any unrecognized format triggers the safe default, never a lower tier.
