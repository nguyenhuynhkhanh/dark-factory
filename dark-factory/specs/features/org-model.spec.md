# Feature: org-model

## Status
**PARKED** -- This spec documents the organizational model and resource budgeting plan for Dark Factory. It is NOT ready for implementation. It will be unparked and orchestrated AFTER the `quality-verification-tests` feature establishes a quality baseline.

## Context
Dark Factory's agent and skill definitions have grown organically to ~3,039 lines and ~39,251 instruction tokens across 8 agents and the df-orchestrate skill. A single feature pipeline consumes ~142,900 tokens (71.4% of Sonnet's 200K context window), leaving minimal room for complex codebases. The root causes are:

1. **Embedded templates** -- spec-agent, debug-agent, and onboard-agent each carry full output templates inline (~6,000 tokens combined)
2. **Monolithic orchestrator** -- df-orchestrate is 564 lines / 9,325 tokens, handling wave resolution, per-spec lifecycle, architect review, and cleanup in one file
3. **Monolithic onboarding** -- onboard-agent contains both its coordination logic and the full codemap scanner/synthesis logic (483 lines / 6,674 tokens)
4. **Duplicated instructions** -- Profile reading, codemap loading, and project context setup are repeated across 6+ agents (~500 tokens each)

This refactoring restructures the framework into a clear organizational model with token-based resource caps, reducing total token consumption by ~30% and making the pipeline viable for larger codebases.

## Scope
### In Scope (this spec)
- Phase 1: Extract output templates from spec-agent, debug-agent, and onboard-agent to `dark-factory/templates/`
- Phase 2: Extract codemap construction logic from onboard-agent to a new `codemap-agent.md`
- Phase 3: Decompose df-orchestrate into a thin coordinator + new `implementation-agent.md`
- Phase 4: Move shared context-loading instructions to `.claude/rules/dark-factory-context.md`
- Token-based caps for all agent/skill files
- Updates to `scripts/init-dark-factory.js` generator functions (dual source-of-truth)
- Updates to `tests/dark-factory-setup.test.js` for new agents and structural assertions

### Out of Scope (explicitly deferred)
- Behavioral changes to any pipeline (feature, bugfix, or orchestrate) -- this is a pure restructuring
- New pipeline features (e.g., caching, retries, new slash commands)
- Changes to information barriers or access rules -- barriers stay per-agent
- npm packaging / distribution model
- CI/CD pipeline setup
- Performance optimization of agent execution (token savings are the performance win)

### Scaling Path
If the framework grows beyond these caps, the next step is dynamic agent composition -- loading only the sections relevant to the current task. This spec's template extraction and shared-rules pattern are prerequisites for that future.

## Requirements
### Functional

- FR-1: Template files in `dark-factory/templates/` are read at runtime by agents -- agents reference template paths instead of embedding content. Rationale: eliminates ~5,900 tokens of duplicated template content across 3 agents.
- FR-2: `codemap-agent.md` handles all scanner spawning, directory partitioning, and synthesis logic currently in onboard-agent lines ~180-400. Onboard-agent spawns codemap-agent as a sub-agent. Rationale: separates coordination from execution, saves ~2,400 tokens from onboard-agent.
- FR-3: `implementation-agent.md` handles the per-spec lifecycle: architect review loop, code-agent spawning, test-agent validation, promote-agent invocation, and cleanup. df-orchestrate spawns one implementation-agent per spec in each wave. Rationale: reduces orchestrator from 9,325 to ~4,800 tokens.
- FR-4: `.claude/rules/dark-factory-context.md` contains shared instructions for reading project-profile.md and code-map data. All agents that need project context get it auto-loaded via Claude Code's rules system. Rationale: eliminates ~500 tokens per agent across 6 agents.
- FR-5: Every agent and skill file respects its token cap (see Resource Budgets below). Rationale: prevents organic growth from recreating the problem.
- FR-6: Information barrier declarations remain in each individual agent file, NOT in shared rules. Rationale: barriers must be in the spawned agent's direct context to be effective -- shared rules may not be loaded in sub-agent spawns.
- FR-7: The init script (`scripts/init-dark-factory.js`) is updated to generate all new files (templates, new agents, shared rules) for target projects. Rationale: dual source-of-truth requirement from project profile.
- FR-8: All existing tests continue to pass after refactoring. New tests are added for new agents and structural assertions. Rationale: zero-regression guarantee.

### Non-Functional

- NFR-1: Total framework token count drops from ~39,251 to under ~27,000 tokens (target: 30% reduction). Rationale: frees ~12,000 tokens of context window per agent spawn.
- NFR-2: No pipeline behavior changes are observable to the developer. Same commands, same outputs, same flow. Rationale: this is a refactoring, not a feature change.
- NFR-3: Each phase is independently deployable and testable. Phase N does not depend on Phase N+1 being complete. Rationale: reduces blast radius and allows incremental validation.

## Data Model
No database or persistent data changes. All changes are to markdown files (agent definitions, skill definitions, rules) and the JavaScript init script.

### New Files

| File | Type | Purpose |
|------|------|---------|
| `dark-factory/templates/spec-template.md` | Template | Feature spec output template (extracted from spec-agent) |
| `dark-factory/templates/debug-report-template.md` | Template | Debug report output template (extracted from debug-agent) |
| `dark-factory/templates/project-profile-template.md` | Template | Profile output template (extracted from onboard-agent) |
| `.claude/agents/codemap-agent.md` | Agent | Codemap construction: scanner spawning + synthesis |
| `.claude/agents/implementation-agent.md` | Agent | Per-spec lifecycle: architect review + code + holdout + promote + cleanup |
| `.claude/rules/dark-factory-context.md` | Rule | Shared project context loading instructions |

### Modified Files

| File | Change |
|------|--------|
| `.claude/agents/spec-agent.md` | Remove inline template, add template file reference |
| `.claude/agents/debug-agent.md` | Remove inline template, add template file reference |
| `.claude/agents/onboard-agent.md` | Remove codemap logic + inline template, add sub-agent spawn + template reference |
| `.claude/skills/df-orchestrate/SKILL.md` | Remove per-spec lifecycle, add implementation-agent spawning |
| `.claude/agents/architect-agent.md` | Remove duplicated context-loading instructions |
| `.claude/agents/code-agent.md` | Remove duplicated context-loading instructions |
| `.claude/agents/test-agent.md` | Remove duplicated context-loading instructions |
| `.claude/agents/promote-agent.md` | Remove duplicated context-loading instructions |
| `tests/dark-factory-setup.test.js` | Add tests for new agents, templates, shared rules, token cap assertions |

## Migration & Deployment

This is an internal framework refactoring with no external consumers, no database, no cache, and no API contracts. However, the dual source-of-truth pattern (`.md` files + init script generators) creates a migration concern:

- **Init script sync**: Every new file and every modified file must have its corresponding generator function updated in `init-dark-factory.js`. The init script must generate the new `dark-factory/templates/` directory and all template files for target projects.
- **Existing target projects**: Projects that have already run `init-dark-factory.js` will have the old agent content. Re-running `node scripts/init-dark-factory.js --dir <path>` must update them. The init script is already designed to overwrite, so no special migration logic is needed.
- **Rollback plan**: Each phase is a separate commit. Reverting a phase means reverting its commit. Since there are no data stores or runtime state, rollback is a clean `git revert`.
- **Deployment order**: Phases must deploy in order (1 -> 2 -> 3 -> 4) because later phases may depend on patterns established by earlier ones. Within a phase, all file changes deploy atomically (single commit).
- **Stale data/cache**: N/A -- no caches. Agent files are read fresh on every spawn.

## Resource Budgets (Token Caps)

These caps are derived from measured current sizes and target reductions:

| Role | File | Current Tokens | Cap (tokens) | Cap (lines) |
|------|------|---------------|-------------|-------------|
| Coordinator | df-orchestrate/SKILL.md | 9,325 | 5,000 | ~300 |
| Heavy agent | onboard-agent.md | 6,674 | 4,000 | ~250 |
| Heavy agent | spec-agent.md | 5,124 | 4,000 | ~250 |
| Medium agent | debug-agent.md | 3,622 | 3,000 | ~200 |
| Medium agent | architect-agent.md | 3,778 | 3,000 | ~200 |
| Light agent | test-agent.md | 1,767 | 2,000 | ~130 |
| Light agent | promote-agent.md | 1,558 | 2,000 | ~130 |
| Light agent | code-agent.md | 1,498 | 2,000 | ~130 |
| New agent | codemap-agent.md | N/A | 3,000 | ~200 |
| New agent | implementation-agent.md | N/A | 4,000 | ~250 |
| Shared rule | dark-factory-context.md | N/A | 500 | ~35 |

## Organizational Model

```
CTO (developer)
|-- VP Engineering (df-orchestrate -- thin coordinator, <=5,000 tokens)
|   +-- Wave Agent (per wave, spawns:)
|       |-- Architect Review Team (3 domain agents)
|       |-- Implementation Agent (per-spec lifecycle, <=4,000 tokens)
|       |   |-- Code Agents (1-4 parallel, <=2,000 tokens each)
|       |   |-- Test Agent (<=2,000 tokens)
|       |   +-- Promote Agent (<=2,000 tokens)
|       +-- Reports results to coordinator
|-- VP Product (df-intake)
|   +-- 3 Spec Leads (parallel perspectives, <=4,000 tokens each)
|-- VP Ops (df-debug)
|   +-- 3 Investigators (parallel angles, <=3,000 tokens each)
+-- Infrastructure (df-onboard, <=4,000 tokens)
    |-- Codemap Agent (scanner spawning + synthesis, <=3,000 tokens)
    +-- Scanner Agents (N, one per directory)
```

## Business Rules

- BR-1: Token caps are enforced by test assertions, not runtime checks. The test suite measures token count (approximated as `Math.ceil(content.length / 4)`) and fails if any file exceeds its cap. Rationale: caps are a development-time constraint, not a runtime one.
- BR-2: Templates are loaded by file path reference, not by content embedding. Agent instructions say "Read the template at `dark-factory/templates/spec-template.md`" rather than containing the template inline. Rationale: this is the mechanism that saves tokens.
- BR-3: Information barriers MUST NOT be moved to shared rules. Each agent's "NEVER read/access" declarations stay in its own `.md` file. Rationale: shared rules may not be loaded in all agent spawn contexts; barriers must be guaranteed-present.
- BR-4: Each phase produces a single atomic commit. All file changes within a phase ship together. Rationale: enables clean per-phase rollback.
- BR-5: No behavioral changes to pipeline flows. The developer experience (commands, outputs, error messages) must be identical before and after. Rationale: this is a refactoring, not a feature.
- BR-6: The df-orchestrate coordinator MUST NOT contain per-spec lifecycle logic after Phase 3. It handles only: argument parsing, manifest querying, wave resolution, implementation-agent spawning, and status reporting. Rationale: single responsibility.
- BR-7: The codemap-agent MUST handle all scanner spawning and synthesis. The onboard-agent after Phase 2 only handles: profile template loading, codemap-agent spawning, profile writing. Rationale: single responsibility.

## Error Handling

| Scenario | Response | Side Effects |
|----------|----------|--------------|
| Template file not found at runtime | Agent reports error, suggests re-running init script | None -- no partial execution |
| codemap-agent spawn fails | onboard-agent reports failure, does not write partial profile | None |
| implementation-agent spawn fails | df-orchestrate marks spec as failed in manifest, continues other specs | Manifest updated |
| Token cap exceeded (test time) | Test fails with message showing current vs cap | None -- blocks merge |
| Init script run on project with old agents | Overwrites old agent files with new structure | Old agent content replaced |
| Shared rule file missing | Agents proceed without shared context (degraded but functional) | Warning logged |

## Acceptance Criteria

- [ ] AC-1: All 3 template files exist in `dark-factory/templates/` and contain the extracted templates
- [ ] AC-2: spec-agent, debug-agent, and onboard-agent reference templates by path, do not embed them
- [ ] AC-3: `codemap-agent.md` exists with valid frontmatter and contains scanner/synthesis logic
- [ ] AC-4: `implementation-agent.md` exists with valid frontmatter and contains per-spec lifecycle logic
- [ ] AC-5: df-orchestrate/SKILL.md no longer contains per-spec lifecycle logic
- [ ] AC-6: `.claude/rules/dark-factory-context.md` exists and contains shared context instructions
- [ ] AC-7: No agent file exceeds its token cap (verified by test assertions)
- [ ] AC-8: All existing tests pass (zero regressions)
- [ ] AC-9: New tests cover: new agent frontmatter, template existence, token cap enforcement, barrier preservation
- [ ] AC-10: Information barriers remain in individual agent files (tested)
- [ ] AC-11: Pipeline behavior is identical -- same commands produce same outcomes
- [ ] AC-12: Init script generates all new files for target projects

## Edge Cases

- EC-1: Agent spawned in a context where `dark-factory/templates/` does not exist (target project not initialized) -- agent should fail gracefully with a clear message, not crash or produce partial output
- EC-2: Token cap test run against agent that uses template references (cap applies to the agent file itself, NOT agent + template combined) -- the cap measures the agent's instruction footprint, templates are loaded separately
- EC-3: `.claude/rules/` auto-loading behavior differs between Claude Code versions -- agents must function correctly even if shared rules are not auto-loaded (degraded mode)
- EC-4: Concurrent implementation of multiple phases -- phases MUST be sequential (1->2->3->4) because later phases depend on structural assumptions from earlier ones
- EC-5: Init script run mid-refactoring (e.g., Phase 2 complete but Phase 3 not started) -- init script always generates the final state, so partial intermediate states only exist in the development repo, not target projects
- EC-6: Existing target project has customized agent files -- init script overwrites unconditionally, which is existing behavior and is documented

## Dependencies

- **BLOCKED on**: `quality-verification-tests` -- a quality baseline test suite must exist BEFORE this refactoring begins, so we can verify zero behavioral regression
- **Depends on**: None (once quality-verification-tests is complete)
- **Depended on by**: Any future token optimization or dynamic agent composition work

### Cross-Feature Impact

This feature modifies nearly every agent and skill file in the framework. However, because it is a structural refactoring with no behavioral changes:

- **Shared resources affected**: All `.claude/agents/*.md` files, `.claude/skills/df-orchestrate/SKILL.md`, `tests/dark-factory-setup.test.js`
- **Other consumers**: The init script consumes all agent/skill content to generate target project files
- **Risk**: If any agent's instructions are accidentally truncated or reworded during extraction, pipeline behavior could change subtly. The quality-verification-tests blocker exists specifically to catch this.

## Implementation Size Estimate

- **Scope size**: x-large (10+ files across 4 phases)
- **Suggested decomposition**: 4 sub-specs, one per phase, implemented sequentially

| Sub-spec | Files | Parallel tracks |
|----------|-------|----------------|
| Phase 1: Extract templates | 7 files (3 templates + 3 agents + 1 test) | 1 code-agent |
| Phase 2: Codemap agent | 4 files (1 new agent + 1 modified agent + 1 init script + 1 test) | 1 code-agent |
| Phase 3: Decompose orchestrator | 4 files (1 new agent + 1 modified skill + 1 init script + 1 test) | 1 code-agent |
| Phase 4: Shared rules | 8+ files (1 new rule + 6 modified agents + 1 init script + 1 test) | 1 code-agent |

Each phase is 1 code-agent because the changes are tightly coupled within each phase (same files being read/modified together).

## Implementation Notes

- **Dual source-of-truth**: Every `.md` file change must be mirrored in `scripts/init-dark-factory.js`. The init script uses template literal functions to generate agent content. Search for function names like `getSpecAgentContent()`, `getOnboardAgentContent()`, etc.
- **Test pattern**: The test file `tests/dark-factory-setup.test.js` uses string matching (`content.includes('phrase')`) to verify agent behavior. New tests should follow this pattern. Token cap tests should use the approximation `Math.ceil(Buffer.byteLength(content, 'utf8') / 4)` or similar.
- **Frontmatter convention**: New agents must have `name` matching filename (without `.md`), `description`, and `tools` fields. Tests enforce this.
- **Template loading pattern**: Agents should use a phrase like "Read the file at `dark-factory/templates/{name}.md` and use it as your output template" -- this is an instruction to the LLM, not a code import.
- **Rules auto-loading**: Files in `.claude/rules/` are automatically loaded by Claude Code for the host context. However, when spawning sub-agents via `Task`, the rules directory of the spawning context is used. Verify that spawned agents receive the shared rules.
