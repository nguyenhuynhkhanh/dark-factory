# Scenario: Decomposed Specs — Wave-Ordered Architect Reviews (Dependency-Aware)

## Type
feature

## Priority
high — decomposed specs are common for large features; incorrect ordering can result in reviewing a spec against an unapproved foundation

## Preconditions
- df-intake has completed Steps 1–5.5 for a decomposed feature with 3 sub-specs:
  - `large-feature-data` — no dependencies (foundation spec)
  - `large-feature-api` — depends on: `large-feature-data`
  - `large-feature-ui` — no dependencies (independent of both)
- All three spec files and scenario sets exist on disk
- No manifest entries yet (Step 5.6 runs before Step 6)

## Action
df-intake proceeds to Step 5.6 for the decomposed feature set. It reads the `dependencies` field from each sub-spec to determine review order.

## Expected Outcome

### Wave 1: Independent sub-specs reviewed in parallel
- `large-feature-data` and `large-feature-ui` architect reviews are spawned simultaneously (parallel Agent tool calls)
- They run at the same time; neither waits for the other

### Wave 2: Dependent sub-spec waits for its dependency
- `large-feature-api` architect review does NOT start until `large-feature-data` is APPROVED
- `large-feature-api` begins its architect review only after `large-feature-data` findings.md is written and manifest entry is created (or architect review result confirmed)

### APPROVED outcomes for each sub-spec
For each APPROVED sub-spec, in order:
- `{sub-spec-name}.findings.md` is written
- Manifest entry created with `architectReviewedAt`, `findingsPath`, `architectReviewedCodeHash`

### Order constraint preserved
- `large-feature-api` review references the approved state of `large-feature-data`
- The architect reviewing `large-feature-api` has the correct context (the foundation is settled)

### What does NOT happen
- `large-feature-api` does NOT begin review before `large-feature-data` is APPROVED
- `large-feature-ui` does NOT wait for `large-feature-api` (no dependency relationship)

## Failure Mode
If `large-feature-data` architect review is BLOCKED (max rounds exhausted):
- `large-feature-api` review is NOT started (dependency unresolved)
- `large-feature-ui` review completes normally (no dependency on blocked spec)
- Developer is informed which sub-specs completed and which are blocked

## Notes
This scenario maps to AC-12, FR-10, BR-6, EC-5.
The wave ordering for architect reviews mirrors the wave ordering used by df-orchestrate for implementation-agent spawning. The dependency graph is the same; only the phase (architect review vs. code-agent spawn) differs.
