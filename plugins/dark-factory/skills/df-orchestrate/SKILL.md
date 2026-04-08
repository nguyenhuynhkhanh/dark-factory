---
name: df-orchestrate
description: "Run Dark Factory implementation cycle. Spawns implementation-agents to handle per-spec lifecycle in isolated worktrees."
---

# Dark Factory — Orchestrate Implementation

You are the orchestrator for the implementation phase. You are a thin coordinator: you resolve dependencies, manage waves, and spawn implementation-agents. You do NOT perform architect review, code-agent spawning, or holdout validation directly.

## Trigger

`/df-orchestrate {name} [name2...]` — explicit spec names
`/df-orchestrate --group {group-name}` — all active specs in a group
`/df-orchestrate --all` — every active spec in the manifest
Optional: `--force` — override cross-group guard in explicit mode
Optional: `--skip-tests` — bypass the pre-flight test gate (logged in manifest)

### Argument Parsing

1. **Parse flags first**: Extract `--group`, `--all`, `--force`, and `--skip-tests` from the arguments. Everything else is an explicit spec name.
2. **Mutual exclusivity checks** (fail fast with clear errors):
   - `--group` and `--all` together → Error: "Cannot use --group and --all together. Use --group to orchestrate a specific group, or --all to run everything."
   - `--group` or `--all` with explicit spec names → Error: "Cannot combine --group/--all with explicit spec names. Use one mode at a time."
   - `--group` with no argument or empty string → Error: "--group requires a group name. Usage: /df-orchestrate --group <name>"
3. **`--force` warnings**: If `--force` is used with `--group` or `--all`, warn: "--force has no effect with --group/--all (it only applies to explicit mode cross-group guard)." Then proceed normally (not an error).
4. **Determine mode**:
   - If `--group {name}` → **Group Mode**
   - If `--all` → **All Mode**
   - If explicit spec names → **Explicit Mode** (existing behavior + cross-group guard)

---

## Group Mode (`--group {name}`)

1. **Query manifest**: Read `dark-factory/manifest.json`. Find all entries where the `group` field exactly equals the given name (exact string match, not substring) AND `status == "active"`.
2. **Group not found**: If no active specs match the group name, check if ANY specs (any status) have that group name. If none at all, list all available groups: "No group named '{name}' found. Available groups: [list unique non-null group values from manifest]". If all specs in the group are completed (removed from manifest), show: "All specs in group '{name}' are already completed. Nothing to do."
3. **Resolve dependencies into waves**: Using the active specs found, build the dependency graph and resolve into execution waves (see Wave Resolution below).
4. **Show completed specs**: For any dependency that references a spec NOT in the manifest (removed = completed), show it as "already completed (skipped)" in the execution plan.
5. **Display execution plan** and wait for developer confirmation before executing.
6. **Execute waves** in order (see Execute by Waves below).

---

## All Mode (`--all`)

1. **Query manifest**: Read `dark-factory/manifest.json`. Find every entry with `status == "active"`.
2. **No active specs**: If none found, show: "No active specs found. Nothing to do." and stop.
3. **Group by `group` field**: Partition active specs by their `group` value. Entries with `group: null` (or missing group field) are **standalone** — each is an independent unit.
4. **Resolve waves per group**: For each group, build the dependency graph and resolve into execution waves independently.
5. **Display execution plan**: Show all groups with their wave breakdowns, plus standalone specs.
6. Wait for developer confirmation.
7. **Execute**: Run independent groups' waves in parallel. Standalone specs run in parallel with everything. Within each group, waves are sequential.

---

## Cross-Group Guard (Explicit Mode Only)

When explicit spec names are provided (no `--group` or `--all`):

1. **Single spec**: Never triggers the guard. Proceed normally.
2. **Multiple specs**: Look up each spec's `group` field in the manifest. Collect unique non-null groups.
   - If all specs in the **same group** (or all standalone) → no guard, proceed normally.
   - If specs span **different groups** → warn: "Specs belong to different groups: {spec-a} ({group-a}), {spec-b} ({group-b}). Use --force to proceed anyway." Then **stop** (do not execute).
   - If `--force` is present → skip the warning, proceed with execution.

---

## Resume Semantics

Both `--group` and `--all` modes automatically handle resume after partial failures:

1. **Filter out non-active specs**: Only specs with `status: "active"` are candidates.
2. **Satisfied dependencies**: A dependency on a spec NOT in the manifest is treated as **satisfied** (completed and cleaned up).
3. **Active dependencies**: Must wait for that spec to complete in current run.
4. **Display**: Show completed/removed dependencies as "already completed (skipped)".

---

## Wave Resolution Algorithm

Build a directed acyclic graph from the `dependencies` fields:

1. For each spec, check its `dependencies` array (treat missing field as `[]`).
2. For each dependency:
   - NOT in manifest → **satisfied** (removed = completed)
   - In manifest with `status: "active"` → must be in earlier wave
   - In manifest with non-active status → **satisfied**
3. **Topological sort into waves**:
   - Wave 1: specs with no unsatisfied dependencies
   - Wave N: specs whose dependencies are all in waves < N or satisfied
4. Must be **deterministic** — same manifest state = same plan.

---

## Backward Compatibility for Missing Fields

- Missing `group` field → treat as `null` (standalone)
- Missing `dependencies` field → treat as `[]` (no dependencies)

## Step 0: Log the event

Before running pre-flight checks, run:
```bash
$HOME/.df-factory/bin/log-event.sh "$(jq -cn \
  --arg cmd "df-orchestrate" \
  --arg sub "{subcommand flag if any: --group, --all, or empty}" \
  --arg fn "{space-separated spec names, or group name, or 'all'}" \
  '{"command":$cmd,"subcommand":($sub|if .=="" then null else . end),"featureName":$fn,"startedAt":now|todate}')"
```

## Pre-flight Checks

Run for EVERY spec name (fail fast — check all before starting any):
1. Check if `dark-factory/project-profile.md` exists — if missing, warn but do NOT block.
2. Verify spec exists: `dark-factory/specs/features/{name}.spec.md` OR `dark-factory/specs/bugfixes/{name}.spec.md`
3. Verify public scenarios exist: `dark-factory/scenarios/public/{name}/` has files
4. Verify holdout scenarios exist: `dark-factory/scenarios/holdout/{name}/` has files
5. If ANY spec or scenarios missing → abort with clear message
6. **Circular dependency detection**: DFS-based topological sort — if back edge found, report: "Circular dependency detected: spec-a -> spec-b -> spec-c -> spec-a. Fix the dependency declarations in the manifest." Abort before execution. Self-dependency is a cycle of length 1.
7. **Cross-group dependency validation**: Dependencies must be within the same group. Report violations and abort.

## Pre-flight Test Gate

Before any implementation begins (before Architect Review in the implementation-agent), run the project's test suite ONCE for all specs. This gate catches failures early — preventing wasted architect and code-agent time.

1. Read `dark-factory/project-profile.md`, extract test command from `Run:` field.
2. If profile or `Run:` field missing: warn "No test command found in project profile. Skipping pre-flight test gate." Proceed.
3. If `--skip-tests`: log "Pre-flight test gate skipped." Record `"testGateSkipped": true` and `"testGateSkippedAt"` in manifest. Proceed.
4. Run test suite. If failures: report ALL failures, abort ALL specs. The test gate runs ONCE before any specs are processed (EC-10).

## Detect Mode

- Spec in `dark-factory/specs/features/` → **Feature mode**
- Spec in `dark-factory/specs/bugfixes/` → **Bugfix mode**

## Worktree Isolation

Each spec runs in its own git worktree. Worktree is created BEFORE implementation and merged back AFTER.

### Single spec: `/df-orchestrate my-feature`
1. Enter worktree (EnterWorktree tool)
2. Spawn **implementation-agent** (`.claude/agents/implementation-agent.md`) with: spec name, spec path, mode, branch name, skip-tests flag
3. Implementation-agent handles: architect review, code agents, holdout validation, promotion, cleanup
4. Exit worktree (ExitWorktree) — merges back to original branch

### Multiple specs: `/df-orchestrate spec-a spec-b spec-c`

**Step 1: Dependency Analysis (MANDATORY)** — same as before: check manifest, read specs, build dependency graph, resolve into waves, present plan, get confirmation.

**Step 2: Execute by Waves** — see Autonomous Wave Execution below.

---

## Autonomous Wave Execution

For multi-spec invocations, the orchestrator uses a **high-level orchestrator / wave agent architecture**.

### High-Level Orchestrator Responsibilities
The high-level orchestrator ONLY:
1. Reads manifest and resolves dependencies into waves
2. Presents execution plan for ONE developer confirmation
3. Spawns each wave as an independent wave agent sequentially
4. Collects results from each wave agent
5. Computes transitive blocked specs after each wave
6. Reports non-blocking progress between waves
7. Produces comprehensive final summary report

### Wave Agent Spawning

For each wave, spawn an **independent** agent (`run_in_background: true`) that receives:
- The list of spec names for that wave
- The current branch name
- The mode (feature or bugfix) for each spec

Each wave agent spawns **implementation-agents** (`.claude/agents/implementation-agent.md`) for each spec in its wave, each in its own worktree with `isolation: "worktree"`. Each implementation-agent handles the full per-spec lifecycle:
- Architect review (spawning `.claude/agents/architect-agent.md` — 3 domain agents in parallel)
- Code agents (spawning code-agents with spec + public scenarios + architect findings)
- Holdout validation (spawning test-agents)
- Promotion (spawning `.claude/agents/promote-agent.md`)
- Cleanup (deleting artifacts after promotion, archive to git history)

The implementation-agent enforces the red-green cycle for bugfix mode: test FAILS in red phase, test PASSES in green phase, checks for regression against existing tests. If architect returns BLOCKED after all passes, do NOT proceed to implementation — report to developer.

Each wave agent returns structured results with per-spec status: passed/failed/blocked, error details, promoted test paths.

### Smart Re-run Detection (in implementation-agent)

The implementation-agent checks if `dark-factory/results/{name}/` has previous results. In autonomous mode, it will default to "new": wipe previous results and run a full cycle. It does NOT prompt the developer.

### Single-Spec Mode Exception

When only one spec is being executed (single name, or --group/--all resolves to one active spec), the wave agent architecture is NOT used. The orchestrator spawns the implementation-agent directly in a worktree (see Single spec above). This avoids unnecessary overhead.

### Progress Reporting

Report wave completions as non-blocking progress messages:
```
Wave 1 complete (project-init: passed/promoted). Starting Wave 2...
Wave 2 complete (user-auth: passed/promoted, payment-api: failed). Starting Wave 3...
```
Report without blocking for developer acknowledgment. After all specs in wave N complete, automatically proceeds to wave N+1. No developer acknowledgment is needed between waves.

After developer confirms the execution plan, execute ALL waves without further developer interaction. The only conditions that stop execution: merge conflict (hard stop), or all remaining specs blocked by prior failures.

---

## Failure Handling Within Groups

When a spec fails (architect blocks it or implementation fails after 3 rounds):

1. **Mark the failed spec**: Note it as failed (remains `status: "active"` in manifest).
2. **Pause transitive dependents**: Find ALL specs depending on failed spec, directly or transitively. Do NOT attempt to execute them.
3. **Continue independent specs**: Specs not depending on failed spec continue normally.
4. **Report after all executable specs finish**: Include all failures in final summary with actionable next steps. Do NOT pause mid-pipeline.

### Failure Semantics

- **Spec fails after 3 implementation rounds**: Mark failed, block transitive dependents, continue independent specs
- **Architect blocks a spec**: Same (mark failed, block dependents, continue others)
- **Merge conflict**: Hard stop the entire pipeline, report with file details
- **Promoted test failure**: Hard stop for that spec (do not cleanup), continue others
- **All remaining specs blocked**: Stop pipeline early
- **Wave agent crash (no result)**: Treat all specs in wave as failed, block dependents
- **Wave agent crash with partial results**: Process completed specs normally, treat missing specs as failed

ALL failures reported in final summary with actionable next steps.

### Final Summary Report

```
=== Dark Factory Orchestration Complete ===

Completed specs:
  - spec-a: passed/promoted (tests: path/to/promoted/tests)

Failed specs:
  - spec-b: failed (architect BLOCKED — reason)
    → Next step: Fix spec-b and re-run with `/df-orchestrate spec-b`

Blocked specs (dependency on failed spec):
  - spec-d: blocked by spec-b (dependency chain: spec-d → spec-b)
    → Next step: Re-run with `/df-orchestrate --group X` after fixing spec-b

Summary: 1 passed, 1 failed, 1 blocked
```

## Information Barrier Rules

These apply at the coordination level — the orchestrator enforces what context is passed to implementation-agents and wave agents:

- NEVER pass holdout scenario content to the code-agent
- NEVER pass public scenario content to the test-agent
- NEVER pass test/scenario content to the architect-agent
- The architect-agent communicates ONLY about spec content with spec/debug agents — never about tests
- Each agent spawn is completely independent (fresh context)
- Only pass: spec name, spec path, mode, and branch name to implementation-agents
- The implementation-agent forwards architect findings to code-agents: Extract ONLY the "Key Decisions Made" and "Remaining Notes" sections from the review. Strip round-by-round discussion content.
- The implementation-agent passes the feature name (test-agent reads holdout scenarios itself) and the spec file path or debug report path to the test-agent
- The implementation-agent passes the feature name and holdout test file path from `dark-factory/results/{name}/` to the promote-agent
