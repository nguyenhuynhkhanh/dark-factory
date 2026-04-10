## Domain Review: Architecture & Performance

### Feature: codemap-pipeline
### Status: APPROVED WITH NOTES

### Findings

**Blockers**: None.

**Concerns**:

- **Dual-source-of-truth enforcement**: The spec correctly identifies that every change must be made in BOTH the `.md` agent/skill files AND the corresponding generator functions in `scripts/init-dark-factory.js`. This is the highest-risk implementation concern. The spec even calls it out explicitly in the Implementation Notes. However, the spec does not define a mechanism to prevent drift after this feature is merged. The test suite's "Plugin mirrors" tests already have 4 pre-existing failures caused by exactly this drift. **Concern (not blocker)**: the code-agent must update `init-dark-factory.js` for every `.md` file it changes, and the tests must verify it. The spec's existing pre-existing test failures need to be addressed as part of this implementation (they are the clearest signal of drift).

- **Track A → Track B sequencing**: The spec correctly states that Track A (codemap-agent.md interface) must complete before Track B (skills) can be finalized because the skills invoke codemap-agent. The recommended execution is "Track A + Track C in parallel, then Track B." This is sound. No concern with the execution plan itself.

- **Fan-in cap at 20 modules**: Reasonable for single-developer tooling. The spec explicitly notes this can be raised later. The cap prevents unbounded scan on hotspot changes. The cap is applied at the skill level (truncate fan-in set before passing to codemap-agent) — this is the correct place to enforce it.

- **Synchronous pre-phase**: The spec mandates the refresh hook completes before agents are spawned (NFR-1). This is correct — spawning agents on a stale map would undermine the entire feature. The performance cost of the pre-phase is bounded: hash comparison + optionally one git diff + one codemap-agent invocation for ≤20 files. Acceptable.

- **Self-referential fan-in computation**: The fan-in lookup uses the existing map's Module Dependency Graph, not a fresh codebase grep (BR-4). This is clever and efficient. Risk: if the map itself had incomplete fan-in data (e.g., from a partial coverage flag), the incremental refresh will also have incomplete fan-in. This is acceptable — the map header will show `COVERAGE: PARTIAL` which signals downstream agents. The risk does not compound silently.

- **Balanced search policy consistency**: NFR-3 requires identical wording across all 9 agents and 3 skills. The spec provides the exact canonical text. This is the right approach — variable wording leads to inconsistent agent behavior. The code-agent must use verbatim copy-paste for this phrase.

**Suggestions**:

- The 9 agents include `implementation-agent.md` (added in the org-model phase). The spec's agent list in FR-6 mentions "all 7 agents" but the Implementation Size Estimate Track C lists 6 agents (spec, architect, code, debug, test, promote). `implementation-agent.md` is not in the list. This is potentially a gap — if implementation-agent does codebase exploration, it should also receive the balanced search policy. **Clarify during implementation** whether implementation-agent needs the update. Low risk since implementation-agent's job is to orchestrate (not explore the codebase directly).

- EC-7 (deleted file removed from map) is mentioned in the spec but the incremental refresh algorithm description doesn't explicitly call out how deletions are handled. The code-agent should ensure deletion detection is part of the codemap-agent's refresh mode.

### Key Decisions

- **Synchronous pre-phase is mandatory**: Agents must not begin on a stale map. The performance cost is acceptable.
- **Fan-in cap at 20 modules**: Correct bound for current scale.
- **Track execution order**: Track A + Track C in parallel, then Track B — sound dependency management.
- **Dual-source updates are mandatory**: Every `.md` change must be mirrored in `init-dark-factory.js`.
