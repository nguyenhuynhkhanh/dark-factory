# Scenario: Review iteration cap is enforced at 3 passes

## Type
edge-case

## Priority
high -- prevents infinite review loops

## Preconditions
- A large-scope feature went through parallel domain review (pass 1)
- Pass 1 resulted in BLOCKED -- spec-agent updated the spec
- Verification round (pass 2) found new blockers introduced by the spec changes
- Spec-agent updated the spec again

## Action
The orchestrator starts pass 3 (final verification).

## Expected Outcome
- Pass 3 runs normally
- If pass 3 returns APPROVED: proceed to implementation
- If pass 3 still returns BLOCKED: the orchestrator stops and reports to the developer
  - The report includes all unresolved blockers from the final pass
  - The synthesized review file is written with BLOCKED status
  - The orchestrator does NOT attempt a pass 4
  - The developer must manually resolve the remaining issues and re-run orchestration

## Failure Mode (if applicable)
If the pass counter is not properly maintained across follow-up rounds, the orchestrator could loop indefinitely between architect review and spec updates.

## Notes
The 3-pass cap is counted as: initial parallel review (1) + up to 2 follow-ups (2, 3). The counter must persist across the orchestrator's follow-up spawns.
