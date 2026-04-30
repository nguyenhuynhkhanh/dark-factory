# Scenario: Information Barrier Preserved — Spec-Agent Revision During Step 5.6 BLOCKED Does Not Receive Test Content

## Type
edge-case

## Priority
high — information barriers are tested assertions; any breach in the revised spawn path would fail existing barrier tests

## Preconditions
- df-intake has completed Steps 1–5.5 for `barrier-spec`
- Step 5.5 test-advisor handoff produced advisory output (feasibility notes, scenario revision suggestions)
- Holdout scenarios exist in `dark-factory/scenarios/holdout/barrier-spec/`
- Public scenarios exist in `dark-factory/scenarios/public/barrier-spec/`
- df-intake Step 5.6 runs, architect returns BLOCKED: "The data integrity section does not address concurrent writes — add a locking strategy."

## Action
df-intake spawns spec-agent for inline revision. df-intake must decide what context to pass to spec-agent.

## Expected Outcome

### spec-agent receives ONLY spec-relevant content
- spec-agent receives: the spec file path, the architect's blocking reason, the spec file content
- spec-agent does NOT receive: holdout scenario content, test-advisor advisory output, public scenario content (as inline context)

### Architect does NOT see test-advisor output
- When df-intake re-runs Step 5.6 (round 2), it passes the revised spec to architect-agent
- architect-agent does NOT receive: test-advisor advisory, scenario files, scenario dedup notes
- This is identical to the existing information barrier for architect-agent in implementation-agent

### Scenario files are NOT modified by spec revision
- spec-agent's revision during Step 5.6 updates ONLY `barrier-spec.spec.md`
- Scenario files in `dark-factory/scenarios/public/barrier-spec/` and `dark-factory/scenarios/holdout/barrier-spec/` remain unchanged
- (Scenario revision happens at Step 5, not Step 5.6)

### Barrier assertions still pass
- The existing test assertions in `dark-factory-setup.test.js` for information barriers ("NEVER pass holdout scenario content to code-agent", "NEVER pass test/scenario content to architect-agent") apply to this path as well
- The spec-agent spawned at Step 5.6 is the same spec-agent covered by existing barrier tests

## Notes
This scenario maps to FR-3 (spec-agent revision) and the information barrier cross-cutting concern.
This scenario is specifically about the path where spec-agent is spawned by df-intake at Step 5.6 (a new spawn context that did not exist before this feature). The existing barriers must hold in this new context, not just in the old implementation-agent context.
