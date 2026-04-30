# Feature: token-opt-architect-phase

## Context

Gate 1 (architect spec review + findings.md generation) currently runs inside `implementation-agent` as Step 0. This means the developer is not present when the architect reviews the spec and approves or blocks it. The architect's review happens during a long autonomous implementation run, not during the interactive intake session where the developer is available for rapid back-and-forth.

The token budget cost of Gate 1 lands in implementation-agent's context window, which is already the most constrained agent in the pipeline (capped at 3,200 tokens compiled). The 3-agent parallel architect spawn for Tier 2/3 specs is the single heaviest operation in the pipeline, and running it inside the already-expensive implementation-agent context creates pressure against that cap.

This feature moves Gate 1 (architect spec review + findings.md write) to the end of `df-intake`, where the developer is present, enabling rapid spec revision feedback loops and decoupling the architect review token cost from the implementation-agent context budget. Gate 2, Gate 3, qa-agent, and code-agent all remain in implementation-agent.

## Design Intent

**Intent introduced**:
- `DI-TBD-a` — Gate 1 executes in df-intake (developer-present session), never in implementation-agent. The survival criterion: future features must not move any architect review back into implementation-agent Step 0. This is fragile because Step 0 is historically the natural home for "pre-flight" checks in implementation-agent, and the old code path will be referenced in tests that need updating whenever the pipeline is refactored.
- `DI-TBD-b` — The manifest entry is the handshake between df-intake and implementation-agent. The `architectReviewedAt` field is the single authoritative signal that Gate 1 is complete. Fragile: any manifest write that omits this field silently breaks the handshake without an obvious error.

**Existing intents touched**: None — DI shards are empty at this project stage.

**Drift risk**: The primary drift risk is that implementation-agent Step 0 is modified to re-add architect spawn logic (even partially, as a "fallback") by a code-agent that reads the old Step 0a/0c/0d pattern and infers it should be retained. The hard-fail guard (`architectReviewedAt` absent → STOP) is the explicit countermeasure; any softening of that fail-fast to a fallback-and-proceed would silently erode this feature's contract. The test assertions for the hard-fail path are the enforcement mechanism.

## Scope

### In Scope (this spec)

- Add df-intake Step 5.6: tier-aware architect review (same logic as current implementation-agent Step 0c), triggered after Step 5.5 test-advisor handoff and before Step 6 manifest update
- Write `{name}.findings.md` on APPROVED or APPROVED WITH NOTES verdict, same content and path as today
- BLOCKED handling in df-intake: spec-agent revises inline; max rounds exhausted → no manifest entry written, spec file stays on disk as draft; developer re-runs `/df-intake {name}` which detects the existing spec and resumes
- Write new manifest fields per approved entry: `architectReviewedAt` (ISO timestamp), `findingsPath` (path), `architectReviewedCodeHash` (git SHA)
- Replace implementation-agent Step 0a/0c/0d with: read `findingsPath` from manifest; if `architectReviewedAt` absent → hard-fail with prescribed message
- Staleness detection in df-orchestrate: compare `architectReviewedCodeHash` to current HEAD before spawning implementation-agent; if differs → re-run architect review (fresh architect-agent spawn), overwrite findings.md, update manifest fields
- Decomposed spec wave ordering for architect review: sub-specs with dependencies reviewed after their dependencies are APPROVED; independent sub-specs reviewed in parallel
- APPROVED WITH NOTES path: write findings.md with notes included, proceed to Step 6 normally
- Minor clarification in spec-agent.src.md: re-spawn during architect review can occur in df-intake phase, not only during implementation
- Update df-orchestrate state machine documentation: remove `ARCH_INVESTIGATE` and `ARCH_SPEC_REVIEW` states (those now enter in df-intake); add documentation that orchestrate starts from `QA_SCENARIO` for approved specs
- Migration note: existing active manifest entries (`playwright-lifecycle`, `project-memory-onboard`) must be updated with architect review results before this feature ships
- Test updates: `dark-factory-setup.test.js` ao-thin-impl-agent section, `dark-factory-contracts.test.js` mirror parity

### Out of Scope (explicitly deferred)

- Moving qa-agent to df-intake (stays in implementation-agent)
- Moving Gate 2 (coverage map review) to df-intake
- Moving Gate 3 (drift check) to df-intake
- Any change to how architect-agent itself works internally
- A `/df-intake --resume` flag (the existing spec-file detection is sufficient for resumption)
- Re-ordering or consolidating the 4 gates into fewer gates

### Scaling Path

If the pipeline is ever restructured to run entirely asynchronously (e.g., background jobs), the `architectReviewedAt` + `architectReviewedCodeHash` fields already provide the handshake primitives needed to validate gate completion without relying on session continuity.

## Requirements

### Functional

- FR-1: df-intake SHALL run Gate 1 (tier-aware architect spawn, same logic as current Step 0c) as Step 5.6, after Step 5.5 completes and before Step 6 manifest write — rationale: developer is present for fast revision cycles
- FR-2: df-intake Step 5.6 SHALL write `{name}.findings.md` to the same path used today (`dark-factory/specs/features/{name}.findings.md`) on any non-BLOCKED verdict (APPROVED or APPROVED WITH NOTES) — rationale: findings.md path contract is unchanged so code-agent's self-load logic needs no modification
- FR-3: df-intake Step 5.6 on BLOCKED verdict SHALL invoke spec-agent for inline revision (same spawn-on-blocked logic as current implementation-agent), with max 5 rounds total (matching existing Gate 1 cap) — rationale: same quality gate, same iteration budget
- FR-4: df-intake Step 5.6 on max rounds exhausted SHALL NOT write a manifest entry; the spec file remains on disk; developer re-runs `/df-intake {name}` — rationale: preserves spec work while signaling to developer that intervention is required
- FR-5: `/df-intake {name}` re-invoked when `dark-factory/specs/features/{name}.spec.md` already exists SHALL detect the existing spec and resume from Step 5.6 architect review phase, skipping Steps 1–5 — rationale: no duplicate spec investigation work
- FR-6: df-intake Step 6 SHALL write three new fields to the manifest entry: `architectReviewedAt` (ISO timestamp), `findingsPath` (full path to findings.md), `architectReviewedCodeHash` (output of `git rev-parse HEAD`) — rationale: handshake contract for implementation-agent and staleness detection for df-orchestrate
- FR-7: implementation-agent Step 0 replacement SHALL read `findingsPath` from manifest entry, then check for `architectReviewedAt` field; if absent, hard-fail with message: "Spec {name} has no architect review record. This spec was likely created before token-opt-architect-phase shipped. Re-run /df-intake {name} to complete architect review, then retry." — rationale: prevents silent run on unreviewed specs
- FR-8: implementation-agent SHALL NOT perform any architect spawn (Steps 0a, 0c, 0d are removed); the only pre-flight check before code-agent is the pre-flight test gate and the `architectReviewedAt` presence check — rationale: avoid duplicate Gate 1 execution
- FR-9: df-orchestrate SHALL read `architectReviewedCodeHash` from manifest before spawning implementation-agent; if it differs from `git rev-parse HEAD`, df-orchestrate SHALL re-run architect review (fresh architect-agent spawn with pre-written spec) before proceeding, overwrite findings.md, and update the three manifest fields — rationale: implementation always works from a current-codebase review
- FR-10: For decomposed spec sets, architect reviews SHALL run in wave order matching the `dependencies` array: sub-spec B that depends on sub-spec A must wait for A's Gate 1 APPROVED before B's Gate 1 begins; independent sub-specs MAY be reviewed in parallel — rationale: prevents reviewing a spec against a foundation that hasn't been approved yet
- FR-11: Legacy active manifest entries (those without `architectReviewedAt`) SHALL be documented in a migration note; the implementation MUST update them before the feature is considered shipped — rationale: prevents hard-fail on specs that predate this feature

### Non-Functional

- NFR-1: implementation-agent compiled token count MUST remain ≤ 3,200 tokens after removing Steps 0a/0c/0d — rationale: existing token cap test (P-09 in ao-thin-impl-agent) must continue to pass; removing Gate 1 from implementation-agent should relax, not tighten, that budget
- NFR-2: The BLOCKED path in df-intake MUST surface the architecture domain, round count, and specific blocker text to the developer — rationale: developer needs actionable context to revise scope
- NFR-3: findings.md MUST be written before Step 6 manifest write — rationale: manifest entry's `findingsPath` points to a file that must already exist when implementation-agent reads it
- NFR-4: The staleness re-run in df-orchestrate MUST emit a visible warning to the developer before spawning the architect review — rationale: re-running Gate 1 is expensive; developer should know it's happening and why

## Data Model

### manifest.json entry schema additions

New required fields on every `features` entry created after this feature ships:

```json
"{name}": {
  "type": "feature",
  "status": "active",
  "specPath": "dark-factory/specs/features/{name}.spec.md",
  "created": "{ISO timestamp}",
  "rounds": 0,
  "group": "{parent-feature-name or null}",
  "dependencies": [],
  "architectReviewedAt": "{ISO timestamp — written by df-intake Step 6 after APPROVED}",
  "findingsPath": "dark-factory/specs/features/{name}.findings.md",
  "architectReviewedCodeHash": "{git SHA at time of architect review}"
}
```

Fields `architectReviewedAt`, `findingsPath`, and `architectReviewedCodeHash` are absent on pre-existing entries (migration target: `playwright-lifecycle`, `project-memory-onboard`).

### findings.md path

No change to path or content format. File is still written to:
- Feature mode: `dark-factory/specs/features/{name}.findings.md`
- Bugfix mode: `dark-factory/specs/bugfixes/{name}.findings.md`

File is still deleted in implementation-agent Step 5 cleanup.

## Migration & Deployment

**Existing active manifest entries**: At the time this feature ships, two manifest entries exist that will not have `architectReviewedAt`: `playwright-lifecycle` and `project-memory-onboard`. The implementation agent for this feature MUST, as a post-ship step, run architect review for each of these specs and populate the three new manifest fields. Alternatively, the developer may manually run `/df-intake playwright-lifecycle` and `/df-intake project-memory-onboard` in resume mode to complete the architect review and write the manifest fields before running df-orchestrate on those specs.

**Hard-fail guard**: The implementation-agent hard-fail (FR-7) means that ANY attempt to run df-orchestrate on a legacy entry after this feature ships will fail with an actionable error message directing the developer to re-run df-intake. This is a clean migration path: the error message is the migration guide.

**Rollback plan**: If this feature needs to be reverted, the rollback path is: restore implementation-agent Step 0a/0c/0d from git history, remove Step 5.6 from df-intake, revert manifest schema note. The manifest entries with the three new fields are forward-compatible (implementation-agent from a reverted state would simply ignore the extra fields). Zero data loss risk because findings.md content and path are unchanged.

**Zero-downtime**: Yes. df-intake and implementation-agent are prompt-engineering text files, not deployed services. There is no running process to restart. The change takes effect when the updated agent and skill files are installed.

**Deployment order**: Update df-intake SKILL.md → Update implementation-agent.src.md (and build) → Migrate legacy manifest entries (or have developer re-run df-intake on them) → Update df-orchestrate SKILL.md state machine doc. If df-orchestrate is updated before legacy entries are migrated, the staleness check will re-run architect review on them (correct behavior), so deployment order is not strictly critical.

**Stale data**: The `architectReviewedCodeHash` staleness mechanism handles future stale reviews transparently.

## API Endpoints

N/A — this is an agent/skill framework with no HTTP endpoints.

## Business Rules

- BR-1: `architectReviewedAt` is the single authoritative signal that Gate 1 is complete for a spec — no `architectReviewedAt` means no architect review has been recorded, regardless of what other fields exist
- BR-2: findings.md MUST be written before the manifest entry is created; a manifest entry pointing to a non-existent `findingsPath` is an invalid state
- BR-3: The hard-fail message in implementation-agent is fixed text (not parameterized beyond `{name}`) — this ensures the test assertion can match it precisely
- BR-4: BLOCKED path in df-intake (max rounds exhausted): spec file stays on disk, NO manifest entry is written; the next `/df-intake {name}` detects the spec file by its existence and resumes from Step 5.6
- BR-5: Staleness detection uses exact SHA equality (`===`); any difference — even a single commit — triggers re-run; there is no "close enough" threshold
- BR-6: Parallel architect review for independent sub-specs within a wave is permitted; wave ordering (via `dependencies` array) is the serialization mechanism for dependent sub-specs
- BR-7: APPROVED WITH NOTES is treated identically to APPROVED for the purposes of Step 6 and manifest write; the notes are preserved in findings.md for the code-agent to read
- BR-8: The re-run architect review triggered by staleness detection in df-orchestrate overwrites the existing findings.md and updates all three manifest fields (`architectReviewedAt`, `findingsPath`, `architectReviewedCodeHash`)

## Error Handling

| Scenario | Response | Side Effects |
|----------|----------|--------------|
| df-intake Step 5.6: architect BLOCKED, max 5 rounds exhausted | Surface blocker to developer; do NOT write manifest entry; spec file stays on disk | None — no manifest entry |
| df-intake Step 5.6: findings.md write fails | Report write error and STOP; do NOT proceed to Step 6 | No manifest entry written |
| implementation-agent: `architectReviewedAt` absent from manifest | Hard-fail with message: "Spec {name} has no architect review record. This spec was likely created before token-opt-architect-phase shipped. Re-run /df-intake {name} to complete architect review, then retry." | Pipeline stops; no code-agent spawned |
| implementation-agent: `findingsPath` file does not exist on disk | Treat as non-blocking (same as today's "missing architectFindingsPath" behavior in code-agent); log warning | code-agent spawned without findings context |
| df-orchestrate: staleness re-run architect review BLOCKED | Surface blocker to developer; do NOT spawn implementation-agent for that spec | Other specs in the batch proceed normally |
| df-intake resume: `{name}.spec.md` exists but no `architectReviewedAt` in manifest | Detect existing spec, skip Steps 1–5, proceed to Step 5.6 | Normal Gate 1 flow from resume point |
| df-intake resume: `{name}.spec.md` does not exist | Normal intake flow (Steps 1 through 7); no resumption needed | Normal intake |
| Decomposed spec: dependency sub-spec B review attempted before A is APPROVED | Wait for A; do not start B until A emits APPROVED | B review is deferred, not BLOCKED |

## Acceptance Criteria

- [ ] AC-1: df-intake runs Gate 1 (tier-aware architect spawn) at Step 5.6, after Step 5.5 and before Step 6
- [ ] AC-2: On APPROVED verdict, df-intake Step 5.6 writes `{name}.findings.md` before writing the manifest entry
- [ ] AC-3: On APPROVED WITH NOTES verdict, df-intake Step 5.6 writes findings.md (including notes) and proceeds to Step 6
- [ ] AC-4: On BLOCKED verdict with rounds remaining, df-intake Step 5.6 spawns spec-agent for revision and re-runs architect review
- [ ] AC-5: On BLOCKED verdict with max rounds exhausted, df-intake does NOT write a manifest entry; spec file remains on disk
- [ ] AC-6: `/df-intake {name}` when `{name}.spec.md` exists resumes from Step 5.6, skipping Steps 1–5
- [ ] AC-7: df-intake Step 6 manifest entry includes `architectReviewedAt`, `findingsPath`, and `architectReviewedCodeHash`
- [ ] AC-8: implementation-agent Step 0 reads `findingsPath` from manifest and hard-fails with exact prescribed message if `architectReviewedAt` is absent
- [ ] AC-9: implementation-agent does NOT spawn any architect-agent (Steps 0a/0c/0d are removed)
- [ ] AC-10: df-orchestrate reads `architectReviewedCodeHash` before spawning implementation-agent; if it differs from HEAD, re-runs architect review first
- [ ] AC-11: Compiled implementation-agent token count remains ≤ 3,200 tokens (existing P-09 test continues to pass)
- [ ] AC-12: For decomposed specs, df-intake runs dependent sub-spec architect reviews only after their dependencies are APPROVED
- [ ] AC-13: df-orchestrate state machine documentation removes `ARCH_INVESTIGATE` and `ARCH_SPEC_REVIEW` states; starts from `QA_SCENARIO` for approved specs
- [ ] AC-14: Tests in `dark-factory-setup.test.js` (ao-thin-impl-agent section) and `dark-factory-contracts.test.js` are updated to match the new contracts
- [ ] AC-15: Legacy manifest entries (`playwright-lifecycle`, `project-memory-onboard`) have a documented migration path

## Edge Cases

- EC-1: `/df-intake {name}` resume when spec file exists but architect review previously completed and manifest entry exists — should detect the manifest entry, check `architectReviewedAt`, and offer to proceed to orchestration rather than re-running Gate 1 unnecessarily
- EC-2: Architect review produces APPROVED WITH NOTES where the notes include a recommendation to split the spec — spec-agent should not auto-split at Step 5.6; the notes land in findings.md; any split decision is a developer action
- EC-3: `git rev-parse HEAD` fails during df-intake Step 5.6 (detached HEAD, bare repo) — log "Unable to capture architectReviewedCodeHash: git error"; proceed with `architectReviewedCodeHash: null`; staleness detection in df-orchestrate should treat null hash as "unknown — re-run architect review" to be safe
- EC-4: findings.md already exists on disk from a previous run when df-intake Step 5.6 runs (resume scenario) — overwrite it; the new review supersedes the old one
- EC-5: Decomposed spec with 3 sub-specs where A and C are independent, B depends on A — A and C begin architect review in parallel; B waits until A is APPROVED; B and C may complete in any order
- EC-6: Staleness re-run in df-orchestrate results in APPROVED WITH NOTES where the notes differ significantly from the original review — both findings.md and manifest are updated; code-agent reads the fresh findings; the old review is discarded
- EC-7: Two developers run `/df-intake {name}` simultaneously on the same spec (concurrent intake) — the last writer wins on manifest.json; findings.md is overwritten by whichever run completes last; this is an edge case that is out of scope for automated handling (single-developer workflow assumption)
- EC-8: Step 5.6 runs for a Tier 1 spec (single combined architect spawn) on a spec that was originally Tier 3 in investigation but was manually downgraded — implementation-agent reads whatever tier is in the spec file; the `Architect Review Tier` field in the spec file is authoritative

## Dependencies

This is a standalone spec (not a sub-spec of a decomposed feature). It modifies shared infrastructure across multiple agents and skills.

**Depends on**: None — no active spec dependencies.

**Depended on by**: Nothing in the current active manifest.

**File overlap with active specs**:
- `playwright-lifecycle` and `project-memory-onboard` both touch `dark-factory/manifest.json` schema (they are active specs that will be affected by the new manifest fields but do not implement the same files as this spec). The migration note (FR-11, D7) addresses this.

## Implementation Size Estimate

- **Scope size**: large (6–7 source files changed + build outputs)
- **Suggested parallel tracks**: 2 parallel tracks with zero file overlap

  **Track A — df-intake + df-orchestrate**:
  - `.claude/skills/df-intake/SKILL.md` (add Step 5.6: architect review, BLOCKED handling, findings.md write, manifest fields; add resume detection)
  - `plugins/dark-factory/skills/df-intake/SKILL.md` (mirror)
  - `.claude/skills/df-orchestrate/SKILL.md` (staleness detection before spawn; remove ARCH_INVESTIGATE + ARCH_SPEC_REVIEW from state machine doc; wave ordering for architect reviews)
  - `plugins/dark-factory/skills/df-orchestrate/SKILL.md` (mirror)

  **Track B — implementation-agent + tests**:
  - `src/agents/implementation-agent.src.md` (replace Step 0a/0c/0d with manifest-read + hard-fail; minor spec-agent re-spawn clarification)
  - `src/agents/spec-agent.src.md` (minor clarification: re-spawn during architect review can happen in df-intake phase)
  - `tests/dark-factory-setup.test.js` (update ao-thin-impl-agent section: Step 0d references change; new assertions for hard-fail, manifest fields; update state machine test from 17 states to 15)
  - `tests/dark-factory-contracts.test.js` (update df-intake + implementation-agent mirror parity assertions)
  - Build outputs: `.claude/agents/implementation-agent.md`, `plugins/dark-factory/agents/implementation-agent.md`, `.claude/agents/spec-agent.md`, `plugins/dark-factory/agents/spec-agent.md` (auto-generated by `npm run build:agents`)

## Architect Review Tier

- **Tier**: 2
- **Reason**: Touches 3 agents/skills (df-intake, implementation-agent, df-orchestrate) with cross-cutting pipeline implications, plus test contracts. Does NOT reach Tier 3 threshold: no migration section for production data (manifest.json is a developer-tooling file, not a production database), no security/auth domain changes. Cross-cutting keywords are present ("pipeline") but the change is a re-homing of an existing gate, not a new system-wide concern.
- **Agents**: 3 domain agents (Security & Data Integrity, Architecture & Performance, API Design & Backward Compatibility)
- **Rounds**: 2+

## Implementation Notes

- The architect-agent spawn logic in df-intake Step 5.6 must be identical to what currently lives in implementation-agent Step 0c — same tier detection, same parallel vs. single spawn decision, same strictest-wins synthesis, same BLOCKED/APPROVED/APPROVED WITH NOTES outcomes. Do not invent a simplified version.
- The resume detection in df-intake (FR-5) uses the existence of `dark-factory/specs/features/{name}.spec.md` as the primary signal. This is already implied by Step 0 scope evaluation — the new behavior is: if the spec file exists, skip Steps 1–5 and go directly to Step 5.6.
- implementation-agent Step 0 replacement: remove the full Step 0a / Step 0c / Step 0d blocks. The new Step 0 is: (1) read manifest entry for this spec, (2) check `architectReviewedAt` — absent → hard-fail. Then proceed to pre-flight test gate and Step 0.5. `architectFindingsPath` is set from manifest `findingsPath` field, not derived.
- The df-orchestrate staleness check (FR-9) runs as a per-spec check before spawning each implementation-agent, not as a batch check before the wave loop. This means each spec in a wave is independently checked for staleness.
- The state machine count changes from 17 to 15 states in df-orchestrate (ARCH_INVESTIGATE and ARCH_SPEC_REVIEW are removed). The test `P-11` in `factory-redesign-v2` section checks for all 17 states — this test must be updated to reflect 15 states and the removal of the two moved states.
- `npm run build:agents` must be run after modifying `src/agents/implementation-agent.src.md` and `src/agents/spec-agent.src.md` to regenerate the compiled `.claude/agents/` and `plugins/dark-factory/agents/` outputs.

## Invariants

### Preserves
- None — the invariant shards are empty at this project stage (no INV-NNNN entries exist yet).

### References
- None — no registered invariants in scope.

### Introduces

- **INV-TBD-a**
  - **title**: Gate 1 executes in df-intake, not implementation-agent
  - **rule**: The architect spec review (Gate 1) and findings.md write MUST be performed by df-intake Step 5.6. implementation-agent MUST NOT spawn any architect-agent for spec review. Any manifest entry written by df-intake MUST include `architectReviewedAt`, `findingsPath`, and `architectReviewedCodeHash`.
  - **scope.modules**: `.claude/skills/df-intake/SKILL.md`, `src/agents/implementation-agent.src.md`, `plugins/dark-factory/skills/df-intake/SKILL.md`, `plugins/dark-factory/agents/implementation-agent.md`
  - **domain**: architecture
  - **enforced_by**: `tests/dark-factory-setup.test.js` (ao-thin-impl-agent section — assertions for hard-fail, manifest fields)
  - **rationale**: Gate 1 was moved to enable developer-present spec revision and to relieve implementation-agent's token budget. Retrofitting it back into implementation-agent would re-introduce the original problem.

- **INV-TBD-b**
  - **title**: `architectReviewedAt` is the single Gate 1 completion signal
  - **rule**: `architectReviewedAt` field in manifest MUST be absent if and only if Gate 1 has not completed. No other field or file may serve as a substitute signal. implementation-agent MUST hard-fail (not warn-and-proceed) when `architectReviewedAt` is absent.
  - **scope.modules**: `dark-factory/manifest.json`, `src/agents/implementation-agent.src.md`, `.claude/skills/df-intake/SKILL.md`
  - **domain**: architecture
  - **enforcement**: runtime
  - **rationale**: A warn-and-proceed fallback would silently bypass Gate 1. Hard-fail is the only safe behavior.

### Modifies
*None.*

### Supersedes
*None.*

## Decisions

### References
*None — no existing registered decisions in scope.*

### Introduces

- **DEC-TBD-a**
  - **title**: Hard-fail over fallback-and-proceed for missing `architectReviewedAt`
  - **decision**: implementation-agent fails immediately with a prescriptive error message when `architectReviewedAt` is absent, rather than falling back to running architect review itself.
  - **rationale**: A fallback would silently re-introduce the old pattern (Gate 1 in implementation-agent), defeating the purpose of this feature. The error message is the migration guide. Developers with legacy specs will see exactly what to do. The cost of the hard-fail (one extra command for legacy specs) is acceptable.
  - **alternatives**: (1) Silent fallback: implementation-agent runs Gate 1 itself if `architectReviewedAt` absent — rejected because it re-introduces the token budget pressure and removes developer visibility. (2) Warn-and-proceed with empty findings: implementation-agent proceeds without architect review — rejected because it bypasses a mandatory quality gate.
  - **scope.modules**: `src/agents/implementation-agent.src.md`
  - **domain**: architecture
  - **enforcement**: runtime

- **DEC-TBD-b**
  - **title**: Git SHA as staleness signal for architect review
  - **decision**: df-orchestrate compares the stored `architectReviewedCodeHash` (git SHA captured at review time) to the current HEAD SHA to detect whether the codebase has changed since the spec was reviewed.
  - **rationale**: Git SHA is the most precise staleness signal available without additional infrastructure. Any commit to the repo changes the SHA, ensuring the review is never more than one commit stale. Time-based TTLs (e.g., "re-review if > 7 days") were considered but rejected because meaningful code changes can happen in one commit and the clock-based approach is fragile.
  - **alternatives**: Time-based TTL — rejected (described above). File-content hash of touched files — rejected (too complex; requires tracking which files the spec affects at review time).
  - **scope.modules**: `.claude/skills/df-orchestrate/SKILL.md`
  - **domain**: architecture
  - **enforcement**: runtime

### Supersedes
*None.*

## Traceability

| Spec Item | Scenario(s) |
|-----------|-------------|
| FR-1 (Step 5.6 runs after Step 5.5, before Step 6) | P-01 |
| FR-2 (findings.md written on APPROVED) | P-01 |
| FR-3 (BLOCKED → spec-agent revision → APPROVED) | P-03, H-10 |
| FR-4 (max rounds exhausted → no manifest entry) | P-04 |
| FR-5 (resume detection) | P-05, H-03 |
| FR-6 (manifest fields: architectReviewedAt, findingsPath, architectReviewedCodeHash) | P-01, P-02 |
| FR-7 (hard-fail when architectReviewedAt absent) | P-06, H-01 |
| FR-8 (implementation-agent no architect spawn) | P-07 |
| FR-9 (staleness detection + re-run) | P-08, H-05, H-11 |
| FR-10 (decomposed spec wave ordering) | P-09 |
| FR-11 (legacy manifest migration) | H-08 |
| BR-1 (architectReviewedAt single signal) | P-06, H-01 |
| BR-2 (findings.md before manifest) | P-01 |
| BR-3 (hard-fail message exact text) | P-06, H-01, H-08 |
| BR-4 (BLOCKED path: no manifest, spec stays) | P-04 |
| BR-5 (SHA exact equality) | H-05, H-11 |
| BR-6 (parallel review for independent sub-specs) | P-09 |
| BR-7 (APPROVED WITH NOTES proceeds) | P-02 |
| BR-8 (staleness re-run overwrites findings.md) | H-05 |
| EC-1 (resume when already approved) | H-03 |
| EC-2 (APPROVED WITH NOTES with split recommendation) | P-02 |
| EC-3 (git error during SHA capture) | H-06 |
| EC-4 (findings.md exists on resume, overwrite) | H-04 |
| EC-5 (3-sub-spec wave ordering: A+C parallel, B waits for A) | P-09 |
| EC-6 (staleness re-run with different notes) | H-05 |
| EC-7 (concurrent intake) | H-07 |
| EC-8 (manually downgraded tier) | H-09 |
| AC-1 (Gate 1 at Step 5.6) | P-01 |
| AC-2 (findings.md written before manifest) | P-01 |
| AC-3 (APPROVED WITH NOTES → Step 6) | P-02 |
| AC-4 (BLOCKED → spec-agent revision) | P-03 |
| AC-5 (max rounds → no manifest) | P-04 |
| AC-6 (resume detection) | P-05 |
| AC-7 (manifest fields) | P-01, P-07 |
| AC-8 (hard-fail + exact message) | P-06, H-01 |
| AC-9 (no architect spawn in impl-agent) | P-07 |
| AC-10 (staleness check + re-run) | P-08, H-05 |
| AC-11 (token cap ≤ 3200) | P-07 |
| AC-12 (decomposed spec ordering) | P-09 |
| AC-13 (state machine 15 states) | P-10 |
| AC-14 (tests updated) | P-07, P-10, H-02 |
| AC-15 (legacy migration documented) | H-08 |
| NFR-1 (impl-agent ≤ 3200 tokens) | P-07 |
| NFR-2 (BLOCKED surfaces domain + round + reason) | P-04 |
| NFR-3 (findings.md before manifest) | P-01 |
| NFR-4 (staleness re-run warning visible) | P-08 |
| D10 (findings.md cleanup in Step 5) | H-02 |
| Information barrier (spec-agent revision) | H-10 |
