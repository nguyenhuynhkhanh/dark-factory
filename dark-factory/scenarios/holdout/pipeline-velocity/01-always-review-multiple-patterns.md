# Scenario: Spec matching multiple always-review patterns still gets medium (not double-elevated)

## Type
edge-case

## Priority
medium -- ensures elevation is capped, not cumulative

## Preconditions
- A feature spec exists with scope size `small` and estimated file count 2
- The spec's affected files mention both `auth middleware` AND `database migration`
- Both are always-review patterns

## Action
Run `/df-orchestrate test-feature`

## Expected Outcome
- The always-review check matches on both `auth` and `migration`
- The scope is elevated to `medium` (single-round review) -- NOT to `large`
- Multiple pattern matches do not stack to force parallel review
- The manifest shows `reviewMode: "single-round"`
- Exactly one architect-agent is spawned

## Failure Mode (if applicable)
If the implementation naively counts pattern matches and uses count > 1 to elevate to large, small specs with multiple risk patterns would get unnecessarily heavy review.

## Notes
The always-review patterns set a floor of `medium`. They do not further elevate to `large` regardless of how many patterns match. Only the developer override or the spec's own scope estimate can trigger `large/x-large`.
