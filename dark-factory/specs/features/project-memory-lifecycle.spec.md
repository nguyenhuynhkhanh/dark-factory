# Feature: project-memory-lifecycle

## Context

The Project Memory foundation (`project-memory-foundation`) ships the `dark-factory/memory/` directory with skeleton files. The onboard sub-spec extracts the first real entries. The consumers sub-spec teaches spec/architect/code agents to READ memory and emit `## Invariants` / `## Decisions` / `## References` declarations in specs.

**This sub-spec delivers the WRITE side + the enforcement gates that make memory a durable regression shield.** Without this spec, memory is a read-only registry that never grows — promote-agent does not materialize the `INV-TBD-*` / `DEC-TBD-*` placeholders emitted by spec-agent, the ledger never appends, and there is no regression gate catching a newly-written feature that quietly breaks a prior invariant.

Concretely, this spec implements:

1. **Single-writer write protocol.** promote-agent becomes the sole runtime writer of `dark-factory/memory/*`. At promotion, it parses the spec's `## Invariants` / `## Decisions` sections, assigns permanent zero-padded IDs (`INV-NNNN`, `DEC-NNNN`, `FEAT-NNNN`), materializes full entries into the correct domain-sharded shard file (`invariants-{domain}.md`, `decisions-{domain}.md`), handles Introduces / Modifies / Supersedes / References, updates the compact index (`dark-factory/memory/index.md`), and appends a ledger row. All writes are shard-first, index-last to ensure partial failures are always detectable.
2. **Full-suite regression gate (test-agent validator mode, Step 2.75).** After the feature's new holdout scenarios pass (existing Step 2.5 behavior), test-agent runs the ENTIRE promoted test suite plus the new holdout and classifies any failures into four distinct classes: new-holdout failure (existing), invariant regression (touched file + guarded test failed), pre-existing regression (guarded test failed but does NOT overlap touched files — warn, do not block), and expected regression (spec declared Modifies on the invariant whose guard test failed — do not loop back to code-agent).
3. **Advisor mode for test-agent.** A distinct spawn pattern (`mode: advisor`) invoked by spec-agent in df-intake Step 5.5 that returns structured advisory feedback on scenario feasibility/flakiness/dedup/missing coverage, with a hard information barrier preventing holdout content from leaking.
4. **Orchestration for new failure classes** in implementation-agent.
5. **df-cleanup memory health check** mirroring the existing promoted-test STALE GUARD check, now covering shard orphan detection, phantom index entries, and index hash mismatches in addition to the original four categories.

Lead investigation produced three converging recommendations: (a) single-writer is THE key concurrency mitigation because waves serialize promote-agent runs; (b) pre-existing regression must warn-and-proceed or a single flaky old test halts the entire shop; (c) advisor-mode's information barrier must be defended by a distinct spawn and structured-output-only protocol — a normal validator-mode test-agent could accidentally dump holdout content if the boundary is not enforced at the spawn level.

The pre-flight test gate (before architect review) and this Step 2.75 post-implementation regression gate are DIFFERENT checkpoints. All three lead reports flagged this confusion explicitly — the spec below documents both as distinct and both as required.

## Scope

### In Scope (this spec)

- **promote-agent changes** (`.claude/agents/promote-agent.md` + plugin mirror): memory read (index + relevant shard), next-sequential ID assignment (index fast path; shard-scan fallback for stale index), materialization of `INV-TBD-*` / `DEC-TBD-*` placeholders into the correct domain shard, handling of Introduces / Modifies / Supersedes / References declarations, index update (shard-first, index-last ordering with ORPHANED_SHARD rollback path), ledger append on every promotion (always), top-level frontmatter update (`lastUpdated`, `gitHash`), shard `gitHash` update, explicit single-writer invariant documentation.
- **test-agent changes** (`.claude/agents/test-agent.md` + plugin mirror):
  - New `mode` parameter (`validator` default; `advisor` distinct spawn).
  - New **Step 2.75: Full-suite regression gate** (validator mode only), run after existing Step 2.5 per-scenario holdout validation.
  - Four-class failure classification: new-holdout, invariant-regression, pre-existing-regression, expected-regression.
  - Structured result output with `preExistingRegression` and `expectedRegression` booleans.
  - Advisor-mode process: reads spec draft, draft public+holdout scenarios, `promoted-tests.json`, memory index and shard files; returns structured advisory (feasibility/flakiness/dedup/missing/gaps); does NOT write tests, run tests, or modify scenarios; soft-cap ~60s; one round max.
  - Advisor-mode information barrier enforced by (a) distinct spawn protocol, (b) structured output with enumerated categories + scenario IDs (no free-form prose), (c) prose constraint forbidding quoting scenario text.
  - **Advisor output restriction on `missing` category**: when citing `[INV-ID]` in the `missing` category, advisor MUST NOT cross-reference the index to resolve full entry text. The INV-ID alone is the output. This prevents advisor output from transitively exposing index content to code-agents.
- **implementation-agent changes** (`.claude/agents/implementation-agent.md` + plugin mirror):
  - Route new failure classes: invariant-regression → code-agent loop (with behavioral description, no holdout leak); pre-existing-regression → proceed + warning + manifest flag; expected-regression → proceed + note for future promote-agent.
  - Hard rule: implementation-agent NEVER spawns test-agent in advisor mode.
  - Pre-flight gate vs. Step 2.75 gate documented as distinct checkpoints, both required.
  - Forward memory-entry summary to code-agent for this spec's Modifies list (shortcut; code-agent still reads memory directly per consumers spec).
- **df-intake skill change** (`.claude/skills/df-intake/SKILL.md` + plugin mirror): new **Step 5.5 Test-Advisor Handoff** inserted between existing Step 5 (write spec) and Step 6 (manifest update). Spawns advisor-mode test-agent; spec-agent revises scenarios; summary line emitted to intake output; advisor timeout/error → proceed with original scenarios, warn, set manifest `testAdvisoryCompleted: false`.
- **df-orchestrate skill change** (`.claude/skills/df-orchestrate/SKILL.md` + plugin mirror): documents Step 2.75 regression gate; adds loud warning UX for pre-existing regression (suggest `/df-debug` for the old feature); tracks `preExistingRegression` and `expectedRegression` in manifest.
- **df-cleanup skill change** (`.claude/skills/df-cleanup/SKILL.md` + plugin mirror): new memory health check step (original four: `MALFORMED_MEMORY`, `STALE_ENFORCEMENT`, `STALE_SOURCE`, `STALE_LEDGER`; plus three new shard-aware categories: `ORPHANED_SHARD`, `PHANTOM_INDEX`, `INDEX_HASH_MISMATCH`); new `--rebuild-index` flag that regenerates `index.md` from all shards (non-destructive, outputs diff, never touches shards); `--rebuild-memory` extended to also rebuild index after rebuilding ledger; token budget observability (entry count warning at 500+); df-cleanup documented as the index maintenance exception writer.
- **Structural tests** (`tests/dark-factory-setup.test.js`) asserting promote-agent ID assignment rules, shard-first write ordering, index maintenance, ORPHANED_SHARD recovery path, ledger append behavior, test-agent mode parameter, Step 2.75 classification categories, implementation-agent routing rules, df-intake Step 5.5 structure, df-cleanup memory health check categories, `--rebuild-memory` and `--rebuild-index` behavior, advisor-mode information barriers.
- **Contract tests** (`tests/dark-factory-contracts.test.js`) asserting plugin mirror parity for every edited file.

### Out of Scope (explicitly deferred)

- Memory directory, template files, and rule plumbing — owned by `project-memory-foundation`.
- Initial population of memory from existing project state (retro-backfill, developer sign-off, extraction heuristics) — owned by `project-memory-onboard`.
- `## Invariants` / `## Decisions` section additions to `spec-template.md`, spec-agent emitting those sections, architect-agent probe, code-agent reading memory — owned by `project-memory-consumers`. This spec consumes the consumers spec's emitted sections but does not itself teach spec-agent how to write them.
- Supersession cascade — explicitly locked out by shared context decision. Only direct `supersedes: <ID>` is handled.
- Architect-agent behavior changes — consumers-owned.
- Debug-agent behavior changes — consumers-owned (if any).
- onboard-agent changes — onboard-owned.
- Tiering / impacted-test-selection optimization of the Step 2.75 gate — v2. v1 always runs the full suite.
- Automatic rebuild of invariants/decisions from source code — fundamentally not recoverable without onboarding; `--rebuild-memory` is ledger-only, `--rebuild-index` is index-only from shard content.
- Full-suite runtime budget / parallelization of the regression gate — deferred.
- Archiving or pruning stale index entries — advisory only via token budget warning; no automated archive.

### Scaling Path

- **If the full-suite gate becomes too slow**: v2 introduces impacted-test selection driven by `Guards:` annotation overlap with touched files. The classification logic already computes this overlap, so the optimization is purely narrowing the set of tests to run.
- **If promote-agent ID contention becomes real**: today's mitigation is serialized waves. If a future deployment parallelizes promotion across non-conflicting waves, ID assignment can move to a centralized allocator without changing the entry format.
- **If advisor-mode becomes a bottleneck**: it is bounded to one round and ~60s. A richer back-and-forth would need a new pipeline phase; the current design explicitly forbids ping-pong to keep the information barrier narrow.
- **If pre-existing regressions accumulate**: df-cleanup can be extended to list every manifest entry with `preExistingRegression: true` and suggest batch `/df-debug` runs.
- **If the index grows beyond 500 entries**: df-cleanup emits a token-budget warning; developer can archive stale entries manually. Automated archiving is a v2 concern.

## Storage Layout

The memory directory uses a shard-based layout. The OLD monolithic `invariants.md` and `decisions.md` files are ELIMINATED by `project-memory-foundation`. This spec is the first to write into the shard layout at runtime.

```
dark-factory/memory/
├── index.md                          ← compact index, always-loaded
├── invariants-security.md            ← domain shard: security invariants
├── invariants-architecture.md        ← domain shard: architecture invariants
├── invariants-api.md                 ← domain shard: API invariants
├── decisions-security.md             ← domain shard: security decisions
├── decisions-architecture.md         ← domain shard: architecture decisions
├── decisions-api.md                  ← domain shard: API decisions
└── ledger.md                         ← monolithic feature history (unchanged)
```

**Index format.** Each entry in `index.md` is a heading row of the form:

```
## INV-0001 [type:invariant] [domain:architecture] [tags:spec,compliance] [status:active] [shard:invariants-architecture.md]
Every spec must declare the invariants it touches
```

Index frontmatter includes: `version`, `lastUpdated`, `generatedBy`, `gitHash`, `entryCount`, `shardCount`.

**Domain routing.** An entry's `domain` field determines its shard file: `security` → `invariants-security.md` (or `decisions-security.md`), `architecture` → `invariants-architecture.md`, `api` → `invariants-api.md`. The domain is declared by the spec and cannot be changed after materialization without a Supersedes operation.

## Requirements

### Functional

- FR-1: promote-agent MUST read `dark-factory/memory/index.md` at the start of every promotion to determine existing IDs and validate index freshness. For any shard that will be written (determined by the spec's domain declarations), promote-agent MUST also read the relevant shard file(s) before writing. — Required to compute next-available IDs and to detect stale index conditions.
- FR-2: promote-agent MUST assign the next available zero-padded 4-digit sequential ID for each type (`INV-NNNN`, `DEC-NNNN`, `FEAT-NNNN`). **ID assignment fast path**: read the index and compute `max(existing) + 1` per type. **ID assignment fallback (stale index)**: if the index is stale (a prior shard write succeeded but the index update failed — detectable because a shard contains an entry heading with no corresponding index row), promote-agent MUST scan ALL shard files (`invariants-*.md`, `decisions-*.md`, `ledger.md`) directly to find the true max ID as ground truth. Scanning is deterministic: IDs appear as headings `## INV-NNNN` in each shard file. Gaps in the sequence (from superseded/deprecated entries) are NEVER backfilled; the next ID is always `max + 1`. — Locked by foundation DEC: IDs are append-only and monotonic; reuse would break historical references.
- FR-3: For each `INV-TBD-*` / `DEC-TBD-*` placeholder declared in the spec's `## Invariants` / `## Decisions` Introduces subsections, promote-agent MUST: (a) determine the entry's `domain` field to select the correct shard file, (b) assign a permanent ID, (c) materialize the full entry in the shard file (append), (d) set the entry's `shard` field to the shard filename (e.g., `invariants-security.md`), (e) update `index.md` — append a new heading row for the new entry with `[shard:...]` bracket, (f) set `introducedBy: <spec-name>` + `introducedAt: <ISO now>`. The shard write MUST happen before the index update (shard-first ordering). — Materialization is the entire point of the TBD placeholder mechanism; shard-first ordering ensures failures are always detectable.
- FR-4: For each Modifies declaration in the spec, promote-agent MUST: (a) locate the existing entry by ID in the index to find its shard filename, (b) read the shard file, (c) update the `rule` (for invariants) or `decision` (for decisions) field in the shard entry in place, (d) append a record to the entry's `history:` array preserving the prior value + the modifying spec name + the ISO date, (e) set `lastModifiedBy: <spec-name>`, (f) update the index row in place — find the heading for this ID and replace the line (status field, lastUpdated). The shard file is updated first; the index row update follows. — Required for durable decision evolution; without history the "why did this change?" question has no answer.
- FR-5: For each Supersedes declaration (format: `supersedes: <existing-ID>` with the spec also declaring a fresh `INV-TBD-*` / `DEC-TBD-*` replacement), promote-agent MUST: (a) materialize the new entry in the correct domain shard (Introduces flow), (b) set the old entry's `status: superseded`, `supersededBy: <new-ID>`, `supersededAt: <ISO now>`, `supersededBySpec: <spec-name>` in the shard file, (c) update the old entry's index row in place — change `[status:active]` to `[status:superseded]`, (d) add a new index row for the new entry pointing to its shard. The old entry remains in the shard file (NOT deleted) — locked by foundation BR-3. — Supersession is the schema-aware "replace" operation.
- FR-6: For each References declaration (read-only linkage, no modification), promote-agent MUST look up the referenced entry's shard via the index, then append the current spec's name to the `referencedBy:` array of each referenced entry in the shard file, deduplicating. The index row for the referenced entry is NOT modified (References does not change status or domain). — Tracks reverse linkages for the architect probe and for df-cleanup stale-source detection.
- FR-7: promote-agent MUST append a new `FEAT-NNNN` entry to `ledger.md` on EVERY successful promotion (even when the spec declared zero invariants/decisions), populating: `name`, `summary` (from the spec's Context or Summary section), `promotedAt` (ISO now), `introducedInvariants` (list of newly-assigned INV IDs), `introducedDecisions` (list of newly-assigned DEC IDs), `promotedTests` (list of test file paths from this promotion, sourced from promote-agent's own output), `gitSha` (the commit-BEFORE the cleanup commit — see NFR-3). The ledger remains monolithic (not sharded). — Ledger is the append-only feature history; zero-decl specs still appear.
- FR-8: promote-agent MUST update frontmatter for each written file: (a) each written shard file gets `lastUpdated` set to ISO now and `gitHash` set to the current git HEAD at write time; (b) `index.md` frontmatter gets `lastUpdated`, `gitHash`, `entryCount` (total entry count), and `shardCount` updated. — Frontmatter is how consumers validate freshness; shard-level gitHash is used by `INDEX_HASH_MISMATCH` detection.
- FR-9: promote-agent MUST perform the memory write as part of the existing cleanup commit — no separate commit. The `gitSha` field in the ledger entry SHALL reference the commit-BEFORE this cleanup commit (the last commit on main before promotion). The ledger entry's prose or a note MUST clarify this to readers, so they do not expect the `gitSha` to be tautologically self-referential. — The self-referential alternative would require a two-pass write + amend, which adds complexity and commit-rewrite risk.
- FR-10: promote-agent MUST tolerate specs that do NOT contain `## Invariants` / `## Decisions` sections (legacy pre-consumers specs). In that case, no entries are materialized in any shard, but the ledger entry is still appended (per FR-7) with `introducedInvariants: []` and `introducedDecisions: []`. — Backward compatibility during the rollout window; legacy specs must not crash promotion.
- FR-11: promote-agent MUST be documented as the SOLE runtime writer of `dark-factory/memory/*.md` (all shard files, index.md, and ledger.md). The only other runtime writer is df-cleanup when invoked with `--rebuild-index` (documented as a maintenance exception, not a promotion writer). onboard-agent writes at bootstrap (fenced exception, owned by `project-memory-onboard`). No other agent writes these files at runtime. — Single-writer invariant locked by DEC-TBD-a below.
- FR-12: test-agent MUST accept a new `mode` input parameter. Legal values: `validator` (default if omitted — existing behavior) and `advisor`. The agent's behavior branches on this parameter at the start of its process. — Mode parameter is the enforcement mechanism for advisor vs validator information barriers.
- FR-13: test-agent in `validator` mode MUST, after existing Step 2 / 2.5 holdout validation, run a new **Step 2.75: Full-suite regression gate** that executes the project's full test command (from project-profile `Run:`) covering ALL promoted tests plus the new holdout tests in one combined pass. — Catches invariants broken silently by the new feature.
- FR-14: In Step 2.75, test-agent MUST classify each failing test into one of four mutually exclusive classes:
  1. **new-holdout** — the failing test is from this feature's new holdout (route back to code-agent — existing behavior).
  2. **invariant-regression** — a promoted test failed AND its `Guards:` annotation lists at least one file that this spec's implementation touched (route back to code-agent with a behavioral description; do NOT leak holdout content — use the promoted test's behavioral description from `promoted-tests.json` plus the guard annotation).
  3. **pre-existing-regression** — a promoted test failed AND its `Guards:` annotation references ZERO files that this spec touched (warn loudly, flag `preExistingRegression: true` in structured output and in manifest; do NOT block; do NOT loop back).
  4. **expected-regression** — the failing promoted test is the enforcer (matched via `enforced_by: <test-path>` on the INV/DEC it guards) of an invariant/decision that THIS spec's `## Invariants > Modifies` or `## Invariants > Supersedes` explicitly declared (architect pre-approved the change; promoted test is obsolete → route to a future promote-agent cycle to update the promoted test; do NOT loop back to code-agent; flag `expectedRegression: true` in structured output and manifest). — The four classes are exhaustive and mutually exclusive by the classification order above; a single failing test picks the first matching class.
- FR-15: test-agent's Step 2.75 output MUST be structured as an object (recorded in `dark-factory/results/{feature}/run-{timestamp}.md` metadata block) containing: `status`, `newHoldoutResult` (PASS/FAIL summary per scenario), `regressionResult: { class, failingTests: [{ path, class, guardAnnotation, behavioralDescription }] }`, `preExistingRegression: boolean`, `expectedRegression: boolean`. — Machine-readable structure enables implementation-agent routing.
- FR-16: test-agent in `advisor` mode MUST read: the draft spec file, draft public + holdout scenario files, `dark-factory/promoted-tests.json`, and the memory index + all shard files. It MUST NOT: write test files, execute any test, modify scenarios, edit the spec, or re-investigate the feature. — Advisor is a read-only analyst.
- FR-17: test-agent in `advisor` mode MUST return a structured advisory report with the following enumerated categories only: `feasibility` (per scenario: `feasible` | `infeasible` | `infrastructure-gap` + short reason), `flakiness` (per scenario: `low` | `medium` | `high` + reason), `dedup` (per scenario: pointer to existing promoted test feature name + file path, if any), `missing` (list of invariant IDs referenced by the spec without a corresponding scenario — **IDs only, no full entry text**), `infrastructureGaps` (list of required fixtures/helpers that don't exist). Each item references scenarios BY FILE PATH or scenario ID only. **The advisory output MUST NOT contain free-form prose that quotes or paraphrases holdout scenario content. When citing `[INV-ID]` in the `missing` category, the advisor MUST NOT cross-reference the index to resolve or include full entry text — the ID alone is the output.** — Structured output with ID-only references prevents holdout and index content from leaking transitively to code-agents via advisor output.
- FR-18: test-agent in `advisor` mode runs ONE ROUND MAX with a soft-cap of approximately 60 seconds. If timeout or error, it returns a structured `{ status: "timeout" }` or `{ status: "error", reason }` and the calling spec-agent proceeds with the original scenarios. — Bounded execution; no ping-pong with spec-agent.
- FR-19: advisor-mode and validator-mode MUST be distinct spawn invocations. An agent invoked in one mode MUST NOT process inputs for the other mode in the same spawn. test-agent MUST validate the mode parameter at spawn start and refuse to proceed if the parameter is missing, misspelled, or mixed (e.g., both provided). — The spawn barrier is enforced at the agent level; orchestrators/skills must spawn separately for separate modes.
- FR-20: implementation-agent MUST route each Step 2.75 result class correctly:
  - `new-holdout` failures → existing behavior (extract behavioral failures, re-spawn failing code-agent tracks — subject to 3-round max).
  - `invariant-regression` → same loop as new-holdout failure (behavioral description only, no holdout content), BUT the behavioral description comes from the promoted test's annotation in `promoted-tests.json` / its header comment, NOT from the holdout.
  - `pre-existing-regression` → do NOT loop back. Emit loud warning: "Pre-existing regression detected in {promoted-test-path}. This feature does not touch files in its Guards annotation. Proceeding with promotion. Consider running `/df-debug` to investigate {owning-feature}." Set manifest `preExistingRegression: true` for this spec. Proceed.
  - `expected-regression` → do NOT loop back to code-agent. Emit note: "Expected regression: promoted test {path} enforces {INV-ID} which this spec declared Modifies/Supersedes. Promoted test will be updated at promotion time." Set manifest `expectedRegression: true`. Proceed with promotion; promote-agent will update the promoted test in a follow-up step.
- FR-21: implementation-agent MUST NEVER spawn test-agent with `mode: advisor`. Advisor mode is spawned exclusively by spec-agent (via df-intake Step 5.5). This is a hard prompt-level rule in implementation-agent.md. — Preserves mode isolation; implementation-agent only ever needs validator behavior.
- FR-22: implementation-agent MUST document the pre-flight test gate (before architect review, existing) and the Step 2.75 regression gate (after code-agent implementation, new) as DISTINCT checkpoints. The pre-flight gate catches failures before expensive architect+code work; the Step 2.75 gate catches invariant regressions after implementation. Both run in every feature cycle; neither replaces the other. — All three lead reports flagged this confusion — documentation is load-bearing.
- FR-23: When spawning a code-agent, implementation-agent MAY include a short memory-entry summary scoped to the spec's `## Invariants > Modifies` list (a convenience shortcut). Code-agent independently reads memory via the consumers-spec rule. This summary is advisory context, not the source of truth. — Code-agent reads memory directly; implementation-agent's pass-through is only a UX shortcut.
- FR-24: df-intake skill MUST insert a new **Step 5.5: Test-Advisor Handoff** between current Step 5 (write spec) and current Step 6 (update manifest). Step 5.5 spawns test-agent with `mode: advisor`, passing spec path + scenario draft paths + memory index + shard files. spec-agent reads the advisory output and MAY revise scenarios (remove dedups, flag infeasible, add missing coverage). A summary line MUST be appended to the intake output: "Testability review: N kept, M revised, K removed as duplicate, J flagged for infrastructure." — Advisor handoff is the spec-side quality gate.
- FR-25: If the advisor call returns `status: timeout` OR `status: error` OR fails to complete within the soft cap, df-intake MUST proceed with the original scenarios, emit a warning line ("Testability advisor unavailable — proceeding with original scenarios"), and set manifest flag `testAdvisoryCompleted: false` for this spec. — Advisor is optional; its absence must not block.
- FR-26: df-orchestrate skill MUST document the Step 2.75 full-suite regression gate in its process narrative, distinct from the existing pre-flight gate. — Orchestrator-level documentation so developers understand the two checkpoints.
- FR-27: df-orchestrate skill MUST surface pre-existing regressions loudly in the final summary report (new block: "Pre-existing regressions flagged: {list of specs with preExistingRegression=true, with suggested `/df-debug` targets}") and MUST NOT count them as failures. — Pre-existing regressions are informational signals, not blockers.
- FR-28: df-cleanup skill MUST add a new **Memory Health Check** step after the existing Promoted Test Health Check (step 2). This step detects and reports the following categories (all reported, none auto-fixed):
  - **Original four categories**: `MALFORMED_MEMORY` (file unparseable), `STALE_ENFORCEMENT` (invariant's `enforced_by` test path doesn't exist), `STALE_SOURCE` (entry's `sourceRef` file doesn't exist), `STALE_LEDGER` (FEAT entry's `promotedTests` path not in `promoted-tests.json`).
  - **New shard-aware category: `ORPHANED_SHARD`** — an entry heading (`## INV-NNNN`) exists in a shard file but has no corresponding row in the index. Severity: WARNING. Resolution: `--rebuild-index`. Does NOT auto-fix.
  - **New shard-aware category: `PHANTOM_INDEX`** — the index references an entry ID for which no shard file contains a matching heading. Severity: ERROR (data loss condition). Resolution: `--rebuild-index` (will remove the phantom row). Does NOT auto-fix.
  - **New shard-aware category: `INDEX_HASH_MISMATCH`** — the index frontmatter's `gitHash` differs from the `gitHash` of one or more shard files it references. Severity: WARNING. Indicates a write was interrupted mid-operation.
  - **Token budget observability**: count lines in `index.md`; if `entryCount` exceeds 500, emit WARNING: "Memory index has grown large (N entries). Consider archiving stale entries." Advisory only — does not block.
  - Report ALL issues at once; do NOT auto-fix; leave resolution to the developer. — Mirrors existing STALE GUARD pattern for promoted tests.
- FR-29: df-cleanup skill MUST accept a new `--rebuild-memory` flag that reconstructs `dark-factory/memory/ledger.md` from `dark-factory/promoted-tests.json` entries. After rebuilding the ledger, `--rebuild-memory` MUST also rebuild `index.md` by scanning all shard files (invoking the same logic as `--rebuild-index`). It MUST NOT rebuild invariant/decision shard files; if invoked when those files are malformed, it emits: "Invariants/decisions cannot be auto-rebuilt. Run `/df-onboard` to re-extract." — Ledger is derivable from promoted-tests.json; invariants/decisions require developer sign-off.
- FR-29b: df-cleanup skill MUST accept a new `--rebuild-index` flag (separate from `--rebuild-memory`) that: (a) scans all shard files (`invariants-*.md`, `decisions-*.md`, `ledger.md`), (b) regenerates `index.md` from scratch by reading every entry heading from every shard, (c) outputs a diff of what changed in the index so the developer can validate, (d) NEVER touches shard files. df-cleanup is the ONLY agent besides promote-agent permitted to write `index.md`; this is documented as a maintenance exception to the single-writer rule. — Non-destructive; shard files are never modified by this flag.
- FR-30: `tests/dark-factory-setup.test.js` MUST gain structural assertions for every process rule in FR-1..FR-29b (see Acceptance Criteria AC-* for the specific assertion set). — Locks the lifecycle contract; any drift breaks the test suite.
- FR-31: `tests/dark-factory-contracts.test.js` MUST gain plugin-mirror parity assertions for every edited file listed in "Files You May Touch" (promote-agent, test-agent, implementation-agent, df-intake, df-orchestrate, df-cleanup mirrors). — Plugin mirror contract is the existing project invariant.

### Non-Functional

- NFR-1: promote-agent memory write MUST follow shard-first, index-last ordering to ensure partial failures are always detectable rather than invisible. **Rollback protocol by failure case**:
  - **Shard write fails**: no index update occurs. No orphan entry exists. Rollback is a no-op — promotion fails cleanly.
  - **Shard write succeeds, index update fails**: the shard entry exists but is un-indexed. This is an `ORPHANED_SHARD` condition. Do NOT delete the shard entry (destructive). Instead: log "ORPHANED_SHARD: {entry-id} written to shard but index update failed", leave the shard entry as-is, report failure to implementation-agent. Manifest stays at `passed` (not `promoted`). Developer runs `--rebuild-index` to repair. This ordering (shard first, index last) ensures that a partial failure always results in an orphaned shard (detectable and repairable) rather than a phantom index entry (invisible data loss).
  - promote-agent keeps an in-memory snapshot of all file states pre-write. If shard write fails, no rollback needed. If a DIFFERENT shard write fails mid-sequence (e.g., second shard write fails after first succeeded), restore ALL written shard files from snapshot and report multi-shard rollback failure.
- NFR-2: Step 2.75 runtime is not bounded in v1 (full suite), but the manifest SHOULD record `fullSuiteRuntimeMs` on the manifest entry under `regressionGate: { runtimeMs: N, failingClass: ... }` for future v2 tiering data. — Low-cost observability for a future optimization.
- NFR-3: The commit-before SHA used for the ledger `gitSha` field MUST be computed deterministically as `git rev-parse HEAD` BEFORE promote-agent creates the cleanup commit. promote-agent documents this clearly in its process narrative to prevent developer confusion about the seeming self-reference. — Deterministic SHA; no amend / rewrite complexity.
- NFR-4: Advisor-mode runtime MUST be soft-capped at ~60s wall clock. On overage, advisor returns `status: timeout` with whatever partial advisory it has. spec-agent MUST treat the partial advisory as optional. — Bounded latency in df-intake.
- NFR-5: All edits preserve plugin mirror parity — every `.claude/agents/*.md` and `.claude/skills/*/SKILL.md` edit MUST be mirrored byte-for-byte in `plugins/dark-factory/`. — Existing project convention.
- NFR-6: No new npm dependencies. No external services. Zero-dep posture is preserved. — Project convention (see project-profile "No node_modules").

## Data Model

No runtime data-model changes to the YAML schema format. The schema for memory files is defined by `project-memory-foundation`. This spec materializes entries into shard files and the index.

**Breaking change from old layout**: the monolithic `dark-factory/memory/invariants.md` and `dark-factory/memory/decisions.md` files are ELIMINATED and replaced by domain-sharded files. This is a foundation-level breaking change; runtime data in old format must be migrated by `project-memory-foundation` before this spec's promote-agent writes. This spec's promote-agent writes exclusively to the shard layout.

**New fields added by this spec** (on existing entry schema):
- **On invariant/decision entries**: `shard` (filename of the shard this entry lives in); `history: [{ previousValue, modifiedBy, modifiedAt }]` (written by FR-4); `lastModifiedBy`, `supersededAt`, `supersededBySpec` (written by FR-4/FR-5).
- **On index.md**: heading rows in `## ID [type:...] [domain:...] [tags:...] [status:...] [shard:...]` format; frontmatter fields `entryCount`, `shardCount`.
- **On ledger FEAT entries**: fields already defined by foundation; this spec is the first to WRITE them at runtime.

This spec also adds the following MANIFEST fields on feature entries:
- `preExistingRegression: boolean`
- `expectedRegression: boolean`
- `testAdvisoryCompleted: boolean`
- `regressionGate: { runtimeMs, failingClass }`

## Migration & Deployment

**Applies — behavioral changes to existing agents and skills, plus breaking storage layout change.**

- **Old monolithic files removed**: `dark-factory/memory/invariants.md` and `dark-factory/memory/decisions.md` are eliminated. `project-memory-foundation` owns this breaking change. This spec assumes shard files and `index.md` exist when promote-agent first runs. If they do not exist (old layout still in place), promote-agent MUST fail with: "Shard layout not found — run `project-memory-foundation` migration before using this version of promote-agent."
- **Rollback plan**: Revert the commit. All agent/skill edits are additive (new sections, new parameters). The shard layout migration is owned by foundation; reverting this spec does not restore old `invariants.md`/`decisions.md`. Legacy specs without `## Invariants` sections continue to promote correctly (FR-10). Rolling back is safe for agent behavior; the storage migration must be separately reverted.
- **Zero-downtime**: Yes. There is no running service. The new `mode` parameter on test-agent is optional (defaults to `validator`, preserving existing callers). The new Step 2.75 gate runs on every feature going forward; pre-existing features don't re-run it.
- **Deployment order**: Wave 3 in the project-memory rollout. `project-memory-foundation` ships first (Wave 1) and performs the layout migration. `project-memory-onboard` + `project-memory-consumers` run in parallel (Wave 2). This spec is Wave 3.
- **Stale data/cache**: Existing `dark-factory/results/` output files are consumed in-cycle and not migrated. The new Step 2.75 output is additive.
- **Coordination with playwright-lifecycle**: `playwright-lifecycle` also touches `implementation-agent.md` and `test-agent.md`. Merge must be serialized — whichever ships later rebases onto the other.

## API Endpoints

N/A — no runtime APIs. All behavior is in agent/skill prompts.

## Business Rules

- BR-1: **Memory files are single-writer at runtime.** promote-agent is the only agent that writes `dark-factory/memory/*.md` (all shard files, `index.md`, `ledger.md`) at runtime. df-cleanup is the maintenance exception writer for `index.md` only (via `--rebuild-index`). onboard-agent writes at bootstrap (foundation / onboard specs). No other agent writes at runtime. — Prevents worktree merge conflicts; locked by DEC-TBD-a below.
- BR-2: **IDs are zero-padded 4-digit sequential, monotonic, never reused.** promote-agent computes `max(existing) + 1` per type, using the index as fast path and shard scan as fallback. Superseded/deprecated entries keep their IDs forever. — Locked by foundation BR-3.
- BR-3: **Ledger appends on every promotion, even when zero invariants/decisions declared.** FEAT-NNNN entries reflect promoted features regardless of whether they introduced memory entries. — Ledger is the authoritative feature history; silent gaps hurt forensic value.
- BR-4: **Pre-existing regressions warn but do NOT block promotion.** A failing promoted test whose Guards do not reference this spec's files is a signal, not a failure. — Locked by shared context decision; prevents "one stale test halts the whole shop" failure mode.
- BR-5: **Expected regressions do NOT loop back to code-agent.** If the spec declared `## Invariants > Modifies INV-X` or `Supersedes INV-X`, architect pre-approved the change; the promoted test enforcing INV-X is obsolete and will be updated by a future promote-agent cycle. — Supports legitimate invariant evolution.
- BR-6: **Advisor-mode and validator-mode are NEVER mixed in one spawn.** A test-agent invocation processes inputs for exactly one mode. Mode-mixing is a hard barrier enforced at the agent's own process start. — Mode isolation is the mechanism that prevents accidental holdout leakage during advisory calls.
- BR-7: **Advisor-mode output is structurally constrained to enumerated categories + scenario pointers.** Free-form prose is forbidden because it is the primary holdout-leakage vector. The `missing` category outputs INV-IDs only — no full entry text resolved from the index. — The barrier's practical enforcement; prevents transitive index leakage.
- BR-8: **Holdout content NEVER leaks to architect-agent via advisor output.** Advisor output is returned to spec-agent, which revises scenarios (not spec). architect-agent reads only the spec — it does not see advisor output. — Existing architect information barrier preserved.
- BR-9: **implementation-agent NEVER spawns test-agent with `mode: advisor`.** Advisor is a spec-agent tool; implementation-agent only runs validator. — Mode boundary enforcement at the orchestration layer.
- BR-10: **The ledger `gitSha` is the commit-BEFORE the cleanup commit**, not the cleanup commit itself. Documented in promote-agent.md so readers don't expect tautology. — Deterministic; avoids amend complexity.
- BR-11: **promote-agent ALWAYS re-reads both `index.md` AND the relevant shard file(s) at commit time** (not cached from start of run). If a developer manually edits memory between phases, or if a prior promote-agent in the same wave wrote between the initial read and this agent's commit, promote-agent's ID assignment reflects the latest state. — Robustness to out-of-band edits and same-wave concurrent promotions.
- BR-12: **Concurrency across specs in the same wave**: each promote-agent invocation runs serially at the end of its implementation-agent's lifecycle. Because waves are serialized (df-orchestrate's wave-execution semantics), two specs in the same wave do NOT both promote simultaneously — they promote in implementation-agent completion order. Each re-reads both index and shard(s) before writing, ensuring it sees the prior promote's state. — This is the "single-writer serialized by wave" guarantee.
- BR-13: **Memory health issues are reported, never auto-fixed.** df-cleanup surfaces all seven categories (MALFORMED_MEMORY, STALE_ENFORCEMENT, STALE_SOURCE, STALE_LEDGER, ORPHANED_SHARD, PHANTOM_INDEX, INDEX_HASH_MISMATCH); developer resolves. The only automated repair path is `--rebuild-index` (triggered explicitly by the developer). — Mirrors existing promoted-test health check behavior.
- BR-14: **`--rebuild-memory` rebuilds ledger AND index.** The ledger is rebuilt from promoted-tests.json. The index is then rebuilt by scanning all shards (same logic as `--rebuild-index`). Invariant/decision shard files are not rebuilt. — `--rebuild-index` can also be run standalone; `--rebuild-memory` does both.
- BR-15: **ORPHANED_SHARD is the chosen partial-failure recovery path.** When a shard write succeeds but an index update fails, the shard entry is left in place (not deleted). It becomes an orphaned entry detectable by df-cleanup `ORPHANED_SHARD` check and repairable by `--rebuild-index`. Deleting the shard entry on index failure is rejected as more destructive than leaving an orphan.
- BR-16: **Shard file integrity is preserved over index integrity in failure cases.** The shard is the ground truth; the index is a derived view. A stale or incomplete index is recoverable via `--rebuild-index`. A missing or deleted shard entry is not recoverable without re-onboarding.

## Error Handling

| Scenario | Response | Side Effects |
|----------|----------|--------------|
| promote-agent reads index and finds a gap in IDs (e.g., INV-0005 missing, INV-0006 exists) | Treat the sequence as already-consumed up to max; next ID is `max + 1`. Do NOT fill the gap. | Warning logged: "ID gap detected — proceeding with next-max" |
| promote-agent reads index but detects an ORPHANED_SHARD (shard has INV-NNNN not in index) | Use shard-scan fallback to determine true max ID; proceed with `max + 1`. Log: "Index stale — ORPHANED_SHARD detected. Using shard-scan for ID assignment." | Warning logged; shard scan used as ground truth |
| promote-agent encounters malformed YAML frontmatter in index or shard file | Log error; write nothing to memory; report to implementation-agent as promotion failure; preserve on-disk state | Manifest status stays `passed` (not `promoted`); developer must fix memory before retry |
| promote-agent shard write succeeds, index update fails | Log "ORPHANED_SHARD: {entry-id}"; leave shard entry in place; fail promotion; manifest stays `passed`; developer runs `--rebuild-index` | ORPHANED_SHARD condition created; repairable by `--rebuild-index` |
| promote-agent shard write fails | No index update; fail promotion; no orphan; rollback is no-op | Manifest stays `passed`; developer must investigate shard write error |
| promote-agent encounters a Modifies declaration whose target ID doesn't exist in index or any shard | Log error "Modifies target INV-NNNN not found in index or shards"; do NOT write; fail promotion | Developer must correct spec |
| promote-agent encounters a Supersedes declaration whose target ID doesn't exist | Same as above — fail promotion | Developer must correct spec |
| promote-agent encounters shard layout not present (old monolithic format still in place) | Fail with: "Shard layout not found — run `project-memory-foundation` migration before using this version of promote-agent." Do NOT attempt to write to old-format files. | Developer must run foundation migration first |
| Spec declares a `INV-TBD-x` placeholder without the required fields (e.g., missing `enforced_by` and `enforcement`) | promote-agent fails with "Invariant TBD-x missing mandatory field `enforced_by` OR `enforcement`"; promotion halts | Developer must correct spec; matches foundation schema requirement |
| test-agent in validator mode fails Step 2.75 because the project's test command can't be found | Log "No test command in project-profile.md — skipping Step 2.75"; set `regressionGate: { status: "skipped", reason: "no test command" }`; proceed with existing Step 2 result | Warning in run output |
| test-agent invoked with both `mode: validator` AND `mode: advisor` (caller bug) | Refuse to proceed; output error "Mode parameter ambiguous — exactly one of `validator` or `advisor` required"; exit | Caller must fix invocation |
| test-agent invoked with unknown mode string | Refuse to proceed; output error "Unknown mode `{value}` — legal values are `validator` or `advisor`"; exit | Caller must fix invocation |
| Advisor mode called without memory files present | Proceed; advisor output omits `missing` category and emits warning "memory not-yet-onboarded — missing-coverage check skipped" | Partial advisory |
| Advisor mode timeout | Return `{ status: "timeout", partial: {...} }`; spec-agent proceeds with original scenarios | Manifest `testAdvisoryCompleted: false` |
| implementation-agent receives a pre-existing-regression classification from test-agent | Emit loud warning block with the promoted test path, the guarding feature (derivable from annotation), and the suggestion `/df-debug {feature}`; proceed with promotion | Manifest `preExistingRegression: true` |
| implementation-agent receives an expected-regression classification | Emit info note; proceed with promotion; flag for future promote-agent to update the guarded promoted test | Manifest `expectedRegression: true` |
| df-cleanup memory health check finds malformed shard or index | Report appropriate category (MALFORMED_MEMORY, ORPHANED_SHARD, PHANTOM_INDEX, INDEX_HASH_MISMATCH); do NOT auto-fix | None |
| df-cleanup `--rebuild-index` invoked — outputs diff of index changes | Scan all shards, regenerate index.md, output diff for developer review | index.md rewritten; shard files untouched |
| df-cleanup `--rebuild-memory` invoked when no `promoted-tests.json` exists | Report "No promoted tests to rebuild ledger from. Ledger rebuild is a no-op. Index rebuild skipped (no ledger entries)." | None |
| df-cleanup `--rebuild-memory` invoked when memory dir doesn't exist | Report "Memory directory not found. Run `/df-onboard` first." | None |
| df-cleanup detects `entryCount` in index > 500 | Emit WARNING: "Memory index has grown large ({N} entries). Consider archiving stale entries." | Advisory only; no block |
| Two specs in the same wave both declare `INV-TBD-a` | Sequential promotion → first gets `INV-NNNN`, second re-reads index AND shard, gets `INV-(NNNN+1)` | Documented in BR-12 |

## Acceptance Criteria

- [ ] AC-1: `.claude/agents/promote-agent.md` documents the memory write process: reads index + relevant shard files, determines domain for shard routing, assigns next sequential ID (fast path: index; fallback: shard scan), materializes Introduces/Modifies/Supersedes/References entries into correct shard, updates index (shard-first, index-last ordering), appends ledger, updates frontmatter.
- [ ] AC-2: `.claude/agents/promote-agent.md` contains the phrase "single-writer" in reference to memory files and names itself as the sole runtime writer (with df-cleanup --rebuild-index as the documented maintenance exception).
- [ ] AC-3: `.claude/agents/promote-agent.md` documents `gitSha` as the commit-BEFORE the cleanup commit and explains why (no amend).
- [ ] AC-4: `.claude/agents/promote-agent.md` documents the always-append ledger rule (FR-7, BR-3) including zero-invariant specs.
- [ ] AC-5: `.claude/agents/promote-agent.md` documents tolerance for legacy specs without `## Invariants` / `## Decisions` sections (FR-10).
- [ ] AC-5b: `.claude/agents/promote-agent.md` documents the ORPHANED_SHARD rollback path: shard entry left in place, index update not attempted again, failure reported, `--rebuild-index` prescribed as resolution (NFR-1).
- [ ] AC-5c: `.claude/agents/promote-agent.md` documents the shard-scan fallback for ID assignment when the index is stale (FR-2).
- [ ] AC-6: `.claude/agents/test-agent.md` documents the `mode` parameter with enum `validator` | `advisor`.
- [ ] AC-7: `.claude/agents/test-agent.md` contains a Step 2.75 section describing the full-suite regression gate and the four classification classes (new-holdout, invariant-regression, pre-existing-regression, expected-regression).
- [ ] AC-8: `.claude/agents/test-agent.md` documents the structured output schema including `preExistingRegression` and `expectedRegression` booleans.
- [ ] AC-9: `.claude/agents/test-agent.md` documents the advisor-mode process including inputs (spec, scenarios, memory index + shards, promoted-tests), outputs (enumerated categories), prohibited behaviors (no writes, no test execution, no scenario edits, no full entry text in `missing` output), the soft cap (~60s), one-round-max, and the structural-output barrier.
- [ ] AC-10: `.claude/agents/test-agent.md` contains an explicit statement that advisor and validator modes are NEVER mixed in one spawn and that mode must be validated at spawn start.
- [ ] AC-10b: `.claude/agents/test-agent.md` contains an explicit statement that in advisor mode's `missing` category, only INV-IDs are emitted — the advisor MUST NOT cross-reference the index to resolve full entry text (FR-17).
- [ ] AC-11: `.claude/agents/implementation-agent.md` documents routing for all four Step 2.75 result classes (new-holdout → code-agent, invariant-regression → code-agent with sanitized description, pre-existing-regression → warn+proceed, expected-regression → note+proceed).
- [ ] AC-12: `.claude/agents/implementation-agent.md` contains a hard rule: "implementation-agent MUST NEVER spawn test-agent with `mode: advisor`".
- [ ] AC-13: `.claude/agents/implementation-agent.md` documents pre-flight gate and Step 2.75 gate as distinct checkpoints, both required.
- [ ] AC-14: `.claude/skills/df-intake/SKILL.md` contains a Step 5.5 Test-Advisor Handoff section between Step 5 and Step 6 with the process: spawn advisor → spec-agent revises → summary line emitted.
- [ ] AC-15: `.claude/skills/df-intake/SKILL.md` documents advisor timeout/error → proceed with original scenarios, set `testAdvisoryCompleted: false`.
- [ ] AC-16: `.claude/skills/df-orchestrate/SKILL.md` documents the Step 2.75 full-suite regression gate as distinct from the pre-flight gate.
- [ ] AC-17: `.claude/skills/df-orchestrate/SKILL.md` documents the pre-existing regression UX (loud warning, suggest `/df-debug`) and mentions manifest `preExistingRegression` / `expectedRegression` fields.
- [ ] AC-18: `.claude/skills/df-cleanup/SKILL.md` documents a Memory Health Check step with all seven detection categories (MALFORMED_MEMORY, STALE_ENFORCEMENT, STALE_SOURCE, STALE_LEDGER, ORPHANED_SHARD, PHANTOM_INDEX, INDEX_HASH_MISMATCH).
- [ ] AC-18b: `.claude/skills/df-cleanup/SKILL.md` documents the `--rebuild-index` flag: scans all shards, regenerates index.md, outputs diff, never touches shards, documented as maintenance exception writer.
- [ ] AC-18c: `.claude/skills/df-cleanup/SKILL.md` documents the token budget observability warning (entry count > 500 → WARNING).
- [ ] AC-19: `.claude/skills/df-cleanup/SKILL.md` documents the `--rebuild-memory` flag: rebuilds ledger from promoted-tests.json, THEN rebuilds index (same as `--rebuild-index`), invariants/decisions shard files not auto-rebuilt.
- [ ] AC-20: Every changed `.claude/agents/*.md` and `.claude/skills/*/SKILL.md` file has an exact-content mirror in `plugins/dark-factory/`.
- [ ] AC-21: `tests/dark-factory-setup.test.js` contains assertions locking FR-1..FR-29b (see Edge Cases and traceability below for the specific assertion mapping).
- [ ] AC-22: `tests/dark-factory-contracts.test.js` contains plugin-mirror parity assertions for every edited file.
- [ ] AC-23: `node --test tests/` passes after these changes.
- [ ] AC-24: The spec does NOT edit `.claude/agents/onboard-agent.md`, `spec-agent.md`, `architect-agent.md`, `code-agent.md`, `debug-agent.md`, or `codemap-agent.md` (those are owned by other sub-specs).
- [ ] AC-25: The spec does NOT edit `dark-factory/memory/*.md` in source form (memory is runtime-written).
- [ ] AC-26: The spec does NOT edit `dark-factory/templates/*.md` except where consumers-owned files would dictate (none in this spec).
- [ ] AC-27: The spec does NOT edit `.claude/rules/*.md` (foundation-owned).

## Edge Cases

- EC-1: **Spec declares `INV-TBD-a` and `INV-TBD-b`; both introduces.** promote-agent determines domain for each, writes to correct shard(s), updates index with two new rows, assigns INV-0001 and INV-0002 (or next-available pair). **Expected**: predictable sequential assignment; two index rows; shard files contain new headings.
- EC-2: **Spec declares `INV-TBD-a` that Supersedes INV-0003.** promote-agent writes new entry to shard (Introduces flow), updates INV-0003's shard entry (status: superseded), updates INV-0003's index row (status bracket), adds new index row for new entry. INV-0003 remains in shard (BR-3). **Expected**: supersession chain preserved; old entry not deleted from shard or index.
- EC-3: **Spec declares Modifies on INV-0003's `rule` field.** promote-agent looks up INV-0003 in index to find shard filename, updates the shard entry in place, updates INV-0003's index row in place. **Expected**: rule updated in shard, history preserves prior value, index row reflects updated status.
- EC-4: **Spec declares References to INV-0003 without modification.** promote-agent looks up shard via index, appends spec name to `referencedBy` in shard, does NOT modify INV-0003's index row. **Expected**: referencedBy link added in shard only.
- EC-5: **Two specs in the SAME wave both introduce invariants.** Wave executes implementation-agents in parallel, but each promote-agent runs serially. Whichever finishes first writes to shard and updates index; the second re-reads BOTH index AND relevant shard, sees the first promote's entries, assigns next-available ID. **Expected**: no collision; BR-12.
- EC-6: **Spec declares zero invariants, zero decisions.** promote-agent appends FEAT entry to ledger with empty `introducedInvariants: []`, `introducedDecisions: []`. No shard writes. No index update (no new entries). **Expected**: ledger grows by one row; index unchanged; no shard writes.
- EC-7: **Legacy spec without `## Invariants` / `## Decisions` sections** (pre-consumers-spec spec). promote-agent skips materialization; appends FEAT entry with empty invariants/decisions. **Expected**: no crash; ledger still records the promotion; no shard or index writes.
- EC-8: **Developer manually edits a shard file during a spec's implementation phase** (between df-intake and promotion). When promote-agent runs, it re-reads index AND relevant shard and computes IDs off the current state. Developer's edit is preserved; shard content takes precedence over any cached state. **Expected**: no stomping; BR-11.
- EC-9: **Step 2.75 finds a promoted test failure where the Guards annotation is empty or missing.** Classification: pre-existing-regression. Warning includes "Guards annotation missing on {path}". **Expected**: classified correctly; warning surfaces.
- EC-10: **Step 2.75 finds a promoted test failure where Guards lists multiple files, SOME overlapping touched files and SOME not.** Classification: invariant-regression (ANY overlap counts). **Expected**: invariant-regression; behavioral description cites overlapping files.
- EC-11: **Step 2.75 finds a promoted test that enforces INV-0003, and this spec's `## Invariants > Modifies: INV-0003`.** Classification: expected-regression (BR-5). **Expected**: `expectedRegression: true` in manifest; no code-agent loop.
- EC-12: **Step 2.75 finds both an invariant-regression AND a pre-existing-regression in the same run.** Both classes are recorded. invariant-regression triggers the code-agent loop; pre-existing-regression is deferred (warn+proceed). **Expected**: both flags surface correctly; no conflation.
- EC-13: **Advisor-mode test-agent finds scenario duplication** — an existing promoted test already covers the same behavior. Output category `dedup` populated with feature name + path. **Expected**: advisor surfaces, spec-agent acts.
- EC-14: **Advisor-mode test-agent finds missing coverage** — spec references INV-0003 but no scenario exercises that behavior. Output: `missing: ["INV-0003"]` — ID only, no full entry text resolved. **Expected**: advisor surfaces ID; spec-agent adds coverage.
- EC-15: **Advisor-mode output accidentally includes a free-form sentence describing holdout content.** Schema validation rejects it. **Expected**: malformed advisor output rejected.
- EC-16: **Advisor-mode spawned alongside validator-mode in the same message.** Both are DIFFERENT spawns (separate invocations). Each validates its own `mode` at start. Mixing in one spawn is rejected (FR-19). **Expected**: two valid separate spawns OR one rejection.
- EC-17: **implementation-agent accidentally spawns test-agent with `mode: advisor`.** Hard-rule violation. test-agent refuses. **Expected**: invocation fails with clear error.
- EC-18: **df-intake Step 5.5 advisor timeout.** spec-agent proceeds with original scenarios, emits warning, writes manifest `testAdvisoryCompleted: false`. Does NOT retry. **Expected**: intake completes; no blocker.
- EC-19: **df-intake Step 5.5 advisor returns but spec-agent disagrees with its recommendation.** spec-agent is authoritative; it MAY accept or reject any advisory item. **Expected**: spec-agent revises based on its own judgment.
- EC-20: **df-orchestrate final summary with mix of passed/failed/pre-existing/expected.** Final block shows: standard passed list, failed list, blocked list, PLUS new "Pre-existing regressions flagged" block and "Expected regressions (invariant evolution)" block. **Expected**: clean separation; pre-existing does not count as failure.
- EC-21: **df-cleanup on a repo where memory/ doesn't exist (greenfield or pre-onboarded).** Memory Health Check emits "Memory not yet onboarded — skipping health check. Run `/df-onboard` to initialize." Cleanup proceeds with other steps. **Expected**: not-yet-onboarded tolerated; no crash.
- EC-22: **df-cleanup with `--rebuild-memory` on a repo whose ledger has entries but promoted-tests.json is missing.** Report "Cannot rebuild ledger — `promoted-tests.json` not found." Do NOT delete existing ledger. **Expected**: non-destructive failure.
- EC-23: **Plugin mirror drift after these edits** — developer edits `.claude/agents/test-agent.md` but forgets the plugin mirror. Contract test fails. **Expected**: build blocks until synced.
- EC-24: **promote-agent shard write succeeds, then index update fails.** Shard entry exists but is un-indexed (ORPHANED_SHARD). Promote-agent logs failure, leaves shard entry as-is, reports failure to implementation-agent. Developer runs `--rebuild-index` to repair. Manifest stays at `passed`. **Expected**: ORPHANED_SHARD condition; recoverable by `--rebuild-index`; NFR-1.
- EC-25: **Ledger `gitSha` appears to reference the commit that the ledger entry is in.** This is the commit-BEFORE the cleanup commit (BR-10, NFR-3). promote-agent.md documents this clearly. **Expected**: no reader confusion.
- EC-26: **Spec declares both Introduces `INV-TBD-a` and References `INV-0003`.** Both are processed: INV-TBD-a written to shard + index row added; INV-0003's shard entry gets spec appended to `referencedBy` (index row unchanged). **Expected**: both ops succeed independently.
- EC-27: **FEAT ledger entry for `project-memory-foundation` did not get retro-backfilled.** df-cleanup memory health check flags `STALE_LEDGER`. **Expected**: gap is surfaced; developer runs `/df-onboard` or `/df-cleanup --rebuild-memory`.
- EC-28: **df-cleanup detects ORPHANED_SHARD** — `invariants-security.md` contains `## INV-0007` heading but index has no row for INV-0007. df-cleanup reports: "ORPHANED_SHARD: INV-0007 found in invariants-security.md but missing from index.md. Run `--rebuild-index` to repair." Does NOT auto-fix. **Expected**: WARNING surfaced; shard file untouched.
- EC-29: **df-cleanup detects PHANTOM_INDEX** — index has a row for INV-0009 but no shard file contains `## INV-0009`. df-cleanup reports: "PHANTOM_INDEX: INV-0009 referenced in index.md but not found in any shard. This is a data-loss condition. Run `--rebuild-index` to remove the phantom row." Does NOT auto-fix. **Expected**: ERROR surfaced.
- EC-30: **df-cleanup detects INDEX_HASH_MISMATCH** — index frontmatter gitHash is `abc123` but `invariants-security.md` frontmatter gitHash is `def456`. df-cleanup reports: "INDEX_HASH_MISMATCH: index gitHash `abc123` differs from invariants-security.md gitHash `def456`. A write may have been interrupted mid-operation." Does NOT auto-fix. **Expected**: WARNING surfaced.
- EC-31: **`--rebuild-index` scans all shards and regenerates index.md.** Output includes a diff of what changed (e.g., "Added: INV-0007 row; Removed: INV-0009 phantom row"). Shard files are untouched. **Expected**: index rebuilt; diff shown; shard files preserved.
- EC-32: **`--rebuild-memory` rebuilds ledger AND then calls --rebuild-index logic.** After ledger is rebuilt from promoted-tests.json, index is also rebuilt by scanning all shards. Single invocation covers both. **Expected**: both ledger and index rebuilt; shard files untouched.
- EC-33: **Index entry count > 500.** df-cleanup emits WARNING: "Memory index has grown large (512 entries). Consider archiving stale entries." Cleanup proceeds normally. **Expected**: advisory warning only; no block.
- EC-34: **promote-agent sees index but it's a stale read** (prior promote-agent in same wave wrote an entry between this agent's initial index read and commit time). Re-read at commit time catches the new entry. ID assignment uses updated max. **Expected**: no collision; BR-11 + BR-12.
- EC-35: **test-agent advisor's `missing` category output for a spec referencing INV-0003.** Output: `missing: ["INV-0003"]`. The advisor does NOT look up index.md to find the full text of INV-0003 and include it in the output. **Expected**: ID-only output; no index content in advisor response.

## Dependencies

**Depends on**: `project-memory-foundation` (memory directory + shard layout + index.md creation + templates + rule plumbing), `project-memory-consumers` (spec-agent emits `## Invariants` / `## Decisions` sections that promote-agent parses), `project-memory-onboard` (ledger retro-backfill so ledger exists at first lifecycle promotion — not strictly required for runtime correctness but avoids ID gap).

**Depended on by**: none (lifecycle is the terminal wave).

**Group**: `project-memory`.

**Wave**: 3. Wave 1 = foundation (including shard layout migration). Wave 2 = onboard + consumers (parallel). Wave 3 = this spec.

**Serialization with active unrelated specs**: `playwright-lifecycle` is currently active and touches `implementation-agent.md` and `test-agent.md`. The merge must be serialized — whichever ships second rebases onto the first.

This spec introduces no new npm dependencies (zero-dep posture preserved).

## Implementation Size Estimate

- **Scope size**: large — approximately 14 files across agents, skills, mirrors, and tests.
- **File list**:
  - `.claude/agents/promote-agent.md` + `plugins/dark-factory/agents/promote-agent.md`
  - `.claude/agents/test-agent.md` + `plugins/dark-factory/agents/test-agent.md`
  - `.claude/agents/implementation-agent.md` + `plugins/dark-factory/agents/implementation-agent.md`
  - `.claude/skills/df-intake/SKILL.md` + `plugins/dark-factory/skills/df-intake/SKILL.md`
  - `.claude/skills/df-orchestrate/SKILL.md` + `plugins/dark-factory/skills/df-orchestrate/SKILL.md`
  - `.claude/skills/df-cleanup/SKILL.md` + `plugins/dark-factory/skills/df-cleanup/SKILL.md`
  - `tests/dark-factory-setup.test.js` (assertions added only; file not replaced)
  - `tests/dark-factory-contracts.test.js` (mirror parity assertions added only)

- **Suggested parallel tracks**: 3–4 tracks with ZERO file overlap.

  - **Track A — promote-agent (memory write)**:
    - `.claude/agents/promote-agent.md`
    - `plugins/dark-factory/agents/promote-agent.md`
    - Scope: index read, shard read, ID assignment (fast path + shard-scan fallback), domain-based shard routing, materialization, Modifies/Supersedes/References handling, shard-first + index-last ordering, ORPHANED_SHARD rollback path, ledger append, frontmatter update (index + shard), re-read at commit time, documentation of gitSha commit-before.

  - **Track B — test-agent (advisor + validator Step 2.75)**:
    - `.claude/agents/test-agent.md`
    - `plugins/dark-factory/agents/test-agent.md`
    - Scope: mode parameter, advisor mode process + barriers (including `missing` ID-only rule), validator Step 2.75 full-suite gate + four-class classification, structured output schema.

  - **Track C — implementation-agent (routing)**:
    - `.claude/agents/implementation-agent.md`
    - `plugins/dark-factory/agents/implementation-agent.md`
    - Scope: route new result classes, hard-rule no-advisor-spawn, pre-flight vs Step 2.75 documentation, memory-entry summary forwarding to code-agent.

  - **Track D — skills (df-intake Step 5.5, df-orchestrate docs, df-cleanup health + --rebuild-memory + --rebuild-index) + tests**:
    - `.claude/skills/df-intake/SKILL.md` + mirror
    - `.claude/skills/df-orchestrate/SKILL.md` + mirror
    - `.claude/skills/df-cleanup/SKILL.md` + mirror
    - `tests/dark-factory-setup.test.js` (append assertions only)
    - `tests/dark-factory-contracts.test.js` (append mirror parity only)

## Invariants

This spec introduces the following invariants. `promote-agent` will assign permanent IDs at promotion time; until then they carry `INV-TBD-*` placeholders.

### Introduces

- **INV-TBD-a: Memory is a single-writer resource at runtime — only promote-agent writes `dark-factory/memory/*.md` at runtime (df-cleanup --rebuild-index is the documented maintenance exception for index.md only).**
  - **rule**: At runtime, the only agent that may write to any `dark-factory/memory/*.md` file (all shard files, index.md, ledger.md) is promote-agent. df-cleanup --rebuild-index is the sole documented maintenance exception for index.md only. onboard-agent writes at bootstrap only (fenced exception, owned by `project-memory-onboard`). No other agent writes these files at runtime.
  - **scope.modules**: `.claude/agents/`, `plugins/dark-factory/agents/`
  - **scope.entities**: `dark-factory/memory/` (all files)
  - **source**: `declared-by-spec`
  - **sourceRef**: `dark-factory/specs/features/project-memory-lifecycle.spec.md`
  - **domain**: architecture
  - **enforced_by**: `tests/dark-factory-setup.test.js` (assertions checking no other agent's prompt contains write operations against `dark-factory/memory/`)
  - **guards**: `.claude/agents/promote-agent.md`, `plugins/dark-factory/agents/promote-agent.md`, and every other agent file (asserts negative case)
  - **rationale**: Prevents merge conflicts across parallel worktrees; DEC-TBD-a.

- **INV-TBD-b: test-agent mode isolation — advisor-mode and validator-mode are NEVER mixed in one spawn and NEVER co-invoked as the same agent instance.**
  - **rule**: A test-agent spawn processes inputs for exactly one `mode` value (`validator` or `advisor`). The agent validates the mode parameter at process start and refuses to proceed on ambiguity or missing value.
  - **scope.modules**: `.claude/agents/test-agent.md`, `plugins/dark-factory/agents/test-agent.md`, `.claude/skills/df-intake/SKILL.md`, `.claude/agents/implementation-agent.md`
  - **scope.entities**: test-agent spawn protocol
  - **source**: `declared-by-spec`
  - **sourceRef**: `dark-factory/specs/features/project-memory-lifecycle.spec.md`
  - **domain**: architecture
  - **enforced_by**: `tests/dark-factory-setup.test.js` (assertion: test-agent.md contains mode-validation prose + refusal phrase; df-intake.md only spawns advisor; implementation-agent.md never mentions `mode: advisor`)
  - **guards**: `.claude/agents/test-agent.md`, `.claude/skills/df-intake/SKILL.md`, `.claude/agents/implementation-agent.md`, and their plugin mirrors
  - **rationale**: Spawn-level barrier is the only defense against mode-mixing; without it, an advisor call could accidentally execute validator-scope writes or vice versa.

- **INV-TBD-c: Holdout content NEVER leaks to architect-agent via advisor-mode output.**
  - **rule**: Advisor-mode test-agent returns structured output with enumerated categories + scenario-path pointers. The output contains no free-form prose that quotes, paraphrases, or summarizes holdout scenario text. The `missing` category outputs INV-IDs only — no full entry text resolved from the index. architect-agent NEVER receives advisor output — it reads only the spec. spec-agent receives advisor output and uses it to revise scenarios; the revised scenarios remain under the existing holdout barrier (architect does not see them).
  - **scope.modules**: `.claude/agents/test-agent.md`, `.claude/agents/architect-agent.md`, `.claude/skills/df-intake/SKILL.md`
  - **scope.entities**: advisor-mode output schema, information-barrier graph
  - **source**: `declared-by-spec`
  - **sourceRef**: `dark-factory/specs/features/project-memory-lifecycle.spec.md`
  - **domain**: security
  - **enforced_by**: `tests/dark-factory-setup.test.js` (assertion: test-agent.md advisor-mode output schema is enumerated-only with ID-only missing category; df-intake.md does not pass advisor output to architect-agent; architect-agent.md is unchanged — no advisor input path)
  - **guards**: `.claude/agents/test-agent.md`, `.claude/skills/df-intake/SKILL.md`, `.claude/agents/architect-agent.md`
  - **rationale**: Free-form prose is the primary leakage vector; structured-output-only narrows the surface to near-zero. ID-only in `missing` prevents transitive index content exposure.

- **INV-TBD-d: Pre-existing regression does not block feature promotion — surface to developer, record in manifest, proceed.**
  - **rule**: When Step 2.75 classifies a failing promoted test as pre-existing-regression (Guards annotation references zero files touched by this spec), implementation-agent emits a loud warning, sets manifest `preExistingRegression: true`, and proceeds with promotion. It does NOT loop back to code-agent.
  - **scope.modules**: `.claude/agents/implementation-agent.md`, `.claude/agents/test-agent.md`, `.claude/skills/df-orchestrate/SKILL.md`
  - **scope.entities**: Step 2.75 classification routing
  - **source**: `declared-by-spec`
  - **sourceRef**: `dark-factory/specs/features/project-memory-lifecycle.spec.md`
  - **domain**: architecture
  - **enforced_by**: `tests/dark-factory-setup.test.js` (assertion: implementation-agent.md contains "pre-existing regression" routing prose with "do not loop" + "proceed"; df-orchestrate.md surfaces the warning in final summary)
  - **guards**: `.claude/agents/implementation-agent.md`, `.claude/skills/df-orchestrate/SKILL.md`, `.claude/agents/test-agent.md`
  - **rationale**: Prevents "one flaky old test halts the whole shop" failure mode. Lead C emphasized this explicitly.

- **INV-TBD-e: Shard-first, index-last write ordering — partial promote-agent failures always produce ORPHANED_SHARD (detectable) rather than PHANTOM_INDEX (invisible data loss).**
  - **rule**: promote-agent MUST write to the shard file before updating index.md. If the shard write succeeds but the index update fails, the result is an ORPHANED_SHARD condition — the entry exists in the shard but is missing from the index. This is detectable by df-cleanup and repairable by `--rebuild-index`. Writing to the index before the shard would produce a PHANTOM_INDEX condition — an index row pointing to a non-existent shard entry — which is a data-loss condition and cannot be self-repaired.
  - **scope.modules**: `.claude/agents/promote-agent.md`, `plugins/dark-factory/agents/promote-agent.md`
  - **scope.entities**: promote-agent write protocol, `dark-factory/memory/index.md`, shard files
  - **source**: `declared-by-spec`
  - **sourceRef**: `dark-factory/specs/features/project-memory-lifecycle.spec.md`
  - **domain**: architecture
  - **enforced_by**: `tests/dark-factory-setup.test.js` (assertion: promote-agent.md documents shard-first write ordering and ORPHANED_SHARD rollback path)
  - **guards**: `.claude/agents/promote-agent.md`, `plugins/dark-factory/agents/promote-agent.md`
  - **rationale**: Fail-safe ordering; the less-bad failure mode is chosen by design.

### Modifies

None. This spec introduces new invariants but does not modify any existing ones.

### Supersedes

None.

### References

- (From `project-memory-foundation` — once promote-agent has materialized foundation's decisions into DEC-NNNN): the DEC entries locking YAML+markdown format, shard layout, index format, single-writer protocol, enforced_by escape hatch, domain taxonomy, and non-blocking missing-memory. This spec operationalizes all of these.

## Decisions

This spec introduces the following decisions. `promote-agent` will assign permanent IDs at promotion time.

### Introduces

- **DEC-TBD-a: promote-agent is the sole runtime writer of project memory, serialized per wave.**
  - **context**: Multiple agents writing to memory files across parallel worktrees would create merge conflicts on every promotion. Need a concurrency-safe write protocol.
  - **decision**: promote-agent is the single runtime writer. It runs serially at the end of each implementation-agent's lifecycle. Because df-orchestrate serializes waves, and within a wave each implementation-agent's promote-agent runs after its own code-agents complete, no two promote-agent invocations write memory simultaneously. onboard-agent is the fenced bootstrap-time exception. df-cleanup is the fenced maintenance exception for index.md only.
  - **rationale**: Simplest concurrency model that works given existing wave semantics. No new coordination primitives needed.
  - **alternatives considered**:
    - Each implementation-agent writes at ExitWorktree — **rejected**: high merge conflict risk on shared files.
    - Pending-invariants staging directory applied by orchestrator — **rejected**: adds coordination complexity; low value-add over sole-writer.
    - Per-worktree memory copies, merged on main — **rejected**: requires a merge algorithm for YAML+markdown which doesn't exist.
  - **domain**: architecture
  - **status**: active
  - **introducedBy**: `project-memory-lifecycle`

- **DEC-TBD-b: Full-suite regression gate always runs in Step 2.75 (no tiering in v1).**
  - **context**: Step 2.75 catches invariants broken silently by new features. Running the full promoted test suite is the simplest way to guarantee coverage but may become slow as the suite grows.
  - **decision**: v1 always runs the full project test command + new holdout in one combined pass. No impacted-test selection, no `--skip` flag. Manifest records `regressionGate: { runtimeMs }` per NFR-2 to enable data-driven v2 optimization.
  - **rationale**: Simplicity and correctness first. Impacted-test selection is tempting but risks missing regressions when guards are stale. A `--skip` flag would be a loophole.
  - **alternatives considered**:
    - Impacted-test selection via Guards overlap — **rejected (v1)**: risk of missing regressions when Guards are stale.
    - `--skip-regression` flag — **rejected**: loophole.
    - Sampling (run random N%) — **rejected**: non-deterministic; hides regressions intermittently.
  - **domain**: architecture
  - **status**: active
  - **introducedBy**: `project-memory-lifecycle`

- **DEC-TBD-c: ORPHANED_SHARD is the chosen partial-failure recovery path for promote-agent; PHANTOM_INDEX is avoided by write ordering.**
  - **context**: When promote-agent writes a shard entry but fails to update the index, two recovery paths exist: (a) delete the shard entry and treat it as if the write never happened, or (b) leave the shard entry in place and treat it as an orphaned-but-recoverable condition. A third option — write index first, shard second — avoids this problem but introduces the PHANTOM_INDEX risk, which is worse.
  - **decision**: Write shard first, index last. On partial failure (shard written, index update failed), leave the shard entry in place (ORPHANED_SHARD). Do NOT delete it. Report failure. Prescribe `--rebuild-index` as the repair path. This is safer than deletion because the shard is the ground truth; deleting written data is more destructive than leaving a detectable orphan.
  - **rationale**: ORPHANED_SHARD is detectable and repairable. PHANTOM_INDEX is invisible data loss. Deletion of shard entries is irreversible. The chosen path maximizes recoverability.
  - **alternatives considered**:
    - Delete shard entry on index failure — **rejected**: destructive; data that was written is lost.
    - Write index first, shard second — **rejected**: creates PHANTOM_INDEX on index-write-success + shard-write-failure; phantom entries are invisible and cannot be detected by scanning shards.
    - Two-phase commit with a staging area — **rejected**: adds coordination complexity; ORPHANED_SHARD with `--rebuild-index` is sufficient.
  - **domain**: architecture
  - **status**: active
  - **introducedBy**: `project-memory-lifecycle`

### Modifies

None.

### Supersedes

None.

### References

- Foundation's DEC locking single-writer protocol (promote-agent is the writer) — this spec OPERATIONALIZES that decision rather than modifying it.
- Foundation's DEC locking shard layout and index format — this spec writes into that layout for the first time at runtime.

## Implementation Notes

Patterns to follow from the existing codebase:

- **Agent prompt style**: follow the existing tone of `promote-agent.md`, `test-agent.md`, `implementation-agent.md` — numbered step-by-step process, explicit "Your Constraints" block, explicit inputs/outputs. Keep edits additive (new sections / new steps) rather than rewriting existing sections.
- **Shard routing table in promote-agent**: document as a lookup table: `security → invariants-security.md / decisions-security.md`, `architecture → invariants-architecture.md / decisions-architecture.md`, `api → invariants-api.md / decisions-api.md`. Any unrecognized domain is a promotion error.
- **Index heading format**: document as `## {ID} [type:{invariant|decision}] [domain:{domain}] [tags:{comma-list}] [status:{active|superseded|deprecated}] [shard:{filename}]` followed by a one-line summary on the next line.
- **Skill prompt style**: `df-intake/SKILL.md`, `df-orchestrate/SKILL.md`, `df-cleanup/SKILL.md` all use numbered step headings. New steps should follow the same heading depth and format.
- **Plugin mirror**: every edit must be mirrored byte-for-byte in `plugins/dark-factory/`. Contract tests do literal content comparison.
- **Test style**: `tests/dark-factory-setup.test.js` uses `describe`/`it` blocks with `node:test`. Assertions are string-matching against agent/skill content. Follow the existing pattern — `const content = readFileSync(path, 'utf8'); assert.match(content, /expected phrase/);`. Group assertions into a `describe('project-memory-lifecycle')` block.
- **Memory write process in promote-agent** (expanded from original): document as a sub-process with explicit steps — (1) read index.md; (2) for each domain in spec's declarations, read the relevant shard file(s); (3) compute next IDs (fast path: max from index; fallback: shard scan); (4) re-read index AND relevant shards at commit time (BR-11); (5) for each section in spec's `## Invariants` / `## Decisions`, dispatch to Introduces/Modifies/Supersedes/References handler; each handler writes shard first, then index; (6) always append FEAT entry to ledger; (7) update frontmatter on each written shard + on index; (8) if any shard write fails → rollback written shards from snapshot; if index update fails after shard write → log ORPHANED_SHARD, report failure, leave shard entry in place.
- **`--rebuild-index` flow in df-cleanup**: (1) scan all files matching `invariants-*.md`, `decisions-*.md`, `ledger.md` in `dark-factory/memory/`; (2) for each file, read all headings matching `## {ID}` pattern; (3) for each heading, parse the bracket fields; (4) generate new index.md content from scratch; (5) diff against existing index.md; (6) output diff to developer; (7) write new index.md only if developer confirms (or always write if non-interactive — document the behavior choice).
- **Advisor output schema**: document as JSON-ish table in test-agent.md — `{ status, feasibility: [{ scenario, verdict }], flakiness: [{ scenario, verdict }], dedup: [{ scenario, matchedFeature, matchedPath }], missing: ["INV-ID", ...], infrastructureGaps: [{ scenario, missingFixture }] }`. The `missing` field is a plain array of ID strings — no objects, no descriptions, no resolved text.
- **Structural test pattern for information barriers**: follow the existing 50+ barrier assertions — each assertion reads the agent file content and checks that a forbidden operation is NOT mentioned OR that an explicit "NEVER" phrase IS present.
- **df-cleanup health check extension**: the new Memory Health Check should be Step 2.5 (between 2 and 3) with sub-steps: (2.5a) handle `--rebuild-memory` (also triggers --rebuild-index logic); (2.5b) handle `--rebuild-index` standalone; (2.5c) parse memory files (index + shards); (2.5d) per-entry enforcement / sourceRef / ledger cross-check; (2.5e) shard/index consistency checks (ORPHANED_SHARD, PHANTOM_INDEX, INDEX_HASH_MISMATCH); (2.5f) token budget observability.
- **Zero-dep posture**: no new `require()`s. All parsing uses existing `parseFrontmatter()` helper in tests. Agent/skill text is plain markdown — no new infra.

## Traceability

| Spec Item | Scenario(s) |
|-----------|-------------|
| FR-1 (promote-agent reads index + relevant shard) | P-01 |
| FR-2 (next-sequential ID: index fast path + shard-scan fallback) | P-02, H-01, H-NEW-07 |
| FR-3 (materialize INV-TBD / DEC-TBD into shard, update index) | P-03, P-NEW-01, H-02 |
| FR-4 (Modifies: update shard + update index row in place) | P-04, P-NEW-02, H-03 |
| FR-5 (Supersedes: old shard + old index row + new shard + new index row) | P-05, H-04 |
| FR-6 (References: append to referencedBy in shard; index row unchanged) | P-06, H-05 |
| FR-7 (ledger appends every promotion, even zero decls) | P-07, H-06 |
| FR-8 (frontmatter updated: lastUpdated, gitHash on shard + index) | P-08 |
| FR-9 (gitSha = commit-before cleanup commit) | P-09, H-07 |
| FR-10 (legacy specs without `## Invariants` tolerated) | P-10, H-08 |
| FR-11 (promote-agent sole writer; df-cleanup maintenance exception) | P-11 |
| FR-12 (test-agent mode parameter: validator default, advisor explicit) | P-12, H-09 |
| FR-13 (Step 2.75 runs full test suite) | P-13 |
| FR-14 (four-class classification, mutually exclusive) | P-14, P-15, P-16, P-17, H-10, H-11, H-12 |
| FR-15 (structured output schema with both regression booleans) | P-18 |
| FR-16 (advisor mode inputs: index + shards; forbidden behaviors) | P-19, H-13 |
| FR-17 (advisor structured output — enumerated categories; ID-only missing) | P-20, H-14, H-NEW-06 |
| FR-18 (advisor one round, ~60s cap, timeout → structured error) | P-21, H-15 |
| FR-19 (mode isolation — distinct spawns, mode validation) | P-22, H-16 |
| FR-20 (implementation-agent routing per class) | P-14, P-15, P-16, P-17 |
| FR-21 (implementation-agent NEVER spawns advisor) | P-23, H-17 |
| FR-22 (pre-flight vs Step 2.75 documented as distinct) | P-24 |
| FR-23 (memory-entry summary forwarded to code-agent) | P-25 |
| FR-24 (df-intake Step 5.5 structure) | P-26 |
| FR-25 (df-intake advisor timeout → proceed + `testAdvisoryCompleted: false`) | P-27, H-15 |
| FR-26 (df-orchestrate documents Step 2.75) | P-28 |
| FR-27 (df-orchestrate surfaces pre-existing regressions in final summary) | P-29, H-18 |
| FR-28 (df-cleanup memory health check: all 7 categories + token budget) | P-30, P-NEW-03, H-19, H-20, H-21, H-NEW-02, H-NEW-03, H-NEW-04 |
| FR-29 (df-cleanup `--rebuild-memory`: ledger + index rebuild) | P-31, H-22 |
| FR-29b (df-cleanup `--rebuild-index` flag) | P-NEW-04, H-NEW-05 |
| FR-30 (setup test assertions) | P-32 |
| FR-31 (contract test mirror parity) | P-33, H-23 |
| NFR-1 (shard-first, index-last; ORPHANED_SHARD rollback) | H-NEW-01, H-NEW-02, H-34 |
| BR-1 (single-writer at runtime; df-cleanup maintenance exception) | P-11, H-24 |
| BR-2 (IDs never reused) | H-01 |
| BR-3 (ledger always appends) | P-07, H-06 |
| BR-4 (pre-existing does not block) | P-16, H-11 |
| BR-5 (expected does not loop back) | P-17, H-12 |
| BR-6 (advisor/validator never mixed) | H-16 |
| BR-7 (advisor structured only; ID-only missing) | H-14, H-NEW-06 |
| BR-8 (no holdout leak to architect via advisor) | H-25 |
| BR-9 (implementation-agent never spawns advisor) | H-17 |
| BR-10 (gitSha commit-before) | P-09, H-07 |
| BR-11 (re-read index AND shard at commit time) | H-26 |
| BR-12 (same-wave serialization; re-read both files) | H-27 |
| BR-13 (health issues reported, not auto-fixed; all 7 categories) | P-30, P-NEW-03, H-19 |
| BR-14 (--rebuild-memory: ledger + index; shards untouched) | H-22 |
| BR-15 (ORPHANED_SHARD chosen recovery path) | H-NEW-01, H-NEW-02 |
| BR-16 (shard is ground truth; index is derived) | H-NEW-07 |
| EC-1 (two Introduces → sequential IDs, two index rows) | P-02, P-NEW-01 |
| EC-2 (Supersedes chain; old shard + index row updated) | P-05, H-04 |
| EC-3 (Modifies + history; index row updated in place) | P-04, P-NEW-02, H-03 |
| EC-4 (References dedup; index row unchanged) | P-06 |
| EC-5 (same-wave serialization; re-read both) | H-27 |
| EC-6 (zero-decl spec still appends ledger) | P-07 |
| EC-7 (legacy spec tolerance) | P-10, H-08 |
| EC-8 (developer manual edit between phases; re-read catches it) | H-26 |
| EC-9 (empty Guards → pre-existing) | H-28 |
| EC-10 (multi-file Guards with partial overlap → invariant) | H-10 |
| EC-11 (Modifies + promoted test enforces = expected) | P-17, H-12 |
| EC-12 (mixed invariant + pre-existing) | H-29 |
| EC-13 (advisor dedup surfaced) | P-19 |
| EC-14 (advisor missing-coverage by ID only) | H-30, H-NEW-06 |
| EC-15 (advisor free-form prose rejected) | H-14 |
| EC-16 (two spawns in one message — OK if distinct invocations) | H-16 |
| EC-17 (impl-agent advisor-spawn rejected) | H-17 |
| EC-18 (advisor timeout) | H-15 |
| EC-19 (spec-agent can reject advisor recommendations) | H-31 |
| EC-20 (final summary with pre-existing + expected) | H-18 |
| EC-21 (df-cleanup without memory) | H-32 |
| EC-22 (--rebuild-memory without promoted-tests.json) | H-33 |
| EC-23 (plugin mirror drift) | P-33, H-23 |
| EC-24 (ORPHANED_SHARD: shard written, index update fails) | H-34, H-NEW-02 |
| EC-25 (gitSha documented to prevent confusion) | P-09 |
| EC-26 (Introduces + References combined) | P-06 |
| EC-27 (STALE_LEDGER detection) | H-21 |
| EC-28 (ORPHANED_SHARD detection by df-cleanup) | P-NEW-03, H-NEW-02 |
| EC-29 (PHANTOM_INDEX detection by df-cleanup) | H-NEW-03 |
| EC-30 (INDEX_HASH_MISMATCH detection by df-cleanup) | H-NEW-04 |
| EC-31 (--rebuild-index regenerates index, outputs diff) | P-NEW-04, H-NEW-05 |
| EC-32 (--rebuild-memory also rebuilds index) | P-31, H-22 |
| EC-33 (entry count > 500 → token budget warning) | P-30 |
| EC-34 (promote re-reads at commit time; same-wave race) | H-26, H-27 |
| EC-35 (advisor missing: ID-only, no index lookup) | H-NEW-06 |
| AC-24 / AC-25 / AC-26 / AC-27 (out-of-scope files not touched) | H-35 |
