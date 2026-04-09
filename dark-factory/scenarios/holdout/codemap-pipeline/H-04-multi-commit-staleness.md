# Scenario: H-04 — Multi-Commit Staleness — Diff Uses Stored Hash, Not Last Commit

## Type
edge-case

## Priority
high — if the diff is computed from HEAD~1 instead of the stored hash, commits between the last map generation and HEAD~1 are silently skipped, leaving stale module entries

## Preconditions
- `dark-factory/code-map.md` was last built at commit `hashBase` (3 commits ago)
- Map header: `> Git hash: hashBase`
- Since `hashBase`, the repo has received 3 commits in order:
  - Commit 1 (`hash1`): modified `.claude/agents/architect-agent.md`
  - Commit 2 (`hash2`): modified `.claude/skills/df-intake/SKILL.md`
  - Commit 3 (`hash3` = current HEAD): modified `README.md` only
- `git rev-parse HEAD` returns `hash3`
- `hashBase != hash3` → refresh is needed

## Action
Pre-phase runs the diff:
1. `git diff --name-only hashBase hash3`

The CORRECT result of this command:
```
.claude/agents/architect-agent.md
.claude/skills/df-intake/SKILL.md
README.md
```

An INCORRECT implementation might run:
```
git diff --name-only HEAD~1 HEAD
```
Which would only return: `README.md` (the last commit only — not the full range since hashBase)

## Expected Outcome (correct implementation)
- The diff command uses `hashBase` (the stored map hash) as the base, NOT `HEAD~1`
- Changed file set: `[.claude/agents/architect-agent.md, .claude/skills/df-intake/SKILL.md, README.md]`
- Fan-in set computed for each source file
- `.claude/agents/architect-agent.md` and `.claude/skills/df-intake/SKILL.md` are included in the re-scan set
- `README.md` is not in any module entry — hash updated, no re-scan for it
- After refresh: map entries for architect-agent.md and df-intake/SKILL.md are current
- Hash updated to `hash3`

## Expected Outcome (incorrect implementation — must fail this scenario)
- Only `README.md` is in the changed set
- Neither `architect-agent.md` nor `df-intake/SKILL.md` is re-scanned
- Their map entries remain stale (reflecting `hashBase` state, not `hash3` state)
- Agents using the map get incorrect dependency information for those files

## Failure Mode (if applicable)
Silent correctness failure: the pipeline runs successfully, but agents downstream receive stale map data for files changed in commits 1 and 2. This is the hardest class of bug to detect because everything appears to work.

## Notes
This is the most important holdout scenario. It tests BR-3 directly: the diff MUST use the stored hash as the base, covering all changes since the last map generation. A naive implementation using `HEAD~1` would pass all public scenarios (since public scenarios only involve single-commit diffs) but fail silently here.

BR-3 coverage.
