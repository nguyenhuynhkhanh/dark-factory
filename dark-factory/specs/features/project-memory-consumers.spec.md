# Feature: project-memory-consumers

## Context

Dark Factory's cleanup pipeline deletes spec artifacts after promotion. Agents do not read git history. As a result, invariants established by one feature can be silently regressed by the next, past architectural decisions can be silently contradicted, and the "memory" of a feature evaporates the moment it ships.

The parent feature — **Project Memory** — introduces a persistent registry at `dark-factory/memory/` that survives cleanup. This registry is written EXCLUSIVELY by promote-agent at promotion time. Every other agent that drafts, reviews, or implements code reads it.

**Storage layout (defined by `project-memory-foundation`):**
- `dark-factory/memory/index.md` — always-loaded compact index, one heading + one description line per entry, metadata in inline brackets. Target size: ≤ 4,000 tokens at 500 entries.
- `dark-factory/memory/invariants-security.md`, `invariants-architecture.md`, `invariants-api.md` — domain-sharded invariant detail files, each ≤ 8,000 tokens.
- `dark-factory/memory/decisions-security.md`, `decisions-architecture.md`, `decisions-api.md` — domain-sharded decision detail files.
- `dark-factory/memory/ledger.md` — monolithic ledger of promoted features; loaded in full.
- The old monolithic `invariants.md` and `decisions.md` files are GONE. TEMPLATE placeholder entries are ELIMINATED from shard files.

This sub-spec covers the **READ side** of project memory: the four consumer agents (`spec-agent`, `architect-agent`, `code-agent`, `debug-agent`) and the spec template that must declare memory references and candidate entries. No agent covered by this spec writes to the memory registry — they only read, reference, and propose.

The critical piece is the architect-agent's **per-domain invariant/decision probe**: memory entries carry a `domain: security|architecture|api` field, and each domain reviewer only loads the shard for their domain. This preserves the existing parallel-review architecture while giving every invariant and decision a defender, and eliminates unnecessary token consumption by restricting each reviewer to its own shard.

The new **index-first selective loading protocol** governs how all four consumer agents load memory: every agent reads the compact `index.md` first (always-loaded), then selects only the domain shard files relevant to its work. This bounds token cost to the index (≤ 4,000 tokens) plus at most the relevant shards (≤ 8,000 tokens each), regardless of registry size.

## Scope

### In Scope (this spec)

**Consumer agent changes (4 agents):**
- `.claude/agents/spec-agent.md` — Phase 1 index-first memory load + selective shard loading + drafting rules for the new spec sections (`## Invariants`, `## Decisions`).
- `.claude/agents/architect-agent.md` — per-domain invariant/decision probe in Round 1: load index, then load ONLY the domain-matching shard files. Explicit BLOCKER/SUGGESTION rules and per-domain findings format.
- `.claude/agents/code-agent.md` — Phase 1 index-first memory load + shard-selective load + constraint-awareness rule (memory describes constraints; it is NOT a hint about holdout tests; `guards` field is opaque).
- `.claude/agents/debug-agent.md` — Phase 1 index-first memory load + domain-selective shard load + advisory cross-reference in root cause analysis (minor change; report structure unchanged otherwise).

**Template change:**
- `dark-factory/templates/spec-template.md` — add `## Invariants` and `## Decisions` sections with subsection structure (`Preserves`, `References`, `Introduces`, `Modifies`, `Supersedes`).

**Plugin mirrors (same content as source):**
- `plugins/dark-factory/agents/spec-agent.md`
- `plugins/dark-factory/agents/architect-agent.md`
- `plugins/dark-factory/agents/code-agent.md`
- `plugins/dark-factory/agents/debug-agent.md`
- `plugins/dark-factory/templates/spec-template.md`

**Test coverage:**
- `tests/dark-factory-setup.test.js` — new assertions that each consumer agent reads the index in Phase 1, then selects shards; that spec-agent drafts memory sections; that architect-agent per-domain probe loads only domain-matching shards; that the spec-template exposes the new sections; that missing-memory graceful degradation language is present in each consumer; that code-agent treats `guards` field as opaque.
- `tests/dark-factory-contracts.test.js` — new assertions that extend the plugin mirror comparison to cover all 5 changed source files (4 agents + 1 template).

### Out of Scope (explicitly deferred)

- Creating the `dark-factory/memory/` directory skeleton or defining the shard file layout — owned by `project-memory-foundation`.
- Defining the YAML frontmatter schema for memory entries — owned by `project-memory-foundation`.
- Defining the index.md format — owned by `project-memory-foundation`.
- Populating memory entries — `project-memory-onboard` does initial extraction from profile/code-map during Phase 3.7; `project-memory-lifecycle` handles write-through by promote-agent.
- promote-agent changes (materializing `INV-TBD-*`/`DEC-TBD-*` into sequential IDs, writing to shard files, ledger appends, supersession) — owned by `project-memory-lifecycle`.
- test-agent `mode` parameter, full-suite gate, and advisor mode — owned by `project-memory-lifecycle`.
- onboard-agent Phase 3.7 extraction + sign-off + retrobackfill — owned by `project-memory-onboard`.
- Memory-related changes to `df-*` skill files — none are planned; consumer agents are the only read points.
- Changes to `implementation-agent.md` — the 3-domain parallel review orchestration does NOT change; only the architect-agent's per-domain logic adds a memory probe. Owned by `project-memory-lifecycle` if orchestration ever needs to surface memory status in the synthesized review summary.

### Scaling Path

Because each agent loads only the index plus the relevant domain shard(s), token cost grows with entry count only within a single shard, not across the whole registry. If any single domain shard grows past ~200 entries (≈ 8,000 tokens), a secondary filter step can further restrict to entries whose `scope.modules` overlap with the spec's touched modules. For v1, filtering happens inside each agent's reading discipline; no structural change is required. New domains (e.g., `performance`, `data-integrity`) can be added by introducing new shards; no consumer agent prompt change is required for existing consumers — they already select by domain.

## Requirements

### Functional

- **FR-1: spec-agent Phase 1 index-first memory load.** spec-agent MUST read `dark-factory/memory/index.md` first in Phase 1 (Understand the Request), alongside project-profile.md and code-map.md. After reading the index, spec-agent identifies which domains overlap with the spec's described scope and loads ONLY those domain shard files (e.g., if scope touches security and architecture modules, load `invariants-security.md`, `decisions-security.md`, `invariants-architecture.md`, `decisions-architecture.md`). spec-agent MUST always load `ledger.md` in full (to check for prior related features). If the index is missing, treat as "registry not yet populated", warn, and fall back to loading all three invariant shards and all three decision shards for broad coverage. If scope is ambiguous (cannot be determined from the description), load all three invariant shards (conservative fallback).

- **FR-2: spec-agent references existing memory.** During spec drafting, if the spec's scope touches entities/modules referenced by an existing invariant or decision (as identified from the index), spec-agent MUST list that entry by ID under the appropriate subsection: `## Invariants > Preserves` (rule continues to hold) or `## Invariants > References` (relevant but not directly enforced by this spec). Same structure for decisions.

- **FR-3: spec-agent declares new candidates.** If the spec introduces new cross-cutting rules, spec-agent MUST add them under `## Invariants > Introduces` (or `## Decisions > Introduces`) using placeholder IDs `INV-TBD-a`, `INV-TBD-b`, `DEC-TBD-a`, etc. (lowercase letters, sequential within this spec). Each candidate MUST include all required schema fields: `title`, `rule`, `scope` (modules/endpoints/entities), `domain` (security|architecture|api), and either `enforced_by: <test-path>` OR `enforcement: runtime|manual` (escape hatch), plus `rationale`.

- **FR-4: spec-agent declares modifications and supersessions.** If the spec intentionally changes an existing entry, spec-agent MUST declare it under `## Invariants > Modifies` (narrowing/adjusting) or `## Invariants > Supersedes` (replacing). Both require a mandatory `rationale`. Supersession uses the form `INV-TBD-X supersedes INV-NNNN`. Same structure for decisions.

- **FR-5: Empty memory sections are valid.** If the spec neither references nor introduces any invariants or decisions, the sections MUST still appear with explicit prose: `"None — this spec neither references nor introduces invariants."` (and equivalent for decisions). Silent omission is NOT permitted.

- **FR-6: architect-agent per-domain probe — index-first, shard-selective.** Each architect-agent spawned with a `domain` parameter MUST:
  1. Read `dark-factory/memory/index.md` first.
  2. Load ONLY the shard files matching the reviewer's own domain:
     - Security reviewer: `invariants-security.md` + `decisions-security.md`
     - Architecture reviewer: `invariants-architecture.md` + `decisions-architecture.md`
     - API reviewer: `invariants-api.md` + `decisions-api.md`
  3. NOT load other domain shards.
  4. Perform the invariant/decision probe restricted to entries whose `domain` field matches their own. Entries with no `domain` field default to `security` (safer).
  The probe MUST happen in Round 1 (initial review) and MUST re-run if the spec is updated in subsequent rounds.

- **FR-7: architect-agent findings format.** Each domain reviewer MUST emit a `### Memory Findings (<domain>)` block in their domain review file, with exactly these five categories (each can be empty-line "none"):
  - `Preserved: <IDs> — verified, <brief reason>`
  - `Modified (declared in spec): <ID> → rationale sound | concern | BLOCKER`
  - `Potentially violated (BLOCKER): <ID> — <how>`
  - `New candidates declared: <INV-TBD-X> (reviewed: fields complete | missing <field> — BLOCKER)`
  - `Orphaned (SUGGESTION only): <ID> — <referenced entity removed>`

- **FR-8: architect-agent BLOCKER rules.** The following MUST be treated as BLOCKERs by the domain reviewer that owns them:
  - Active invariant/decision in this domain is violated by the spec WITHOUT an explicit `Modifies` or `Supersedes` declaration.
  - A `Modifies` or `Supersedes` declaration in the spec has incomplete rationale or missing required schema fields.
  - A new candidate `INV-TBD-*` / `DEC-TBD-*` is missing a required schema field (title, rule, scope, domain, enforced_by-or-escape, rationale).

- **FR-9: architect-agent SUGGESTION rule.** Orphaned invariants/decisions (active entry whose `scope.modules` all reference files that have been deleted from the codebase) MUST be reported as SUGGESTION only, NEVER as a blocker. The suggestion is "consider retiring INV-NNNN in a future spec."

- **FR-10: code-agent Phase 1 index-first memory load.** code-agent MUST read `dark-factory/memory/index.md` first in its general-patterns/Phase-1 step, alongside project-profile.md and code-map.md. From the index, code-agent identifies entries whose `scope.modules` (listed in the index tags or domain) overlap with files this spec touches, then loads ONLY the shard files containing those entries. If no overlap exists, code-agent loads `ledger.md` for brief context only and treats the constraint set as empty. Missing index: warn and fall back to loading all shards for broad coverage. Missing specific shard: warn and treat that domain as empty.

- **FR-11: code-agent constraint filtering.** For each invariant/decision whose `scope.modules` overlaps with files code-agent will modify, code-agent MUST treat the entry's `rule` + `rationale` as a HARD CONSTRAINT on its implementation. Violating such a constraint is permitted ONLY IF the spec explicitly declares supersession or modification of that entry — in which case the spec's declaration is the authoritative override.

- **FR-12: code-agent constraint-awareness rule (information barrier).** The code-agent prompt MUST include a clear, unambiguous statement: *"Memory describes architectural constraints on your implementation; it does NOT enumerate what is tested. Do NOT use the `enforced_by` field or the `guards` field in memory entries to infer holdout scenarios or test coverage."* The `guards` field (file:line references used for human navigation) MUST be treated as opaque by code-agent — it MUST NOT use guard paths to infer test coverage, implementation details, or any behavioral signal. This is a hard information-barrier rule on par with "NEVER read holdout scenarios."

- **FR-13: debug-agent Phase 1 index-first memory load.** debug-agent MUST read `dark-factory/memory/index.md` first in Phase 2 (Investigate the Codebase), alongside project-profile.md and code-map.md. From the index, debug-agent uses the tags for fast keyword lookup to identify which domains the module under investigation belongs to, then loads the invariant shards for those domains. If the root cause domain is unknown, load all three invariant shards (conservative fallback). Missing index: warn and fall back to loading all shards. Missing specific shard: warn and treat as empty domain.

- **FR-14: debug-agent invariant cross-reference.** During root cause analysis (Phase 3), debug-agent MUST check whether the bug symptom or root cause maps to a known invariant. If a match is found, debug-agent MUST include a one-line note in the root cause section: "This bug is an invariant violation: INV-NNNN (<title>) — <how the bug violates it>." This is advisory; it does not change the debug report template structure.

- **FR-15: spec-template sections.** `dark-factory/templates/spec-template.md` MUST contain `## Invariants` and `## Decisions` sections. Each section MUST list its subsections inline with example prose:
  - `## Invariants`: `Preserves`, `References`, `Introduces`, `Modifies`, `Supersedes`
  - `## Decisions`: `References`, `Introduces`, `Supersedes` (no `Preserves`/`Modifies` — decisions are historical and either referenced or superseded)

- **FR-16: Plugin mirror parity.** All 5 changed source files MUST be mirrored exactly to their `plugins/dark-factory/` counterparts. Contracts test enforces byte-identical content.

- **FR-17: Graceful degradation — index missing.** If `dark-factory/memory/index.md` is missing, every consumer (spec-agent, architect-agent, code-agent, debug-agent) MUST: (a) log a single-line warning: `"Memory index not found — loading all shards for broad coverage"`, (b) attempt to load all shard files it can find, (c) proceed with its normal work. No consumer may crash, block, or refuse to run.

- **FR-18: Graceful degradation — specific shard missing.** If a specific shard file is requested but not found (e.g., `invariants-security.md`), every consumer MUST: (a) log: `"Shard {filename} not found — treating as empty domain"`, (b) proceed with whatever other shards are available. No consumer may crash or block.

- **FR-19: Graceful degradation — all shards missing.** If all shard files are missing (but index may or may not exist), every consumer MUST warn and proceed with an empty memory set. No consumer may crash or block. This is the equivalent of today's "memory not found" case.

- **FR-20: Graceful degradation — ledger missing.** If `ledger.md` is missing, consumers MUST log `"Memory file missing: dark-factory/memory/ledger.md — treating ledger as empty"` and proceed. Not a blocker.

- **FR-21: Architect probe skipped when registry missing.** When the index and all shard files are missing, the architect's per-domain probe is skipped rather than treated as "no violations found." Each domain reviewer MUST emit a single line in their review: `Memory probe skipped — registry missing.` No BLOCKER may be issued on memory grounds when the registry is absent.

### Non-Functional

- **NFR-1: Single read per agent invocation.** Each consumer reads the index at most once in Phase 1 (or Phase 2 for debug-agent). Each shard file is read at most once per agent invocation — only the relevant shards are read. No per-decision or per-hunk re-reads. The code-agent operates on a snapshot of memory as of Phase 1 load time; this is by design. Reads performed in Phase 1 are final for the duration of that agent session.

- **NFR-2: No token explosion.** Consumer agents reference memory entries by ID (not full text) whenever they cite an entry in output. This keeps spec/review sizes bounded as the registry grows.

- **NFR-3: Deterministic domain classification.** The default-to-security rule for unclassified entries MUST be explicit in the architect-agent prompt so that domain ownership is never ambiguous at runtime.

- **NFR-4: Token budget.** The index file MUST remain ≤ 4,000 tokens at 500 entries (enforced by foundation). Each individual shard file MUST remain ≤ 8,000 tokens (enforced by foundation). Consumer agents depend on these bounds for predictable per-invocation token cost: an agent loading the index plus two domain shards consumes at most 4,000 + 2 × 8,000 = 20,000 tokens from memory, regardless of how large the overall registry grows.

## Data Model

No schema changes in this sub-spec. The memory file schema and index format are defined by `project-memory-foundation`. This spec only READS the schema — the fields consumer agents rely on are:

**From the index (`index.md` — heading-per-row format):**
- Entry heading: `## INV-NNNN` or `## DEC-NNNN`
- Inline metadata: `[type:invariant|decision]`, `[domain:security|architecture|api]`, `[tags:...]`, `[status:active|modified|superseded]`, `[shard:invariants-{domain}.md]`
- Description line: one-line summary

**From shard files (loaded selectively):**
- `id` (INV-NNNN / DEC-NNNN — sequential, assigned by promote-agent)
- `title`, `rule` (or `decision`), `rationale`
- `scope.modules[]` (used by code-agent to filter constraints; used by architect to detect orphaned entries)
- `domain` (used to confirm domain ownership after shard selection)
- `enforced_by` | `enforcement` (validated by architect; NOT used by code-agent for test inference)
- `guards` (file:line references — opaque to code-agent; treated as informational for human navigation only)
- `status` (active | modified | superseded — architect skips non-active entries for violation checks)

## Migration & Deployment

**Breaking change: old monolithic files removed.** `dark-factory/memory/invariants.md` and `dark-factory/memory/decisions.md` no longer exist after `project-memory-foundation` deploys the sharded layout. Consumer agents MUST NOT reference these old paths. Any agent code or prompt text that hard-codes `invariants.md` or `decisions.md` (without domain suffix) is incorrect after this change.

**Existing data.** This sub-spec introduces new sections to the spec template and new Phase 1 load steps in four agents. There are no historical spec files in active flight that would need retrofitting (cleaned specs are deleted; active specs are either pre-memory or will be rewritten through the new spec-agent). The only "stale data" class is:
- **Active specs authored before this change.** These may lack `## Invariants` / `## Decisions` sections. The architect-agent MUST tolerate their absence: if the spec has no memory sections at all, architect logs "Spec predates memory sections — probe limited to codebase evidence; no candidate/modification validation." This is NOT a blocker; it is a compatibility mode.
- **Ongoing specs that get re-spawned into spec-agent during architect rounds after deployment.** If the architect-agent is using the new logic but the spec file was drafted under the old template, the first architect round SHOULD note the missing sections as a `SUGGESTION` (`Spec uses legacy template — memory sections absent. If new invariants are introduced, request spec update via respawn.`), NOT as a BLOCKER. This prevents the migration from stalling the pipeline.

**Rollback plan.** If any consumer agent regresses after this change ships, revert the specific `.claude/agents/*.md` file and its plugin mirror. No persistent state is written; rollback is pure prompt revert.

**Zero-downtime.** Yes. Agent prompts are read at spawn time; next agent invocation picks up the change. No running process to restart.

**Deployment order.** This sub-spec depends on `project-memory-foundation` having:
1. Created the `dark-factory/memory/` directory with domain-sharded file layout.
2. Created `dark-factory/memory/index.md` (may be empty/header-only initially).
3. Defined the YAML frontmatter schema in `dark-factory/templates/project-memory-template.md`.
4. Added the memory load directive to `.claude/rules/dark-factory-context.md`.

If foundation has not deployed, the consumer agents ship with the graceful-degradation path active — they warn and proceed with an empty registry. Once foundation deploys, consumers transparently pick up the populated files.

**Stale data/cache.** N/A — no caches or derived data.

**Plugin mirror sync.** After modifying any of the 5 source files, the identical content MUST be written to the `plugins/dark-factory/` counterpart in the same commit. Contracts test enforces exact content parity.

## API Endpoints

N/A — no API endpoints. This feature modifies agent prompts and a template file.

## Business Rules

- **BR-1: spec-agent is never the writer.** spec-agent declares candidates and references but NEVER writes to `dark-factory/memory/*`. Only promote-agent writes. This keeps the registry append-only and tied to shipped features.
- **BR-2: Per-domain probe ownership is absolute.** An invariant/decision is checked by EXACTLY ONE architect domain reviewer — the one whose domain matches the entry's `domain` field (and therefore the one whose shard contains that entry). No cross-domain duplication. No escalation across domains. (Contradictions between domain reviewers that happen to surface the same entry are resolved by implementation-agent's existing strictest-wins synthesis.)
- **BR-3: Violations in a domain are owned by that domain.** If security-domain reviewer finds a security-domain invariant violated, ONLY the security reviewer emits the BLOCKER. The architecture and api reviewers do not restate it. This keeps blocker counts accurate.
- **BR-4: Memory-silent spec is architecturally valid.** A spec with empty `## Invariants` and `## Decisions` sections (explicit "None —" prose) is a valid spec. Architect-agent does not treat empty sections as incomplete; it treats missing sections as legacy (migration-mode suggestion, not blocker).
- **BR-5: Code-agent does not reason about test coverage from memory.** The `enforced_by` field and the `guards` field exist for human readers and for architect validation. The code-agent's prompt explicitly forbids using either field as a signal about what is or is not in the holdout scenario set. This is an information-barrier rule on par with "NEVER read holdout scenarios."
- **BR-6: TBD IDs are spec-local.** `INV-TBD-a`, `INV-TBD-b` are unique within a single spec, not globally. Two concurrent specs can each declare `INV-TBD-a` without conflict — promote-agent assigns the permanent sequential ID at promotion.
- **BR-7: Unclassified entries default to security.** If an invariant/decision lacks a `domain` field (legacy entry, author oversight), the security-domain reviewer owns it and it is placed in the security shard. Rationale: security is the safest default — the worst outcome of over-scrutinizing a non-security entry is a SUGGESTION; the worst outcome of under-scrutinizing a security entry is a production incident.
- **BR-8: No supersession cascade.** When spec-X supersedes INV-0005 with INV-TBD-a, the architect validates that declaration but does NOT recursively check entries that referenced INV-0005. Cascade handling is a `project-memory-lifecycle` concern (if ever). For v1, the author of the superseding spec is responsible for listing any cascading references; architect flags suspicious patterns as SUGGESTION.
- **BR-9: Architect loads only its own domain shard.** When spawned with a `domain` parameter, an architect-agent MUST NOT load shards belonging to other domains. Loading all shards defeats the token efficiency of the design and risks introducing cross-domain findings into the wrong reviewer's output.
- **BR-10: Index is the routing layer, not the detail layer.** Agents use the index to decide which shards to load. They do NOT make constraint or compliance decisions based solely on the index summary line — they must read the shard for full entry detail before applying rules or emitting findings. The index is a selector, not a substitute for the shard.

## Error Handling

| Scenario | Response | Side Effects |
|----------|----------|--------------|
| `dark-factory/memory/index.md` missing | Every consumer logs: `"Memory index not found — loading all shards for broad coverage"` and loads all shard files it can find; proceeds with whatever entries are available | No BLOCKER; pipeline proceeds |
| Specific shard missing (e.g., `invariants-security.md` not found) | Log: `"Shard invariants-security.md not found — treating as empty domain"`; proceed with other shards | No BLOCKER |
| `dark-factory/memory/` directory missing | Every consumer logs: `"Memory registry not found at dark-factory/memory/ — proceeding with empty set"`; architect additionally emits `"Memory probe skipped — registry missing."` in domain review | No BLOCKER; pipeline proceeds |
| All shard files missing (index may exist) | Treat as empty memory set — same behavior as directory-missing case | No BLOCKER |
| Only `ledger.md` missing (shards present) | Log: `"Memory file missing: dark-factory/memory/ledger.md — treating ledger as empty"`; shard probe and constraint checks run normally | No BLOCKER |
| Memory shard exists but is empty/header-only | Treat as "no entries" — no warning (valid post-foundation state before first promotion) | Normal flow |
| Memory shard has malformed YAML frontmatter | Log: `"Memory file parse error: <file>:<line> — skipping malformed entry, proceeding with remaining entries"`; skip the malformed entry only | SUGGESTION on the next review: "memory file contains malformed entry; recommend `/df-cleanup` or manual fix" |
| Active invariant in this spec's scope violated without declaration | Architect domain reviewer that owns the entry's domain emits BLOCKER with entry ID + how-violated evidence | Spec-agent respawned with BLOCKER finding; round count increments |
| Candidate `INV-TBD-X` missing required field | Architect domain reviewer (whichever domain the candidate claims) emits BLOCKER listing missing fields | Spec-agent respawned to complete fields |
| `Modifies`/`Supersedes` declaration without rationale | Architect BLOCKER: "Modification/supersession without rationale" | Spec-agent respawned |
| Orphaned invariant (scope.modules all deleted) | Architect SUGGESTION only: "consider retiring INV-NNNN in a future spec" | Does NOT block |
| code-agent touches file covered by active invariant in a superseded spec | code-agent respects the NEW rule (as declared in the current spec); ignores the superseded entry | Normal flow — supersession is the override mechanism |
| spec-agent drafts spec without `## Invariants` / `## Decisions` sections | Architect SUGGESTION: "Spec uses legacy template — memory sections absent." Not a blocker during migration window | spec-agent should add empty sections on respawn |
| Architect spawned without domain parameter (full review mode) | Architect loads all three invariant shards and all three decision shards; performs the memory probe across ALL domains in a single pass; same findings format but grouped per-domain inside one review file | Backward-compatible with single-architect mode |
| code-agent attempts to use `guards` field to infer test paths | The code-agent prompt MUST explicitly prohibit this; the `guards` field is opaque — code-agent treats it as a human-navigation artifact and ignores the file:line reference | Information barrier violation if prompt lacks this prohibition |

## Acceptance Criteria

- [ ] **AC-1**: `.claude/agents/spec-agent.md` Phase 1 explicitly reads `dark-factory/memory/index.md` first, then loads only the relevant domain shards, then reads `ledger.md`; missing-index graceful degradation language (warn + load all shards); missing-shard graceful degradation language (warn + treat as empty domain).
- [ ] **AC-2**: `.claude/agents/spec-agent.md` drafting section instructs the agent to produce `## Invariants` and `## Decisions` sections in the spec, including the `Preserves / References / Introduces / Modifies / Supersedes` subsections.
- [ ] **AC-3**: `.claude/agents/spec-agent.md` specifies `INV-TBD-*` / `DEC-TBD-*` placeholder ID convention (letters, spec-local).
- [ ] **AC-4**: `.claude/agents/architect-agent.md` per-domain section specifies the index-first load, then ONLY the domain-matching shard files (`invariants-{domain}.md` + `decisions-{domain}.md`), the domain-filtered probe, the `### Memory Findings` emission format, the BLOCKER rules (FR-8), and the SUGGESTION rule for orphaned entries (FR-9).
- [ ] **AC-5**: `.claude/agents/architect-agent.md` describes the migration-compatibility behavior (legacy specs without sections = SUGGESTION, not blocker), the registry-missing behavior (probe skipped, noted in review), and the explicit rule that other-domain shards are NOT loaded.
- [ ] **AC-6**: `.claude/agents/code-agent.md` General Patterns / Phase 1 includes index-first memory load, shard-selective loading based on module overlap, and graceful degradation for missing index and missing shards.
- [ ] **AC-7**: `.claude/agents/code-agent.md` includes the constraint-awareness rule: memory entries whose `scope.modules` overlap with modified files become hard constraints; explicit statement that memory is NOT a signal about test coverage; explicit prohibition on using the `guards` field to infer test paths.
- [ ] **AC-8**: `.claude/agents/debug-agent.md` Phase 2 includes index-first memory load, domain-selective shard loading, and graceful degradation.
- [ ] **AC-9**: `.claude/agents/debug-agent.md` Phase 3 instructs the debug-agent to cross-reference the root cause against known invariants and note matches in the root cause analysis section.
- [ ] **AC-10**: `dark-factory/templates/spec-template.md` contains `## Invariants` and `## Decisions` sections with their subsection structure and "None — ..." example prose for empty cases.
- [ ] **AC-11**: Plugin mirrors for all 5 files byte-identical to source.
- [ ] **AC-12**: `tests/dark-factory-setup.test.js` contains assertions covering AC-1 through AC-10 (structural string-matching style consistent with existing test patterns), including assertions that `invariants.md` and `decisions.md` (old monolithic paths) do NOT appear in any consumer agent Phase 1 load instructions.
- [ ] **AC-13**: `tests/dark-factory-contracts.test.js` extends the plugin mirror suite to cover all 5 changed files.
- [ ] **AC-14**: All 331+ existing tests still pass (no regression).

## Edge Cases

- **EC-1**: Memory directory exists but all shard files are empty (post-foundation, pre-first-promotion). Every consumer proceeds normally with zero entries; architect's per-domain probe produces `Memory Findings (<domain>)` blocks with "none" in every category. NO warning — empty is a valid post-bootstrap state.
- **EC-2**: Only one shard missing (e.g., `invariants-security.md` removed manually). Consumers log a targeted warning naming the missing shard and treat that domain as empty; they still read the other present shards. Architect probe runs against the present shards only; cannot emit a security BLOCKER (no data for that domain), but CAN emit architecture or API BLOCKERs.
- **EC-3**: A shard file has malformed YAML frontmatter in one entry. Consumers skip the malformed entry and continue processing the rest of the shard. Architect emits a SUGGESTION about the malformed entry.
- **EC-4**: An active invariant's `scope.modules` list includes a file that has since been deleted. Architect flags it as SUGGESTION (orphaned), NOT BLOCKER. If ALL files in scope are deleted, still SUGGESTION only.
- **EC-5**: Spec-agent drafts a candidate `INV-TBD-a` with `domain: performance` (a domain that does not map to any architect reviewer). Architect's default-to-security rule promotes the entry into the security reviewer's queue. Security reviewer emits the findings and may suggest the author pick one of the three valid domains.
- **EC-6**: Spec-agent is respawned by architect after round 1 and adds a new candidate `INV-TBD-c`. Round 2 architect re-runs the probe against the updated spec — must detect the new candidate and validate its fields. (Probe re-runs on every architect round when spec changes.)
- **EC-7**: Two concurrent specs in different worktrees each declare `INV-TBD-a`. No conflict — TBD IDs are spec-local. Promote-agent (future spec) resolves to distinct sequential IDs at promotion time.
- **EC-8**: Spec supersedes `INV-0003` with `INV-TBD-a`, but the `Modifies` subsection also lists `INV-0003` (author confusion). Architect BLOCKER: "INV-0003 cannot be both modified and superseded — clarify which is intended."
- **EC-9**: code-agent must modify a file that appears in `scope.modules` of an active invariant whose `domain: security`. code-agent does NOT care about the domain field — it treats the invariant as a constraint regardless of who "owns" it in architect review. Domain is used for shard routing; constraint applicability is determined by scope overlap only.
- **EC-10**: code-agent sees a memory entry where `enforced_by: tests/auth/foo.test.js` and `guards: tests/auth/foo.test.js:42` reference a test file. code-agent MUST NOT infer what the test asserts from either field; it MUST read the spec and public scenarios for behavior and only use memory's `rule` and `rationale` for constraint purposes. Both `enforced_by` and `guards` are opaque to code-agent.
- **EC-11**: debug-agent investigates a bug and finds the root cause matches `INV-0007`. debug-agent adds the one-line note in root cause analysis. The debug report template structure does NOT change — the note is embedded inline, not a new section.
- **EC-12**: Legacy spec (authored before this feature ships) is handed to architect-agent for review. It has no `## Invariants` / `## Decisions` sections. Architect emits SUGGESTION (not BLOCKER): "Spec uses legacy template — memory sections absent. If new invariants are introduced, request spec update via respawn."
- **EC-13**: Architect spawned WITHOUT a domain parameter (legacy single-reviewer mode) encounters memory. It reads the index, then loads all three invariant shards and all three decision shards, and groups findings per-domain inside one review file. Backward-compatible.
- **EC-14**: Memory entry has `status: modified` (not `active`). Architect does NOT check it for violations (because it is no longer the canonical rule) but DOES surface it in `Preserved` if the spec explicitly references it, or in `Orphaned` if no one references it and all scope files are deleted.
- **EC-15**: Adversarial spec — the spec-agent's output declares a supersession of `INV-0001` with a one-word rationale ("refactor"). Architect BLOCKER: "Supersession rationale insufficient — must explain why the invariant no longer holds and what replaces it."
- **EC-16**: Index exists but all listed entries have `[status:superseded]` — no active entries. Every consumer proceeds normally with an effectively empty active set. Architect's per-domain probe loads the relevant shards, finds only superseded entries, and produces "Preserved: none", "Potentially violated: none" across all categories. No warning.
- **EC-17**: spec-agent receives a feature description spanning all three domains (security, architecture, and api). Spec-agent loads all three invariant shards and all three decision shards. This is the maximum load case — index + 6 shards — and must not exceed the NFR-4 token budget (4,000 + 6 × 8,000 = 52,000 tokens from memory).

## Dependencies

- **Depends on**: `project-memory-foundation` — needs the memory directory, domain-sharded file skeletons, index.md, YAML schema, and the `.claude/rules/dark-factory-context.md` load directive in place so consumer agents know what shape to expect. Without foundation, consumers are in graceful-degradation mode permanently (which is acceptable but provides no value until foundation ships).
- **Depended on by**:
  - `project-memory-onboard` — once onboard populates invariants/decisions into the sharded files, the consumer agents defined here start doing real work against real entries.
  - `project-memory-lifecycle` — promote-agent writes memory shards; the validation that promote-agent's writes are correctly shaped depends on the schema fields consumer agents here require.
- **Group**: `project-memory`
- **Wave**: Wave 2 (parallel with `project-memory-onboard`, after Wave 1 foundation).

## Implementation Size Estimate

- **Scope size**: medium-to-large — 12 files total (5 source + 5 plugin mirrors + 2 test file edits). Individual agent edits are small to medium (sections added, no refactor).
- **Suggested parallel tracks**: 3 tracks with minimal file overlap.

  **Track A: spec-agent + spec-template (2 files + 2 mirrors + test assertions for those)**
  - Files: `.claude/agents/spec-agent.md`, `plugins/dark-factory/agents/spec-agent.md`, `dark-factory/templates/spec-template.md`, `plugins/dark-factory/templates/spec-template.md`
  - Test additions: AC-1, AC-2, AC-3, AC-10 assertions in `tests/dark-factory-setup.test.js`; mirror parity for spec-agent and spec-template in `tests/dark-factory-contracts.test.js`.

  **Track B: architect-agent (1 file + 1 mirror + test assertions)**
  - Files: `.claude/agents/architect-agent.md`, `plugins/dark-factory/agents/architect-agent.md`
  - Test additions: AC-4, AC-5 assertions; mirror parity for architect-agent.

  **Track C: code-agent + debug-agent (2 files + 2 mirrors + test assertions)**
  - Files: `.claude/agents/code-agent.md`, `plugins/dark-factory/agents/code-agent.md`, `.claude/agents/debug-agent.md`, `plugins/dark-factory/agents/debug-agent.md`
  - Test additions: AC-6, AC-7, AC-8, AC-9 assertions; mirror parity for code-agent and debug-agent.

  **Shared test files.** Both `tests/dark-factory-setup.test.js` and `tests/dark-factory-contracts.test.js` are edited by all three tracks. Each track appends its own assertions to distinct sections of each file — no line-level overlap is expected. If the implementation-agent detects write contention, run the test-append step serially at merge time. Track A goes first, then B, then C to minimize rebase friction.

- **File overlap between tracks**: zero on agent/template sources. Test files are shared but appended-to in distinct zones.

## Implementation Notes

**Where to place Phase 1 memory load in each agent.** Follow the existing pattern: every consumer already reads `dark-factory/project-profile.md` and `dark-factory/code-map.md` at the top of its process. Add the memory load immediately after those existing reads, in the SAME step. The load is two-stage: (1) read `index.md`, (2) select and read relevant shards. Add the index-missing and shard-missing graceful-degrade language at each stage.

**Where to place the architect per-domain probe.** The architect-agent has a "Domain Parameter" section near the top and a "Step 1: Deep Review" section. Add the memory probe as a numbered substep at the END of Step 1: (a) read index.md, (b) load ONLY `invariants-{domain}.md` and `decisions-{domain}.md`. The findings emission (Step 3) already has a domain-review-file format block — add the `### Memory Findings (<domain>)` template inside the existing domain review file structure.

**Spec-agent drafting guidance.** The spec-agent currently has Phase 4: Write the Spec. Add a sub-bullet that says "If the spec's scope touches any module referenced in memory entries (as discovered from the index and loaded shards), populate `## Invariants > Preserves` or `References`. If the spec introduces new cross-cutting rules, populate `## Invariants > Introduces` with `INV-TBD-*` placeholders. If the spec intentionally changes or retires an existing entry, populate `Modifies` or `Supersedes` with mandatory rationale." The subsections go in the spec template so the agent has a concrete target to fill.

**Code-agent constraint-awareness rule placement.** code-agent has a "General Patterns" section with existing information-barrier statements. Add the constraint-awareness rule there as a bulleted item, phrased explicitly: *"Memory describes architectural constraints on your implementation; it does NOT enumerate what is tested. Do NOT use memory's `enforced_by` field or `guards` field to infer holdout scenarios or test coverage — that is a holdout leak and is forbidden. The `guards` field is a human-navigation artifact; treat it as opaque."*

**Debug-agent minor edit.** Add one sentence in Phase 3 (Root Cause Analysis) under step 5: *"Cross-reference the root cause against known invariants loaded from the domain shards. If a match is found, add a one-line note in the debug report's root cause section: 'This bug is an invariant violation: INV-NNNN — <how>.'"*

**Test file patterns.** Match the style of existing assertions in `tests/dark-factory-setup.test.js`. For each new assertion, use `assert.ok(content.includes("..."))` with the exact phrase from the agent prompt. Add a NEGATIVE assertion for old monolithic paths: `assert.ok(!content.includes("memory/invariants.md"))` in each consumer's load-step assertion (to catch any prompt that references the old path). For plugin mirror parity, extend the existing file-list in the mirror-consistency suite.

**Token budget.** Adding the index-first load plus shard selection should add ~80-150 lines per agent. The per-invocation memory token cost is bounded by NFR-4: index (≤ 4,000) + relevant shards (≤ 8,000 each). The existing token-cap test in `dark-factory-setup.test.js` has headroom; verify with `node --test tests/dark-factory-setup.test.js` after each track lands.

## Invariants

### Preserves
*None — the memory registry does not yet contain active invariants at the time this spec is authored. Once `project-memory-foundation` and `project-memory-onboard` complete and populate the registry, a re-review of this spec would populate this subsection with any invariants whose scope overlaps with the four consumer agents or the spec template.*

### References
*None — no existing registered invariants in scope for this spec.*

### Introduces

- **INV-TBD-a**
  - **title**: Every consumer agent treats missing memory index or shards as warn-and-proceed
  - **rule**: When `dark-factory/memory/index.md` is missing, or any requested shard file is missing, or the entire registry is absent, spec-agent, architect-agent, code-agent, and debug-agent MUST log a single-line warning identifying what is missing and MUST proceed with their normal work. On index-missing, fall back to loading all available shards. On specific-shard-missing, treat that domain as empty. None may block, crash, or refuse to run on account of missing memory.
  - **scope.modules**: `.claude/agents/spec-agent.md`, `.claude/agents/architect-agent.md`, `.claude/agents/code-agent.md`, `.claude/agents/debug-agent.md`, and their plugin mirrors
  - **domain**: architecture
  - **enforced_by**: `tests/dark-factory-setup.test.js` (assertion: each of the four agents contains graceful-degradation language covering missing index, missing shard, and missing registry)
  - **rationale**: Memory is a strictly-additive registry. Breaking agent invocation when the registry is absent would couple the foundation rollout to the consumer rollout and create a bootstrapping deadlock. The tiered degradation (index-missing → load all shards; shard-missing → treat as empty domain; registry-missing → empty set) decouples rollout stages while providing the best possible coverage at each degradation level.

- **INV-TBD-b**
  - **title**: code-agent memory load is for constraint awareness only; enforced_by and guards fields are opaque
  - **rule**: code-agent MUST NOT use any field of a memory entry — especially `enforced_by` or `guards` — to infer what scenarios are in the holdout set, what assertions the holdout tests make, or what test coverage exists. Memory provides `rule` and `rationale` as hard constraints on implementation; `enforced_by`, `guards`, and all other navigation fields are opaque from code-agent's perspective.
  - **scope.modules**: `.claude/agents/code-agent.md`, `plugins/dark-factory/agents/code-agent.md`
  - **domain**: architecture
  - **enforced_by**: `tests/dark-factory-setup.test.js` (assertion: code-agent prompt contains the explicit barrier statement about `enforced_by`, `guards`, and test inference)
  - **rationale**: The holdout-test information barrier is a foundational Dark Factory guarantee. Memory introduces fields (`enforced_by`, `guards`) that POINT AT test files and implementation locations. Without an explicit prohibition covering both fields, code-agent could regress to test-inference — defeating the whole point of holdout isolation. This invariant makes the barrier explicit and testable.

- **INV-TBD-c**
  - **title**: Architect invariant-probe is per-domain and shard-selective; each domain loads only its own shards
  - **rule**: When architect-agent is spawned with a `domain` parameter, it MUST read the index first, then load ONLY `invariants-{domain}.md` and `decisions-{domain}.md`. It MUST NOT load shards belonging to other domains. Violations in a domain MUST be reported by that domain's reviewer alone; no cross-domain restating. Unclassified entries default to the security domain.
  - **scope.modules**: `.claude/agents/architect-agent.md`, `plugins/dark-factory/agents/architect-agent.md`
  - **domain**: architecture
  - **enforced_by**: `tests/dark-factory-setup.test.js` (assertion: architect-agent prompt contains per-domain shard-selective loading language, the default-to-security rule, and the explicit prohibition on loading other-domain shards)
  - **rationale**: Shard-selective loading is the mechanism that makes the index-first protocol pay off: each domain reviewer loads at most 1 index + 2 shards, bounding token cost per reviewer to ≤ 20,000 tokens from memory regardless of how large the other domain shards grow. Cross-domain loading would negate this guarantee.

### Modifies
*None.*

### Supersedes
*None.*

## Decisions

### References
*None — no existing decisions in scope.*

### Introduces

- **DEC-TBD-a**
  - **title**: Invariant-probe split across 3 existing architect domains using shard-selective loading (not a 4th parallel domain)
  - **decision**: The architect invariant/decision probe is performed by the three existing domain reviewers (security, architecture, api), each restricted to entries matching their own domain via the index + domain shard files. No fourth parallel architect is introduced.
  - **scope.modules**: `.claude/agents/architect-agent.md`
  - **domain**: architecture
  - **enforced_by**: `tests/dark-factory-setup.test.js` (assertion: architect spawn flow and domain assignment remain 3-parallel; architect prompt specifies index-first, then domain-specific shards)
  - **rationale**: Preserves consistency with the existing parallel review architecture that `implementation-agent` orchestrates. The shard-selective approach adds token efficiency on top of the per-domain discipline established in v1. Alternatives considered and rejected:
    - **Attach memory probe to Security only.** Rejected: poor scaling — the security reviewer would shoulder architecture and API invariants, diluting their focus.
    - **Introduce a fourth parallel domain (memory reviewer).** Rejected: requires updating `implementation-agent`'s orchestration, round timing, and synthesis logic.
    - **Serial probe after the three domain reviews synthesize.** Rejected: adds a fourth round, extending the pipeline by ~1 round of latency.
    - **Load all shards in every reviewer.** Rejected: defeats the token efficiency of the shard design — each reviewer would consume index + 6 shards instead of index + 2 shards.

- **DEC-TBD-b**
  - **title**: code-agent reads memory index + relevant shards directly (not via filtered summary passed through prompt)
  - **decision**: code-agent reads `dark-factory/memory/index.md` in Phase 1, then loads only the domain shards whose entries' `scope.modules` overlap with the files it will modify. The implementation-agent does NOT pre-filter or summarize memory into the code-agent's prompt.
  - **scope.modules**: `.claude/agents/code-agent.md`
  - **domain**: architecture
  - **enforced_by**: `tests/dark-factory-setup.test.js` (assertion: code-agent prompt references index and shard files directly; no mention of an external filter or summary mechanism)
  - **rationale**: Consistency with the existing Phase 1 load pattern (profile + code-map). The index-first approach makes direct-read more efficient than before (code-agent can skip irrelevant domain shards entirely). The alternative — implementation-agent filtering memory and injecting a summary into the code-agent prompt — was rejected because:
    1. It couples implementation-agent to the memory schema (schema changes ripple into orchestrator logic).
    2. The filter logic would duplicate architect's per-domain filtering, risking drift.
    3. Direct read is simpler to test and simpler to degrade gracefully.
  - The risk that code-agent could exploit `enforced_by` or `guards` paths for test inference is mitigated by the explicit constraint-awareness rule (see INV-TBD-b).

### Supersedes
*None.*

## Traceability

| Spec Item | Scenario(s) |
|-----------|-------------|
| FR-1 (spec-agent Phase 1 index-first load) | P-01, P-NEW-01 |
| FR-2 (spec-agent references existing memory) | P-02, H-06 |
| FR-3 (spec-agent declares candidates) | P-03 |
| FR-4 (spec-agent declares mods/supersessions) | P-04, H-08 |
| FR-5 (empty memory sections valid) | P-05 |
| FR-6 (architect per-domain probe — index-first, shard-selective) | P-06, P-NEW-02, H-01, H-NEW-01 |
| FR-7 (architect findings format) | P-06, P-07 |
| FR-8 (architect BLOCKER rules) | H-01, H-02, H-03 |
| FR-9 (architect SUGGESTION rule) | P-07, H-04 |
| FR-10 (code-agent Phase 1 index-first load) | P-08, H-NEW-02 |
| FR-11 (code-agent constraint filtering) | P-08, H-09 |
| FR-12 (code-agent constraint-awareness + guards opaque) | P-09, H-05, H-NEW-05 |
| FR-13 (debug-agent Phase 1 index-first load) | P-10 |
| FR-14 (debug-agent invariant cross-reference) | P-10, H-07 |
| FR-15 (spec-template sections) | P-11 |
| FR-16 (plugin mirror parity) | P-12 |
| FR-17 (graceful degradation — index missing) | P-13, P-NEW-03, H-NEW-03 |
| FR-18 (graceful degradation — specific shard missing) | H-10, H-NEW-04 |
| FR-19 (graceful degradation — all shards missing) | P-13, H-NEW-03 |
| FR-20 (graceful degradation — ledger missing) | H-10 |
| FR-21 (architect probe skipped when registry missing) | P-13, H-NEW-03 |
| BR-1 | P-03 (spec-agent declares but does not write) |
| BR-2, BR-3 | H-01, H-11, H-NEW-01 |
| BR-4 | P-05 |
| BR-5 | P-09, H-05, H-NEW-05 |
| BR-6 | H-08 (TBD IDs are spec-local) |
| BR-7 | H-11 (default-to-security) |
| BR-8 | H-12 (no cascade) |
| BR-9 | H-NEW-01 (architect loads only its own shard) |
| BR-10 | H-NEW-02 (index is routing layer, not detail layer) |
| EC-1 | P-05, P-13 |
| EC-2 | H-10, H-NEW-04 |
| EC-3 | H-13 |
| EC-4 | P-07, H-04 |
| EC-5 | H-11 |
| EC-6 | H-14 |
| EC-7 | H-08 |
| EC-8 | H-15 |
| EC-9 | P-08 |
| EC-10 | H-05, H-NEW-05 |
| EC-11 | P-10 |
| EC-12 | H-16 |
| EC-13 | H-17 |
| EC-14 | H-18 |
| EC-15 | H-03 |
| EC-16 | P-05, P-13 |
| EC-17 | P-NEW-01 |
| AC-1 through AC-14 | Covered collectively by P-01..P-13, P-NEW-01..P-NEW-03, H-01..H-18, H-NEW-01..H-NEW-06 and test-suite presence |
