# Feature: codemap-pipeline

## Context

Every Dark Factory pipeline agent currently begins by exploring the codebase from scratch — grepping for modules, globbing for files, reading directories to understand how code is connected. This is redundant, slow, and inconsistent. Two agents investigating the same feature may each spend 15-20 tool calls re-discovering what the other already mapped. Worse, one agent's exploration may miss edges that another's found, leading to disagreements about blast radius or missing cross-feature impact.

`dark-factory/code-map.md` exists but is optional infrastructure — agents are told "if it exists, read these sections." There is no guarantee it exists, no guarantee it is current, and no consistent policy for how to use it vs. direct file search.

This feature makes the code map a first-class, always-current pipeline dependency. Every pipeline invocation checks whether the map is current before spawning any agents. If not current, it is refreshed incrementally before agents are spawned. All agent prompts are updated to treat the map as authoritative for structural discovery — and to reserve direct file reads for precision work on specific known targets.

## Scope

### In Scope (this spec)

- Git-hash-based incremental refresh algorithm: compare stored hash to HEAD before each pipeline invocation; trigger targeted re-scan only for changed files + their fan-in set
- Pre-pipeline refresh hook added to `df-intake/SKILL.md`, `df-debug/SKILL.md`, and `df-orchestrate/SKILL.md`
- Incremental refresh logic added to `codemap-agent.md` (algorithm, fan-in cap, failure behavior, partial-result handling)
- Removal of first-time developer sign-off requirement for auto-refresh (sign-off is only required in the explicit `/df-onboard` context)
- Balanced search policy: updated agent prompts in all 7 agents (`spec-agent`, `architect-agent`, `code-agent`, `debug-agent`, `test-agent`, `promote-agent`, `codemap-agent`) and 3 skills (`df-intake`, `df-debug`, `df-orchestrate`)
- Greenfield/empty repo guard: skip map generation, agents proceed without map
- Scanner failure guard: partial results used with coverage flag in map header

### Out of Scope (explicitly deferred)

- Full map rebuild triggered by the developer manually (that remains `/df-onboard`)
- Mermaid diagram incremental refresh (diagram is for human visualization only; no agent reads it)
- Per-branch code maps (one map per repo, on current branch)
- Map versioning or history beyond the stored git hash
- Concurrent pipeline invocations writing the map simultaneously (not a concern at current scale — Dark Factory is single-developer tooling)
- Fan-in set computation via static analysis beyond import-statement scanning (dynamic requires/DI are already flagged as "runtime-only" in the existing map format)

### Scaling Path

The refresh hook is simple string comparison + git command today. If Dark Factory ever runs in a CI environment with multiple simultaneous pipelines, a lock file (`code-map.lock`) can be added around the refresh check-and-write without changing any other agent. The fan-in cap (20 modules) can be raised or replaced with a smarter heuristic if the project profile indicates a very large codebase.

## Requirements

### Functional

- FR-1: Before spawning any agents, `df-intake`, `df-debug`, and `df-orchestrate` MUST check whether `dark-factory/code-map.md` exists and whether its stored git hash matches `git rev-parse HEAD`. — Ensures agents always receive a current map.
- FR-2: If the map does not exist, trigger full map generation via codemap-agent (no developer sign-off required). — First-run experience is automatic; map is infrastructure.
- FR-3: If the map exists but the hash differs, run `git diff --name-only {stored-hash} HEAD` to get the set of changed files, then re-scan those files plus every module that imports any of them (fan-in set). Merge results into the existing map and update the stored hash. — Incremental refresh is cheaper than full rebuild for small changes.
- FR-4: The fan-in re-scan MUST be capped at 20 modules. If the fan-in set exceeds 20 modules, flag the map header with `COVERAGE: PARTIAL — fan-in set truncated at 20 modules`. — Prevents unbounded re-scan on hot-spot changes.
- FR-5: If the codemap-agent scanner fails during incremental refresh, write partial results into the map and flag the header with `COVERAGE: PARTIAL — scanner failure during refresh`. Downstream agents receive the map with the coverage warning and use it with that caveat. — Failure does not block the pipeline.
- FR-6: All 9 agents and 3 skills MUST use the balanced search policy: read code-map.md for structural orientation (which modules, blast radius, entry points, hotspots); use Read/Grep only for precise implementation details on specific files the map has already identified as relevant. — Eliminates redundant codebase exploration.
- FR-7: If the repo is greenfield (no source files), skip map generation entirely and allow agents to proceed without a map. — Avoids spurious generation for empty projects.
- FR-8: If a changed file is not part of any existing module in the map, add it as a standalone file entry in the updated map. — No changed file is silently dropped.

### Non-Functional

- NFR-1: The pre-pipeline refresh check (hash comparison + git diff) MUST complete before agents are spawned — it is a synchronous pre-phase, not a background task. — Agents must not begin on a stale map.
- NFR-2: The refresh MUST NOT require developer interaction except in the explicit `/df-onboard` context. — Auto-refresh is invisible infrastructure.
- NFR-3: The updated agent prompt language for balanced search MUST be consistent across all 9 agents and 3 skills — same wording, same policy, no per-agent variation. — Inconsistent prompts cause inconsistent behavior.

## Data Model

The code map is a markdown file. The only schema change is adding a structured header line storing the git commit hash:

```
# Code Map
> Auto-generated by Dark Factory codemap-agent. Last analyzed: {ISO date}
> Git hash: {full 40-character SHA-1 commit hash}
> Coverage: FULL | PARTIAL — {reason if partial}
```

The `Git hash:` line is new. The `Coverage:` line already exists implicitly (scanners can fail) but is now formalized as a header field with defined values.

No other data model changes. No database, no config files, no environment variables.

## Migration & Deployment

The only "existing data" affected is `dark-factory/code-map.md` if it already exists on disk.

- **Existing map without `Git hash:` header**: on first pipeline invocation after this feature is deployed, the pre-pipeline hook reads the map header, finds no hash, treats it as hash-mismatch (no stored hash = always stale), and triggers a full re-scan. The result is written with the new header format including the current hash. No manual intervention required.
- **Rollback plan**: if this feature is reverted, the `Git hash:` header line is ignored by the old code (which only reads section content). The map remains valid. No rollback migration needed.
- **Zero-downtime**: yes. There is no server. Dark Factory is a CLI framework — changes take effect immediately on next invocation.
- **Deployment order**: single atomic change. No multi-step deployment.
- **Stale data**: N/A — there is no cache layer. The code map is read from disk on every invocation.

## API Endpoints

Not applicable. Dark Factory has no HTTP API — it is a prompt engineering framework operating through Claude Code's agent and skill system.

## Business Rules

- BR-1: Auto-refresh NEVER requires developer sign-off. Sign-off is ONLY required during explicit `/df-onboard` invocations (full map generation from scratch initiated by the developer). — Keeps the pipeline invisible.
- BR-2: Map is always treated as authoritative for structural discovery (which modules exist, how they connect). Direct file search (Grep/Glob) is only for precision detail retrieval on specific known targets. — Enforces the two-layer search policy.
- BR-3: The stored hash in the map header is the hash of the commit when the map was last built, NOT the current HEAD. On refresh, the diff is `git diff --name-only {stored-hash} HEAD`. — Correctly captures all changes since last map generation, not just the last commit.
- BR-4: Fan-in set computation: for each changed file, scan the existing map's Module Dependency Graph section for all modules that list the changed file as an import. This is a map-internal lookup, not a fresh codebase grep. — Uses the map to refresh itself (self-referential but correct for incremental updates).
- BR-5: A changed file with no fan-in (nothing imports it) is still re-scanned as a standalone entry. Fan-in set of zero is valid. — Leaf-node files must still be updated.
- BR-6: If `git rev-parse HEAD` fails (not a git repo, detached HEAD with no commits), skip map refresh and log a warning. Agents proceed with whatever map state exists. — Defensive against unusual git states.

## Error Handling

| Scenario | Response | Side Effects |
|----------|----------|--------------|
| Map does not exist | Trigger full codemap-agent run (no sign-off) | Map created, hash stored, pipeline proceeds |
| Map exists, hash matches | No action | Pipeline proceeds immediately |
| Map exists, hash differs | Run incremental refresh (git diff + fan-in re-scan) | Map updated, hash updated, pipeline proceeds |
| Fan-in set > 20 modules | Re-scan first 20 only | Map header flagged `COVERAGE: PARTIAL — fan-in set truncated at 20 modules` |
| Scanner failure during refresh | Write partial results | Map header flagged `COVERAGE: PARTIAL — scanner failure during refresh`; pipeline proceeds with caveat |
| Greenfield repo (no source files) | Skip map generation | No code-map.md created; agents proceed without map |
| `git rev-parse HEAD` fails | Log warning, skip refresh | Pipeline proceeds with existing map (or no map) |
| Changed file not in any module | Add as standalone file entry | Map updated, no flag |

## Acceptance Criteria

- [ ] AC-1: Running `/df-intake`, `/df-debug`, or `/df-orchestrate` on a repo with a current map (hash matches HEAD) proceeds without triggering any codemap-agent activity.
- [ ] AC-2: Running any pipeline command after a new commit has been pushed triggers incremental refresh before agents are spawned.
- [ ] AC-3: After incremental refresh, the map header contains the new HEAD hash.
- [ ] AC-4: All agent prompts (9 agents) and all skill prompts (3 skills) contain the balanced search policy instruction: use map for discovery, Read/Grep only for precision on known targets.
- [ ] AC-5: First-time pipeline invocation (no map) automatically generates the map without prompting the developer.
- [ ] AC-6: A fan-in re-scan that would exceed 20 modules is truncated and flagged in the map header.
- [ ] AC-7: A scanner failure during refresh produces a partial map with the coverage flag — not a pipeline abort.
- [ ] AC-8: Greenfield repos (no source files) skip map generation and allow the pipeline to proceed.

## Edge Cases

- EC-1: Map header has no `Git hash:` line (map pre-dates this feature) — treated as hash-mismatch, triggers full re-scan, writes new header. — Ensures smooth migration of existing maps.
- EC-2: `git diff --name-only` returns an empty list (commits changed only non-source files like `.gitignore`, `README.md`) — no modules to re-scan. Update the stored hash only. — Avoids unnecessary re-scan for documentation-only commits.
- EC-3: All changed files are in the fan-in set of a single hotspot module — that hotspot plus all its fan-in modules are re-scanned. Fan-in cap applies. — Hotspot changes are the most expensive case; the cap protects against explosion.
- EC-4: Changed file is a Dark Factory instruction file (`.claude/agents/`, `.claude/skills/`) — re-scan it and update the map entry for that file. The same re-scan logic applies regardless of file type. — Dark Factory files are included in the map by design (from codemap-agent's existing inclusion rule).
- EC-5: Multiple pipeline invocations happen sequentially (not concurrently) on the same repo in rapid succession — each invocation independently checks the hash. Second invocation finds hash matches (refresh just happened) and proceeds immediately. — Correct behavior, no double-refresh.
- EC-6: The stored hash in the map refers to a commit that has been garbage-collected or is not in the current branch's history — `git diff` fails. Treat as full refresh needed; run codemap-agent. — Defensive against rebases or force-pushes.
- EC-7: Scanner returns results for 0 files in the changed set (e.g., the changed file was deleted) — update the map to remove the deleted module entry and update the hash. — Deletions must be reflected in the map.

## Dependencies

None. This spec is standalone — it modifies existing files only (agents + skills). No other active spec depends on these files.

- **Depends on**: None — independently implementable.
- **Depended on by**: None currently active.
- **Group**: null (standalone feature)

## Implementation Size Estimate

- **Scope size**: large (8-10 files changed — 6 agents + 3 skills, with codemap-agent getting the most significant changes)
- **Estimated file count**: 9 files (codemap-agent.md, spec-agent.md, architect-agent.md, code-agent.md, debug-agent.md, test-agent.md, promote-agent.md, df-intake/SKILL.md, df-debug/SKILL.md, df-orchestrate/SKILL.md — 10 files total but df-orchestrate may be minimal)

**Suggested parallel tracks (ZERO file overlap between tracks):**

Track A — Codemap Agent Refresh Logic:
- `codemap-agent.md` — add incremental refresh algorithm, hash header format, fan-in cap, partial failure flag, first-time auto-generation (no sign-off)

Track B — Skill Pre-Phase (Pipeline Entry Points):
- `df-intake/SKILL.md` — add pre-phase: check/refresh code map before spawning leads; update lead prompts to "always read" policy
- `df-debug/SKILL.md` — same pre-phase + updated investigator prompts
- `df-orchestrate/SKILL.md` — same pre-phase before implementation-agent spawning

Track C — Agent Prompt Updates (Balanced Search Policy):
- `spec-agent.md` — update map reading instruction from conditional to always
- `architect-agent.md` — same
- `code-agent.md` — same
- `debug-agent.md` — same
- `test-agent.md` — same
- `promote-agent.md` — same

Track A must complete before Track B can be finalized (skills call codemap-agent, so the agent's interface must be stable). Track C is fully independent of both A and B.

Recommended execution: Track A + Track C in parallel, then Track B after Track A completes.

## Implementation Notes

**What changes in each file:**

`codemap-agent.md`:
- Add a new section before "Step 1: Partition Source Files": **Incremental Refresh Mode**. When invoked in refresh mode (called by the pre-pipeline hook, not by onboard-agent), the agent receives the stored hash and the list of changed files from the skill. It re-scans changed files + fan-in set (looked up from the existing map's Module Dependency Graph), merges results into the existing map, updates the header hash, and returns. Full scan is only triggered when invoked with no existing map or when invoked explicitly by onboard-agent.
- Update the "Developer Sign-Off" section: sign-off is ONLY required when invoked by onboard-agent (explicit full scan). When invoked via auto-refresh, write immediately — no sign-off.
- Add fan-in cap: if fan-in set exceeds 20 modules, truncate and flag header.
- Add partial failure handling: if any scanner agent fails, write partial results, flag header, return (do not abort).
- Update Code Map Template header to include `Git hash:` and `Coverage:` lines.

`df-intake/SKILL.md`:
- Add **Step 0: Code Map Pre-Phase** before Step 1 (spawn leads). Read map header. Run `git rev-parse HEAD`. If hash differs or map missing, invoke codemap-agent in refresh/generation mode. Then proceed to Step 1.
- Update Lead A, Lead B, Lead C prompts: replace "Also read `dark-factory/code-map.md` if it exists" with the balanced search policy instruction (always present, always current).

`df-debug/SKILL.md`:
- Same Step 0 pre-phase as df-intake.
- Update Investigator A, B, C prompts: same replacement.

`df-orchestrate/SKILL.md`:
- Add Step 0 pre-phase before Pre-flight Checks. Same hash check + refresh logic.
- Update any implementation-agent spawn prompt that references the code map (if present).

`spec-agent.md`:
- Replace: "If `dark-factory/code-map.md` exists, read these sections for scope estimation and dependency awareness: ..."
- With: "Read `dark-factory/code-map.md` — it is always present and current. Use it to understand module structure, blast radius, entry points, and hotspots. Do NOT use Grep or Glob to discover which modules exist or how they connect — that's what the map is for. DO use Read/Grep for precise implementation details on specific files the map directs you to."

`architect-agent.md`:
- Replace: "If `dark-factory/code-map.md` exists, read the **full map** (all sections)"
- With: "Read `dark-factory/code-map.md` — it is always present and current. [same balanced search policy]"

`code-agent.md`:
- Replace: "If `dark-factory/code-map.md` exists, read these sections to understand the codebase structure: ..."
- With: balanced search policy (always read, use for discovery only, Read/Grep for precision).

`debug-agent.md`:
- Replace: "If `dark-factory/code-map.md` exists, read these sections for faster investigation: ..."
- With: balanced search policy.

`test-agent.md`:
- Replace: "If `dark-factory/code-map.md` exists, also read these sections: ..."
- With: balanced search policy.

`promote-agent.md`:
- Replace: "If `dark-factory/code-map.md` exists, read the **Shared Dependency Hotspots** section ..."
- With: balanced search policy (promote-agent reads the full map for hotspot placement guidance).

**Pattern to follow**: All 9 agents must use identical wording for the balanced search policy to ensure consistency. Use this exact text:

> Read `dark-factory/code-map.md` — it is always present and current. Use it to understand module structure, blast radius, entry points, and hotspots. Do NOT use Grep or Glob to discover which modules exist or how they connect — that is what the map is for. DO use Read/Grep for precise implementation details on specific files the map directs you to.

**Dual-source-of-truth warning**: Per the project profile, agent content exists in BOTH the `.claude/agents/*.md` files AND the corresponding generator functions in `scripts/init-dark-factory.js`. Changes to any agent or skill file MUST also be made in `init-dark-factory.js`. This is the most fragile part of the codebase — escaped backticks and nested template strings make it error-prone. The code-agent must update both locations for every changed file.

**Test expectations**: The existing test suite (`tests/dark-factory-setup.test.js`) uses string-matching assertions. New tests must verify:
- That each updated agent/skill file contains the balanced search policy phrase
- That codemap-agent contains incremental refresh logic keywords
- That df-intake/df-debug/df-orchestrate skills contain the pre-phase check

## Traceability

| Spec Item | Scenario(s) |
|-----------|-------------|
| FR-1 | P-01 (hash match), P-02 (hash diff), H-02 (single-commit diff) |
| FR-2 | P-03 (no map) |
| FR-3 | P-02 (incremental refresh), H-01 (fan-in correctness), H-04 (multi-commit diff) |
| FR-4 | H-03 (fan-in cap) |
| FR-5 | H-03 (partial failure) |
| FR-6 | P-04 (balanced search), H-02 (agent uses map not grep) |
| FR-7 | (greenfield covered by existing codemap-agent tests — no new scenario needed) |
| FR-8 | H-01 (changed file added as standalone entry) |
| BR-1 | P-03, P-02 (no sign-off in auto-refresh) |
| BR-2 | P-04 |
| BR-3 | H-04 (multi-commit diff uses stored hash not last commit) |
| BR-4 | H-01 (fan-in lookup uses map, not fresh grep) |
| BR-5 | H-01 (leaf node with no fan-in is still re-scanned) |
| BR-6 | (edge case — no dedicated scenario; covered by error handling table) |
| EC-1 | P-02 (map without hash triggers re-scan; simulated by providing map with no hash line) |
| EC-2 | H-02 (non-source-file commit → no re-scan, hash updated only) |
| EC-3 | H-03 (hotspot fan-in explosion → cap) |
| EC-4 | H-01 (Dark Factory file change) |
| EC-5 | P-01 (second invocation on current map) |
| EC-6 | (unreachable in normal test environment — covered by error handling table) |
| EC-7 | H-01 (deleted file removed from map) |
