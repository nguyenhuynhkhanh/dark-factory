# Scenario: Spec that was previously reviewed as large is re-run after estimate is lowered to medium

## Type
edge-case

## Priority
medium -- validates interaction between cached reviews and scope changes

## Preconditions
- A feature spec was originally estimated as `large` and received full parallel review (APPROVED)
- Domain review files exist: `test-feature.review-security.md`, `test-feature.review-architecture.md`, `test-feature.review-api.md`
- Synthesized review exists: `test-feature.review.md` with APPROVED status
- The developer updated the spec and changed the estimate to `medium`
- The developer runs orchestration again

## Action
Run `/df-orchestrate test-feature`

## Expected Outcome
- The orchestrator detects the existing APPROVED review file
- Since the review status is APPROVED, the orchestrator skips re-review (cached approval)
- The orchestrator reads findings from the existing synthesized review and forwards to code-agent
- The scope change from large to medium does NOT trigger re-review
- The domain review files from the previous run are not deleted or modified

## Failure Mode (if applicable)
If the orchestrator re-evaluates scope on every run and tries to reconcile "medium scope but existing parallel review files", it could enter an inconsistent state or unnecessarily re-run review.

## Notes
The cached review check happens BEFORE scope evaluation. If a valid APPROVED review exists, scope evaluation is skipped entirely for review purposes (though scope is still recorded in the manifest).
