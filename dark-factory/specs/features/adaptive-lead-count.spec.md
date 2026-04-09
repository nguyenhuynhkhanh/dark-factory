# Feature: Adaptive Lead Count for df-intake

## Context

`/df-intake` unconditionally spawns 3 parallel spec-agents regardless of feature scope. A 1-file change to a single SKILL.md receives the same treatment as a cross-cutting pipeline overhaul: three independent worktrees, three agent context windows, and a full synthesis phase. The cost is real — token spend is tripled and latency is added — but the benefit only materialises when the problem genuinely has three distinct perspectives worth reconciling.

This feature adds a scope evaluation step (Step 0) that runs inline inside the orchestrator before any leads are spawned. The output is binary: 1 lead or 3 leads. No intermediate tier. The 3-lead flow is unchanged; the 1-lead flow collapses perspectives into a single full-spectrum agent.

## Scope

### In Scope (this spec)

- Step 0: inline scope evaluation block emitted before lead spawning (no agent spawn for evaluation)
- 1-lead path: single full-spectrum spec-agent covering all three original lead perspectives
- 3-lead path: existing Lead A / B / C flow, unchanged
- `--leads=1` and `--leads=3` override flags on `/df-intake`
- Override still shows the scope evaluation reasoning for transparency
- Step 2 / Step 3 conditional collapse for 1-lead path (no synthesis phase, phrasing does not imply multiple leads)
- Updates to 4 files: `.claude/skills/df-intake/SKILL.md`, `plugins/dark-factory/skills/df-intake/SKILL.md` (mirror), `.claude/rules/dark-factory.md`, `CLAUDE.md`
- Test suite update: `tests/dark-factory-setup.test.js`

### Out of Scope (explicitly deferred)

- A 2-lead tier — deliberately excluded; see Solution section for rationale
- Applying adaptive lead count to `/df-debug` — debug root cause is always unknown, 3 investigators always warranted
- Adaptive lead count for sub-specs produced by decomposition — sub-specs are already small by definition and always receive 1 spec-writing agent (this feature is about the investigation phase, not the writing phase)
- Automated tuning of the 1-lead criteria thresholds over time
- Surfacing scope evaluation results in `manifest.json`

### Scaling Path

If the 1-lead criteria prove too loose in practice (too many features underspecced), the blast radius threshold or keyword list can be tightened without touching the spec structure. If a 2-lead tier is ever justified by evidence, the binary decision in Step 0 can be extended without breaking either existing path.

## Requirements

### Functional

- FR-1: Before spawning any leads, the orchestrator MUST emit a scope evaluation block — the developer can read this and correct it before token spend on lead research begins.
- FR-2: Scope evaluation MUST apply all five 1-lead criteria (see Scope Evaluation Algorithm); ALL must be true to select 1 lead. Any one false selects 3 leads.
- FR-3: When 1 lead is selected, a single spec-agent MUST be spawned with the full-spectrum prompt (all three Lead A / B / C sections merged).
- FR-4: When 3 leads are selected, the existing parallel Lead A / B / C spawn MUST run unchanged.
- FR-5: The `--leads=N` flag (N = 1 or 3) MUST bypass criteria evaluation and force the selected count.
- FR-6: When `--leads=N` is supplied, the scope evaluation block MUST still be emitted so the developer can see the reasoning that would have been applied.
- FR-7: For the 1-lead path, Step 2 (synthesize) MUST be collapsed — the orchestrator presents the single lead's report directly without a synthesis phase.
- FR-8: Step 3 phrasing for the 1-lead path MUST NOT imply multiple leads ran (e.g., "Lead A found...", "all leads agreed...").
- FR-9: The plugin mirror file MUST be updated atomically with the source SKILL.md — both files must be identical after the change.
- FR-10: The frontmatter `description` field of `df-intake/SKILL.md` (and its mirror) MUST be updated to reflect "1 or 3 spec-agents" rather than "3 parallel spec-agents".
- FR-11: `CLAUDE.md` and `.claude/rules/dark-factory.md` MUST update their df-intake description from "Spawns 3 parallel spec-agents" to "Spawns 1 or 3 spec-agents based on scope".

### Non-Functional

- NFR-1: Scope evaluation runs inline (orchestrator's own reasoning) — no agent spawn, no file I/O required beyond reading `code-map.md` and `project-profile.md` if they exist.
- NFR-2: Conservative bias — when signals conflict, the result MUST be 3 leads. Under-staffing a spec is worse than over-staffing.
- NFR-3: The scope evaluation block MUST be emitted before any leads are spawned so the developer can interrupt if the eval is wrong.
- NFR-4: The 3-lead path MUST produce identical behaviour to the pre-feature state — no regression in the existing happy path.

## Data Model

N/A — no existing data affected. This feature modifies orchestrator prompt text (SKILL.md files) and documentation files. There is no database, no manifest schema change, and no stored state introduced by the scope evaluation.

## Migration & Deployment

N/A — no existing data affected. The files being modified are prompt-engineering markdown files used at runtime by Claude Code. No migration is needed because:

- The `df-intake` SKILL.md has no stored instances — it is read fresh on every invocation.
- The plugin mirror must match the source exactly; both are updated in the same implementation track.
- Existing manifest entries are unaffected — no new fields are written to `manifest.json`.
- The test suite update is additive — new assertions added; no existing assertion is deleted or weakened.

Rollback: revert the SKILL.md files to their prior content. Because both source and mirror must be identical, they must be reverted together.

## API Endpoints

N/A — this is a prompt-engineering framework change, not an HTTP API change.

## Business Rules

- BR-1: 1 lead requires ALL five criteria to be simultaneously true. Partial satisfaction (4 of 5) selects 3 leads. Rationale: a spec that is underspecced ships with hidden assumptions; an extra two leads is cheap relative to that risk.
- BR-2: `--leads=N` overrides all criteria. The developer's explicit intent always wins. Rationale: the developer has context the algorithm cannot infer (e.g., "I already know the architecture deeply").
- BR-3: df-debug is always 3 investigators, no override flag applies there. Rationale: bug root cause is unknown by definition; reducing investigator count increases missed-root-cause risk.
- BR-4: The 1-lead prompt must include all three original lead sections (users/use cases, architecture, reliability) in a single agent pass. Rationale: coverage must not decrease when lead count decreases — the goal is efficiency, not thoroughness reduction.
- BR-5: The scope evaluation block must appear in the orchestrator's output stream before any agent spawns, so the developer can interrupt with a correction. Rationale: scope eval is cheap; spawning 3 leads on a simple feature is not.
- BR-6: When code-map.md does not exist, the blast radius criterion defaults to "unknown" which does NOT satisfy the ≤1 module threshold — this conservatively contributes to 3-lead selection. Rationale: absence of evidence is not evidence of absence for blast radius.

## Error Handling

| Scenario | Response | Side Effects |
|----------|----------|--------------|
| `--leads=0` or `--leads=2` supplied | Tell developer "Valid values are 1 or 3. Use `--leads=1` or `--leads=3`." STOP. | None — no leads spawned |
| `--leads=N` with N not an integer | Same error message as above | None |
| code-map.md missing | Proceed with conservative assumption: blast radius = unknown, contributes toward 3-lead selection | Scope eval block notes "code-map.md not found — defaulting to conservative 3-lead" |
| project-profile.md missing | Proceed without architecture context; other criteria still evaluated | Scope eval block notes the gap |
| Description is empty or whitespace-only | Treat as ambiguous; default to 3 leads | Scope eval block: "empty description — defaulting to 3 leads" |

## Acceptance Criteria

- [ ] AC-1: A feature description that meets all five 1-lead criteria produces a scope evaluation block stating "1 lead" and spawns exactly one full-spectrum spec-agent.
- [ ] AC-2: A feature description containing a cross-cutting keyword ("pipeline", "all agents", "system-wide", etc.) produces "3 leads" regardless of file count.
- [ ] AC-3: `/df-intake --leads=3 {description}` spawns 3 leads even when the description would have scored 1 lead; eval block is shown.
- [ ] AC-4: `/df-intake --leads=1 {description}` spawns 1 lead even when the description would have scored 3 leads; eval block is shown.
- [ ] AC-5: The 1-lead output contains sections from all three original lead prompts (users, architecture, reliability).
- [ ] AC-6: Step 3 output for the 1-lead path does not mention "Lead A", "Lead B", "Lead C", or use phrasing like "all leads agreed".
- [ ] AC-7: The plugin mirror file for df-intake is identical to the source after the change.
- [ ] AC-8: The frontmatter description for df-intake says "1 or 3 spec-agents based on scope".
- [ ] AC-9: CLAUDE.md and `.claude/rules/dark-factory.md` say "1 or 3 spec-agents based on scope" for df-intake.
- [ ] AC-10: `/df-intake --leads=0` and `/df-intake --leads=2` are rejected with a clear error; no leads are spawned.
- [ ] AC-11: The existing test suite (`tests/dark-factory-setup.test.js`) passes without modification after the implementation, and new assertions for adaptive behaviour are added.
- [ ] AC-12: When code-map.md is absent, the scope eval defaults to 3 leads and the eval block notes the absence.

## Edge Cases

- EC-1: Description is short but mentions "all agents" — cross-cutting keyword overrides low file count. Must produce 3 leads.
- EC-2: Description mentions "update the prompt" (sounds simple) but implies 9 files because "all agents" is present. Must produce 3 leads.
- EC-3: Description meets all 1-lead criteria but code-map blast radius is "high hotspot" — must produce 3 leads (conservative bias).
- EC-4: Description contains "or" as part of a normal English phrase ("create or update a record") — this is an ambiguity marker and must contribute toward 3-lead selection.
- EC-5: `--leads=1` is supplied on a description with cross-cutting keywords — override wins, 1 lead spawned, but eval block shows that criteria were NOT met.
- EC-6: `--leads=3` is supplied on a trivially simple description — 3 leads spawn, eval block shows criteria were met for 1 lead but override was applied.
- EC-7: Both `--leads=1` and `--leads=3` are supplied in the same command — reject with an error: "Cannot specify both --leads=1 and --leads=3."
- EC-8: Description is a single word ("notifications") — treat as ambiguous (insufficient signal), default to 3 leads.
- EC-9: Scope eval block is emitted but developer does not interrupt — orchestrator proceeds with selected count automatically (no extra confirmation needed beyond what existed before).

## Dependencies

None — this spec is independently implementable. The codemap-pipeline spec is active in the manifest but touches different files (codemap-agent.md, df-onboard/SKILL.md, df-orchestrate/SKILL.md). This spec touches df-intake/SKILL.md, its plugin mirror, dark-factory.md rules, CLAUDE.md, and the test file — zero overlap.

## Implementation Size Estimate

- **Scope size**: medium (4-5 files changed)
- **Suggested parallel tracks** (zero file overlap between tracks):
  - **Track A** — SKILL.md + plugin mirror: `.claude/skills/df-intake/SKILL.md` and `plugins/dark-factory/skills/df-intake/SKILL.md`. Must be updated atomically (both files identical on completion). This is the core logic track — Step 0 algorithm, 1-lead prompt, conditional Step 2/3, `--leads` flag parsing.
  - **Track B** — Documentation: `.claude/rules/dark-factory.md` and `CLAUDE.md`. Both need the df-intake description updated from "3 parallel spec-agents" to "1 or 3 spec-agents based on scope". Pure text change, no logic.
  - **Track C** — Test suite: `tests/dark-factory-setup.test.js`. Add new assertions for adaptive behaviour (scope eval block presence, 1-or-3 phrasing in frontmatter description, --leads flag documentation). No assertion deletions — all existing tests must continue to pass.

Track A has no dependency on B or C. Track B and Track C have no dependency on A or each other. All three can run in parallel.

## Implementation Notes

- The Step 0 scope evaluation is orchestrator inline reasoning, NOT an agent spawn. It is written as a decision procedure the orchestrator follows, not a prompt sent to a sub-agent.
- The five 1-lead criteria must all be checked in the order listed in the Scope Evaluation Algorithm section. The conservative-bias rule means that when the algorithm is uncertain (e.g., code-map missing), it must explicitly select 3 leads and state why.
- The 1-lead prompt is the union of Lead A + B + C sections from the existing SKILL.md. The output sections must be: Users & Use Cases, Proposed Scope, User-Facing Requirements, Acceptance Criteria, UX Edge Cases, Affected Systems, Architecture Approach, Data Model, API Design, Integration Points, Technical Risks, Failure Modes, Concurrency & Race Conditions, Security Considerations, Data Integrity, Backward Compatibility, Edge Cases, Questions for Developer.
- The plugin mirror at `plugins/dark-factory/skills/df-intake/SKILL.md` must be identical character-for-character to `.claude/skills/df-intake/SKILL.md`. The test at line 853 of `tests/dark-factory-setup.test.js` already enforces this with `assert.equal(source, plugin, ...)` — Track A must satisfy this.
- The test suite currently has no assertions about "3 spec leads" as a specific string (confirmed by search). The frontmatter `description` field is not currently tested. Track C adds the new assertions for adaptive behavior; it does not need to delete any existing ones.

## Scope Evaluation Algorithm

The orchestrator performs this reasoning inline before spawning any leads. No agent is spawned for this step.

### Inputs

1. Read `dark-factory/code-map.md` if it exists. Extract:
   - **Shared Dependency Hotspots**: modules listed here have high blast radius
   - **Module Dependency Graph**: count modules named or implied by the description
2. Read `dark-factory/project-profile.md` if it exists. Use the Architecture section to understand module boundaries.
3. The developer's raw feature description.

### Five 1-Lead Criteria (ALL must be true)

| # | Criterion | 1-lead value | Notes |
|---|-----------|-------------|-------|
| C1 | Files implied by description + code-map blast radius | ≤ 2 files | If code-map absent: unknown → does NOT satisfy → 3 leads |
| C2 | Concern type | Single (no mix of user-facing + data model + operational in same description) | |
| C3 | Cross-cutting keywords absent | None of: "all agents", "every", "pipeline", "system-wide", "cross-cutting", "orchestrate", "global" | Case-insensitive match |
| C4 | Ambiguity markers absent | None of: "or", "not sure if", "either/or", "could also", "depends on how" | "or" in normal phrases (e.g., "create or update") still counts |
| C5 | Code-map blast radius | ≤ 1 module | If code-map absent: unknown → does NOT satisfy → 3 leads |

### Decision

- ALL five true → 1 lead
- ANY one false → 3 leads
- Signals conflict (e.g., description says "1 file" but code-map shows high blast radius) → 3 leads (conservative bias)

### Output Block (emitted before any spawn)

```
Scope evaluation:
- Files implied: {N} ({source})
- Concern type: {single|mixed} — {reason}
- Cross-cutting keywords: {none|found: "{word}"}
- Ambiguity markers: {none|found: "{phrase}"}
- Code-map blast radius: {N modules|unknown — code-map.md not found}
→ {1 lead|3 leads}. {reason if not all criteria met, or "all criteria satisfied" if 1 lead}
```

### Conservative Bias Rule

When signals conflict — e.g., file count suggests simple but blast radius is high, or ambiguity marker is borderline — the result is 3 leads. The orchestrator must state the conflict explicitly in the output block.

## 1-Lead Prompt Design

The single lead receives a merged prompt covering all three original lead perspectives. It is a full-spectrum investigation, not a truncated one.

### Prompt Structure

```
You are the sole spec lead for this feature. Cover all three perspectives: user/product, architecture, and reliability.

Feature description: {raw input}

Also read `dark-factory/code-map.md` if it exists — use all sections (Shared Dependency Hotspots, Module Dependency Graph, Circular Dependencies, Cross-Cutting Concerns) to understand scope, blast radius, and reliability risks.

Research the codebase, then output your findings as a structured report with ALL of these sections:

**Users & Use Cases** — who uses this and how
**Proposed Scope** — what's in/out for v1, with rationale
**User-Facing Requirements** — functional requirements from the user's perspective
**Acceptance Criteria** — how to verify this works for users
**UX Edge Cases** — unexpected user behaviors to handle
**Affected Systems** — which parts of the codebase this touches
**Architecture Approach** — how to structure this within existing patterns
**Data Model** — schema changes, new entities, relationships
**API Design** — endpoints, contracts, compatibility
**Integration Points** — how this connects to existing features
**Technical Risks** — performance, scalability, migration concerns
**Failure Modes** — what can go wrong and how to handle it
**Concurrency & Race Conditions** — multi-user and timing issues
**Security Considerations** — auth, input validation, data exposure
**Data Integrity** — consistency guarantees needed
**Backward Compatibility** — what existing behavior could break
**Edge Cases** — boundary values, empty states, max limits
**Questions for Developer** — anything unclear that needs confirmation

Do NOT write any spec or scenario files — just report your findings.
```

### Step 2 Collapse for 1-Lead Path

When 1 lead was used, Step 2 (synthesize) is collapsed. The orchestrator presents the single lead's report directly to the developer without merging, deduplicating, or resolving disagreements (there are none). Step 3 phrasing must reflect that one agent ran:

- Say: "Here is what the spec lead found..." or "The investigation found..."
- Do NOT say: "Lead A found...", "all leads agreed...", "there were disagreements between leads..."

## Override Mechanism

The developer can force the lead count using a flag on the command:

```
/df-intake --leads=1 {description}
/df-intake --leads=3 {description}
```

### Behaviour

- `--leads=1`: Bypasses all criteria. Spawns 1 lead. Scope eval block is still emitted (showing what the algorithm would have decided) with a note: "Override: --leads=1 applied."
- `--leads=3`: Bypasses all criteria. Spawns 3 leads (existing flow). Scope eval block is still emitted with a note: "Override: --leads=3 applied."
- `--leads=0`, `--leads=2`, or any other value: Emit error "Valid values are --leads=1 or --leads=3." and STOP. No leads spawned.
- Both `--leads=1` and `--leads=3` in the same command: Emit error "Cannot specify both --leads=1 and --leads=3." and STOP.

### Rationale for Always Showing Eval

When an override is applied, the developer loses the automatic quality check. Showing the eval result anyway lets the developer confirm their override was intentional (e.g., if the algorithm would also have chosen 3 leads, the override is a no-op and the developer can see that).

## Affected Files

| File | Change | Track |
|------|--------|-------|
| `.claude/skills/df-intake/SKILL.md` | Add Step 0 (scope eval), update Step 1 (conditional spawn), update Step 2 (conditional synthesis), update Step 3 (conditional phrasing), update frontmatter description, add `--leads` flag to Trigger section | A |
| `plugins/dark-factory/skills/df-intake/SKILL.md` | Identical to source — must match character-for-character | A |
| `.claude/rules/dark-factory.md` | Update df-intake description from "Spawns 3 parallel spec-agents" to "Spawns 1 or 3 spec-agents based on scope" | B |
| `CLAUDE.md` | Same text update as dark-factory.md | B |
| `tests/dark-factory-setup.test.js` | Add assertions: frontmatter description matches "1 or 3", scope eval block present in SKILL, --leads flag documented in Trigger, 1-lead prompt contains all three lead perspective sections | C |

## Traceability

| Spec Item | Scenario(s) |
|-----------|-------------|
| FR-1 (emit eval block) | P-01, P-02, P-03, H-01, H-02, H-03 |
| FR-2 (all five criteria) | P-01, P-02, H-01, H-02 |
| FR-3 (1-lead full-spectrum) | P-01, H-03 |
| FR-4 (3-lead unchanged) | P-02 |
| FR-5 (--leads override) | P-03 |
| FR-6 (override shows eval) | P-03 |
| FR-7 (Step 2 collapse) | P-01 |
| FR-8 (Step 3 phrasing) | P-01 |
| FR-9 (plugin mirror atomic) | P-02 (3-lead path tests mirror invariant) |
| FR-10 (frontmatter updated) | P-02 |
| FR-11 (doc files updated) | P-02 |
| BR-1 (all five required) | P-01, H-01 |
| BR-2 (override wins) | P-03 |
| BR-3 (df-debug unchanged) | (no scenario — df-debug is out of scope) |
| BR-4 (1-lead covers all perspectives) | H-03 |
| BR-5 (eval before spawn) | P-01, P-02 |
| BR-6 (missing code-map → 3 leads) | P-02 (no code-map available) |
| EC-1 (cross-cutting keyword) | H-02 |
| EC-2 ("all agents" trap) | H-02 |
| EC-3 (conflicting signals) | H-01 |
| EC-4 ("or" as ambiguity marker) | H-01 |
| EC-5 (--leads=1 on cross-cutting) | P-03 |
| EC-6 (--leads=3 on simple) | P-03 |
| EC-7 (both flags) | (Error handling — covered by AC-10; no dedicated scenario provided in the 6-scenario budget; can be added if validation round requires it) |
| EC-8 (single word description) | H-01 (ambiguity: insufficient signal) |
| EC-9 (no extra confirmation) | P-01 |
