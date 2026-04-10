## Architect Review: codemap-pipeline

### Rounds: 1 (parallel domain review)

### Status: APPROVED WITH NOTES

All three domains returned APPROVED WITH NOTES. No blockers found. The strictest-wins rule yields APPROVED WITH NOTES overall.

---

### Key Decisions Made

1. **Synchronous pre-phase is mandatory**: The hash comparison + optional incremental refresh MUST complete before any agents are spawned. Agents must not begin on a stale map (NFR-1). The performance cost (hash comparison + git diff + ≤20-file rescan) is acceptable for single-developer tooling.

2. **Dual-source-of-truth updates are mandatory for every file change**: Every change to a `.md` agent or skill file MUST also be mirrored in the corresponding generator function in `scripts/init-dark-factory.js`. This is the highest implementation risk in the entire feature. The test suite already has 4 pre-existing "Plugin mirrors" failures from prior drift — this implementation must resolve those failures as part of the work.

3. **Balanced search policy must use verbatim canonical text across all agents and skills**: NFR-3 requires identical wording. The exact canonical text is defined in the spec's Implementation Notes. Copy-paste only — no paraphrasing. This applies to all 9 agents + 3 skills.

4. **Codemap-agent invocation mode must be explicit**: The codemap-agent must distinguish "called from onboard-agent (requires developer sign-off)" vs "called from pre-pipeline hook (no sign-off, write immediately)." This distinction must be implemented as a clear invocation parameter passed by the calling skill.

5. **Fan-in cap at 20 modules**: Applied at the skill level before passing the set to codemap-agent. Correct enforcement point.

6. **Map header parsing must be robust**: The skills must parse `> Git hash:` and `> Coverage:` lines with trimmed string matching. If no hash line is found, treat as hash-mismatch (trigger full rescan).

7. **Track execution order**: Track A (codemap-agent.md) + Track C (agent prompt updates) in parallel, then Track B (skills) after Track A completes. Skills depend on codemap-agent's interface being stable.

---

### Remaining Notes

- **Hash validation before shell interpolation** (security): The stored hash read from the map should be validated as a 40-character hex string (`/^[0-9a-f]{40}$/`) before being interpolated into the `git diff --name-only` command. This prevents malicious map content from causing command injection. Given the single-developer threat model this is not a blocker, but the implementation should include this guard.

- **implementation-agent.md** (architecture): The spec's FR-6 says "all 9 agents" but Track C only lists 6 agents (spec, architect, code, debug, test, promote). The 9th agent (implementation-agent) is not explicitly included in Track C. During implementation, explicitly verify whether implementation-agent performs codebase exploration and, if so, apply the balanced search policy to it as well.

- **Deletion handling in incremental refresh** (architecture): EC-7 covers deleted files, but the incremental refresh algorithm description doesn't explicitly address deletion. The codemap-agent refresh mode should include: "if a changed file no longer exists on disk, remove its map entry rather than re-scanning it."

- **Pre-existing test failures** (architecture): The 4 pre-existing "Plugin mirrors" test failures in the test suite are caused by drift between `.md` files and `init-dark-factory.js`. This implementation must fix those failures as a side effect of keeping the dual sources in sync.

- **Codemap-agent's own balanced search policy**: The codemap-agent by design reads the entire codebase (it IS the scanner). The balanced search policy ("do not use Grep for discovery") is not applicable to codemap-agent itself — it should continue using Glob/Grep for scanning. Do not apply the policy to codemap-agent in a way that breaks its scanning behavior.
