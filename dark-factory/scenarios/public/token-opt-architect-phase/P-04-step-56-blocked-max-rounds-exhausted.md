# Scenario: Step 5.6 BLOCKED — Max Rounds Exhausted — No Manifest Entry, Spec Stays on Disk

## Type
feature

## Priority
critical — the no-manifest-entry contract is load-bearing for the migration story and BR-4

## Preconditions
- df-intake has completed Steps 1–5.5 for spec `contested-feature`
- `dark-factory/specs/features/contested-feature.spec.md` exists
- No manifest entry, no findings.md
- Architect review is about to run

## Action

**Rounds 1–5:** Each round, the architect returns BLOCKED. The spec-agent revises each time. After revision, architect reviews again and re-blocks (different concern emerges or the fundamental approach is rejected).

After Round 5 (the configured maximum), the architect still returns BLOCKED.

## Expected Outcome

### No manifest entry written
- `dark-factory/manifest.json` does NOT gain an entry for `contested-feature`
- Manifest file is unchanged from its pre-intake state

### Spec file preserved
- `dark-factory/specs/features/contested-feature.spec.md` remains on disk
- The spec reflects the last revision made before round 5 exhaustion
- Developer can read, modify, and re-submit it

### No findings.md written
- `dark-factory/specs/features/contested-feature.findings.md` does NOT exist (BLOCKED verdict never triggers findings.md write)

### Developer-facing output
- df-intake surfaces the blocker to the developer with:
  - Which architect domain(s) blocked
  - The round count (5 of 5 rounds exhausted)
  - The specific blocking reason from the last round
  - Instruction: "Review the spec at `dark-factory/specs/features/contested-feature.spec.md`, address the concerns, and re-run `/df-intake contested-feature` to resume"

### Resume path
- Running `/df-intake contested-feature` subsequently detects the existing spec file
- Skips Steps 1–5 (investigation + scenario writing)
- Proceeds directly to Step 5.6 architect review on the existing spec

## Notes
This scenario maps to AC-5, FR-4, BR-4.
The key invariant: max-rounds-exhausted is NOT a failure that pollutes the manifest. The spec stays draft. The developer's work (scenario files, spec content) is preserved. This is different from implementation-agent's BLOCKED path which does write a manifest entry before blocking.
