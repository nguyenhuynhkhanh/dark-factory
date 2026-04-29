# Feature: ao-design-intent

## Context

Dark Factory's memory system captures invariants (rules that must hold) and decisions (choices that were made). But neither captures the *intent* behind those rules — the "why it must survive" that keeps future AI-generated changes aligned with original design goals.

Without recorded design intent, agents operating on a codebase can:
- Satisfy all active invariants literally while eroding the spirit of a design
- Make changes that are syntactically correct but semantically drift from established patterns
- Miss that a pipeline ordering constraint isn't arbitrary — it prevents a known class of race conditions
- Not realize that a "simple refactor" breaks an information barrier that was placed deliberately

**Design Intent** addresses this by introducing a first-class memory type — `DI-NNNN` — that captures WHY a design decision was made in terms of the invariant or pattern that must survive. It is distinct from invariants (which state what must hold) and decisions (which state what was chosen) by focusing on the survival criterion: what makes this design fragile, and how is it protected.

This feature has two delivery items:

1. **Memory system extension**: A new `DI-NNNN` memory type stored in `memory/design-intent-{domain}.md` shard files. Design intents are extracted during onboarding (onboard-agent Phase 3.7 extension), promoted from specs (promote-agent DI write-through), and checked during review (architect-agent Intent & Drift Check). The existing single-writer protocol is extended to cover DI shards.

2. **Spec template change**: A new `## Design Intent` section in `dark-factory/templates/spec-template.md` that spec-agent auto-populates during scope sign-off using data from loaded memory shards. Three fields: *Intent introduced*, *Existing intents touched*, *Drift risk*. Optional for Tier 1; suggested (non-blocking) for Tier 2/3; architect emits a SUGGESTION (never CONCERN or BLOCKER) if missing on a Tier 3 spec; architect emits a CONCERN (not BLOCKER) if Drift risk is empty on a spec with cross-cutting keywords.

This feature is the third component of the `ao-pipeline-improvements` group, building on the existing Project Memory foundation (INV-NNNN domain shards, DEC-NNNN domain shards, single-writer promote-agent, index-first load protocol).

## Design Intent

**Intent introduced**: Design Intent (`DI-NNNN`) is a new first-class memory type that records why an architectural pattern must survive — not just what must hold (invariant) or what was chosen (decision). The pipeline's ability to catch silent erosion depends on this "survival criterion" being explicitly recorded and checked at review time. Spec-agent's auto-population closes the gap where important design reasoning lives only in the author's head and evaporates at cleanup time.

**Existing intents touched**: None — this is the bootstrapping spec for the DI type itself. No prior DI-NNNN entries exist.

**Drift risk**: The most vulnerable point is the softness of the "SUGGESTION, never BLOCKER" rule for the `## Design Intent` section. Without a tested invariant anchoring this enforcement level, future edits to architect-agent could silently escalate it to a CONCERN or BLOCKER and break backward compatibility for existing Tier 3 specs. Protection: INV-TBD-c enforces the enforcement-level boundary via `tests/dark-factory-setup.test.js`.

## Scope

### In Scope (this spec)

**Memory system extension (Item 1):**
- New shard type: `memory/design-intent-{domain}.md` (three files: `design-intent-security.md`, `design-intent-architecture.md`, `design-intent-api.md`). DI entries are stored in these new shards, not co-mingled into invariant or decision shards.
- New entry ID scheme: `DI-NNNN` (zero-padded 4-digit sequential IDs, same scheme as INV-NNNN and DEC-NNNN; placeholder `DI-TBD-*` in specs until promotion).
- New entry format defined in `dark-factory/templates/project-memory-template.md` (canonical schema extension for the three new shard files and index rows).
- `memory/index.md` entry row format extended: new `[type:design-intent]` value.
- **Onboard-agent Phase 3.7 extension (Phase 3.7d)**: new extraction step that scans agent MUST/NEVER/ALWAYS rules, information barriers, tiering invariants, and pipeline sequencing rules for design intent candidates. Presents as Batch 4 in Phase 7 Memory Sign-Off ("Design Intents"). Bootstrap Write Exception extended to cover DI shard files.
- **Promote-agent DI write-through**: at promotion, promote-agent reads the spec's `## Design Intent` section, assigns permanent `DI-NNNN` IDs to any `DI-TBD-*` placeholders, writes new DI entries to the appropriate `design-intent-{domain}.md` shard, updates `memory/index.md` with new DI rows.
- **Architect-agent Intent & Drift Check**: added as a `### Intent & Drift Check` subsection to each of the three existing domain reviewers (Security, Architecture, API). Per-domain rules defined. Emit SUGGESTION (never CONCERN/BLOCKER) if Tier 3 spec lacks `## Design Intent` section. Emit CONCERN (not BLOCKER) if `Drift risk` is empty on a spec with cross-cutting keywords. Source of "existing design intents" for the check: only `memory/design-intent-{domain}.md` shards (DI-NNNN entries) — NOT freeform codebase inference.
- **`dark-factory-context.md` rule update**: add guidance that agents needing design intent context should load `memory/design-intent-{domain}.md` shard(s) appropriate for their task.
- **`project-memory-template.md` extension**: add DI shard file schema, DI entry format, DI field definitions, DI index row format, and DI example entry. Full schema parallel to invariant and decision schemas.
- **Plugin mirrors**: all modified source files must be mirrored to `plugins/dark-factory/`.
- **Test coverage**: `tests/dark-factory-setup.test.js` new assertions for DI schema, shard files, onboard-agent Phase 3.7d, promote-agent DI write-through, architect-agent Intent & Drift Check, enforcement-level correctness, and context rule update.

**Spec template change (Item 2):**
- `dark-factory/templates/spec-template.md`: add `## Design Intent` section between `## Context` and `## Scope`. Three fields with prose guidance. OPTIONAL marker for Tier 1; tier-conditional behavior described inline.
- Spec-agent auto-populate instruction: spec-agent reads loaded DI shards during Phase 2a (alongside INV/DEC shards), populates `## Design Intent` from found entries, presents to developer at scope sign-off.
- Plugin mirror: `plugins/dark-factory/templates/spec-template.md`.

### Out of Scope (explicitly deferred)

- A "DI viewer" or admin UI for browsing design intent entries — not needed; the shard files serve this purpose directly.
- Automatic enforcement checking of DI entries in code (i.e., a linter or AST-level check that the code satisfies the design intent prose) — too speculative; DI is a human/LLM review aid.
- Retroactive DI extraction for already-promoted features beyond what onboard-agent extracts from agent rules — future DI entries for past decisions require manual spec or a dedicated backfill run.
- DI entries in debug report template — debug-agent cross-references INV entries; DI is an authoring concern, not a root cause classification concern. Deferred.
- `decisions-{domain}.md` co-mingling of DI entries — investigated and rejected (see `DEC-TBD-b`); new shards are cleaner.
- Changes to `implementation-agent.md` orchestration for DI — no change needed; architect-agent handles DI checks within the existing parallel review protocol.
- Changes to `code-agent.md` for DI loading — code-agent constraint loading already covers INV shards; DI entries are for authoring-time and review-time only, not implementation-time constraint enforcement.
- DI token budget monitoring beyond the existing soft-cap pattern from invariant shards — same ≤ 8,000 token soft cap applies; no new monitoring infrastructure needed.

### Scaling Path

Design Intent shards follow the same scaling trajectory as invariant and decision shards: three domain files, each with a soft cap of ≤ 8,000 tokens. If a single domain shard grows past ~200 entries (~8,000 tokens), the same shard-split pattern used for invariant shards applies. DI entries are expected to grow more slowly than invariants because they represent design philosophies, not enforcement rules — a project might have 50 DI entries vs. 200 invariants at maturity. The index-first load protocol already applied to INV/DEC shards handles DI entries automatically via the same `[type:design-intent]` tag.

## Requirements

### Functional

- **FR-1: New DI shard type in project-memory-template.md.** `dark-factory/templates/project-memory-template.md` MUST define three new shard files: `memory/design-intent-security.md`, `memory/design-intent-architecture.md`, `memory/design-intent-api.md`. The DI entry format, all required and optional fields, field definitions, DI index row format (`[type:design-intent]`), complete example entry, and table of 8 memory files updated to 11 must all be present. The template is the canonical schema; no agent prompt may embed DI schema inline.

- **FR-2: DI entry ID scheme.** DI entries use zero-padded 4-digit sequential IDs (`DI-0001`, `DI-0002`, ...) assigned exclusively by promote-agent at promotion time. In specs, placeholder IDs use lowercase letters sequential within the spec (`DI-TBD-a`, `DI-TBD-b`, ...). IDs are never reused. The same sequential counter lives globally across all three DI shards (same assignment rules as INV and DEC).

- **FR-3: DI entry required fields.** Every DI entry MUST carry: `id`, `title`, `intent` (the survival criterion — what this pattern must protect and why it is fragile), `drift_risk` (what aspect is most vulnerable to silent erosion), `protection` (how the intent is protected: naming convention / test / invariant entry / architectural encapsulation), `scope.modules`, `domain`, `status` (`active | superseded | deprecated`), `introducedBy`, `introducedAt`, `rationale`, `shard`, and either `enforced_by` OR `enforcement: runtime | manual`. Optional: `tags`, `guards`, `referencedBy`, `supersededBy`.

- **FR-4: Spec-template ## Design Intent section.** `dark-factory/templates/spec-template.md` MUST include a `## Design Intent` section placed between `## Context` and `## Scope`. The section MUST contain three labeled fields: **Intent introduced**, **Existing intents touched**, **Drift risk**. MUST include a tier-conditionality note: OPTIONAL for Tier 1; SUGGESTED (never blocking) for Tier 2/3. MUST include a note that spec-agent auto-populates it using data from loaded DI/INV/DEC shards. MUST include a note that absence on a Tier 3 spec triggers architect SUGGESTION (never CONCERN/BLOCKER). MUST include prose guidance for each field.

- **FR-5: Spec-agent auto-populates ## Design Intent.** During Phase 2a (memory load), spec-agent MUST also load the `design-intent-{domain}.md` shard(s) matching the spec's scope domains (same domain-selection logic applied to DI shards as to INV/DEC shards). During Phase 4 (Write the Spec), spec-agent MUST auto-populate the `## Design Intent` section using data from loaded DI shards plus the INV/DEC entries already loaded. The populated section MUST be presented to the developer during scope sign-off (before the spec is finalized). The developer may confirm, edit, or remove it. Spec-agent MUST NOT skip this step for Tier 2/3 specs.

- **FR-6: Promote-agent DI write-through.** At promotion, promote-agent MUST:
  1. Read the spec's `## Design Intent` section if present.
  2. If `DI-TBD-*` placeholders exist in the spec's `## Invariants > Introduces` or anywhere the spec declares DI entries: assign permanent `DI-NNNN` IDs using the same global sequential counter.
  3. Write each new DI entry to the appropriate `design-intent-{domain}.md` shard.
  4. Update `memory/index.md` with one new `[type:design-intent]` row per DI entry.
  5. Record `introducedDesignIntents: [DI-NNNN, ...]` in the `ledger.md` FEAT entry for this promotion.
  6. If the spec has no `## Design Intent` section or has no `DI-TBD-*` entries: skip DI write-through without error. This is valid (not all specs introduce DI entries).

- **FR-7: Architect-agent Intent & Drift Check — Security domain.** The Security domain reviewer MUST include a `### Intent & Drift Check` subsection in its domain review criteria. It MUST check: does this spec introduce, erode, or silently violate security contracts established by active DI entries in `design-intent-security.md`? BLOCKER if an active DI entry's `protection` mechanism is removed or bypassed without declaration. CONCERN if `Drift risk` is empty on a spec with cross-cutting keywords (`all agents`, `pipeline`, `system-wide`). SUGGESTION (never BLOCKER) if Tier 3 spec lacks `## Design Intent` section entirely.

- **FR-8: Architect-agent Intent & Drift Check — Architecture domain.** The Architecture domain reviewer MUST include a `### Intent & Drift Check` subsection. It MUST check: is the proposed structure legible as an intent? Does it resist future erosion via naming, encapsulation, or test coverage? Source of "existing design intents": only `memory/design-intent-architecture.md` entries — NOT freeform codebase inference. Same enforcement-level rules as FR-7.

- **FR-9: Architect-agent Intent & Drift Check — API domain.** The API domain reviewer MUST include a `### Intent & Drift Check` subsection. It MUST check: does this spec preserve backward compatibility and contract legibility as an expressed intent? Source: only `memory/design-intent-api.md`. Same enforcement-level rules as FR-7.

- **FR-10: Architect enforcement-level rule (critical).** MUST/NEVER rules (all caps):
  - The absence of `## Design Intent` on a Tier 3 spec MUST emit SUGGESTION. NEVER CONCERN. NEVER BLOCKER.
  - `Drift risk` empty on a spec with cross-cutting keywords MUST emit CONCERN. NEVER BLOCKER.
  - Source of existing DI entries for the check MUST be only memory shard data. NEVER freeform codebase inference.
  These three enforcement-level rules MUST be stated explicitly in the architect-agent prompt.

- **FR-11: Onboard-agent Phase 3.7d — Design Intent extraction.** Onboard-agent Phase 3.7 MUST include a new Phase 3.7d step that extracts design intent candidates from:
  - Agent/skill markdown `NEVER`, `MUST`, `ALWAYS` rules that represent pipeline sequencing, information barriers, or tiering invariants (same sources as Phase 3.7a, different candidate type)
  - The rationale behind architectural patterns found in the profile's Architecture section (same source as Phase 3.7b)
  Candidate shape: `id` (`DI-CANDIDATE-N`), `title`, `intent`, `drift_risk`, `protection`, `scope`, `domain`, `rationale`, `confidence`. Missing `sourceRef` → silently drop (same policy as 3.7a). Low-confidence candidates default to rejected (same policy as 3.7a).

- **FR-12: Onboard-agent Phase 7 Memory Sign-Off Batch 4.** The Phase 7 Memory Sign-Off MUST include a Batch 4 — "Design Intents" — with the same per-entry semantics as Batch 1 (accept / edit / reject; bulk accept/reject). Bootstrap Write Exception extended: onboard-agent is also authorized to write to `design-intent-{domain}.md` shards at onboard time (same scope restriction as existing exception: narrowly scoped to onboard time).

- **FR-13: dark-factory-context.md rule update.** `.claude/rules/dark-factory-context.md` MUST be updated to include: agents that need design intent context should also load `memory/design-intent-{domain}.md` shard(s) as appropriate for their task. This is additive guidance only — no existing load instruction is modified.

- **FR-14: Graceful degradation — DI shards missing.** If any `design-intent-{domain}.md` file is absent: all consumers log `"DI shard {filename} not found — proceeding without design intent context for {domain}"` and proceed. No BLOCKER. Same non-blocking policy as invariant and decision shard missing.

- **FR-15: Backward compatibility — specs without ## Design Intent.** Active specs that predate this feature and lack a `## Design Intent` section MUST NOT be blocked by the architect review. The architect emits SUGGESTION at most. This is the same backward-compatibility policy applied to pre-memory specs under `project-memory-consumers`.

- **FR-16: Plugin mirror parity.** All modified source files MUST be mirrored exactly to their `plugins/dark-factory/` counterparts. Files modified by this spec: `project-memory-template.md`, `spec-template.md`, `architect-agent.md`, `onboard-agent.md`, `promote-agent.md`, `dark-factory-context.md`. Contracts test enforces byte-identical content.

- **FR-17: Test coverage.** `tests/dark-factory-setup.test.js` MUST contain new assertions covering:
  - DI shard file schema present in project-memory-template.md (FR-1)
  - spec-template.md contains `## Design Intent` section (FR-4)
  - spec-template.md `## Design Intent` section contains all three fields (FR-4)
  - architect-agent.md contains `### Intent & Drift Check` subsection (FR-7/8/9)
  - architect-agent.md enforcement-level rules: SUGGESTION for missing section, CONCERN for empty drift risk, no BLOCKER on DI grounds (FR-10)
  - onboard-agent.md Phase 3.7d Design Intent extraction step (FR-11)
  - onboard-agent.md Phase 7 Batch 4 Design Intents (FR-12)
  - promote-agent.md DI write-through (FR-6)
  - dark-factory-context.md references design-intent shards (FR-13)
  - DI shard missing → non-blocking degradation (FR-14)

### Non-Functional

- **NFR-1: No token explosion from DI shards.** DI shards follow the same soft cap as invariant shards: ≤ 8,000 tokens per shard. The index row for a DI entry adds the same ~8 tokens as an INV or DEC row. Loading the index plus all three DI shards adds at most 4,000 + 3 × 8,000 = 28,000 tokens on top of the existing memory budget. Agents load DI shards only when the spec's domain matches — same shard-selective discipline.

- **NFR-2: Additive-only changes.** No existing INV-NNNN or DEC-NNNN entries are modified by this spec. The new DI shard files are additive. The `## Design Intent` section in the spec template is additive (existing specs are backward-compatible via FR-15). The architect-agent additions are subsections of existing sections (non-breaking).

- **NFR-3: DI enforcement level is never silently escalated.** The SUGGESTION / CONCERN / never-BLOCKER rule is a permanent boundary. Test coverage in `tests/dark-factory-setup.test.js` explicitly asserts the exact enforcement-level language appears in the architect-agent prompt so future edits cannot silently escalate.

- **NFR-4: Spec-agent DI load follows existing index-first protocol.** DI shards are loaded in the same Phase 2a step as INV/DEC shards, using the same domain-selection logic, same graceful degradation (missing shard → log and proceed), and same single-read-per-invocation rule.

## Data Model

### New files added to dark-factory/memory/

Three new shard files (created empty with header comment at bootstrap, then populated by onboard-agent and promote-agent):

- `dark-factory/memory/design-intent-security.md`
- `dark-factory/memory/design-intent-architecture.md`
- `dark-factory/memory/design-intent-api.md`

**DI entry format** (defined in `project-memory-template.md`):

```
## DI-NNNN: <title>

- **id**: DI-NNNN
- **title**: <short descriptive title>
- **intent**: <the survival criterion — what pattern must survive and why it is fragile>
- **drift_risk**: <what aspect is most vulnerable to silent erosion by future AI edits>
- **protection**: <how it is protected: naming convention | test | invariant entry | architectural encapsulation>
- **scope.modules**: [<list of file paths or module names>]
- **domain**: security | architecture | api
- **status**: active | superseded | deprecated
- **supersededBy**: <DI-ID or "">
- **introducedBy**: <spec name>
- **introducedAt**: <ISO date>
- **rationale**: <why this design intent must be recorded>
- **shard**: design-intent-{domain}.md
- **enforced_by**: <path to test file>   # OR use enforcement below
- **enforcement**: runtime | manual      # escape hatch when no test exists
- **tags**: [<up to 5 lowercase keywords>]
- **guards**: [<file:line>, ...]
- **referencedBy**: [<list of spec names>]
```

### `memory/index.md` format extension

New entry type row format for DI entries:
```
## DI-NNNN [type:design-intent] [domain:{domain}] [tags:{csv}] [status:{status}] [shard:design-intent-{domain}.md]
{one-line summary}
```

The `[type:design-intent]` value is new. Existing index consumers use the index for shard routing; the new type value must not break any existing consumer that reads the index (they only inspect `[type:invariant]` or `[type:decision]` rows currently — adding a third type is purely additive).

### `project-memory-template.md` extension

- File overview table: add 3 new rows for DI shard files (total: 11 files).
- New section: `## File Schema: design-intent shard files` with shard frontmatter, entry format, field definitions table, and complete example.
- Index row format: document `design-intent` as a valid `[type]` value.
- `ledger.md` entry format: add `introducedDesignIntents: [DI-NNNN, ...]` field (optional, defaults to `[]`).

### `dark-factory/promoted-tests.json` — no change

No change to the promoted test registry format.

## Migration & Deployment

**No existing data is modified.** This spec adds new files and new sections to existing files. No existing INV/DEC entries are renamed, reformatted, or moved. No index entries are deleted or modified.

**New DI shard files.** Three new files are added to `dark-factory/memory/`. They start empty with a header comment (same bootstrap pattern as existing invariant and decision shards). No data migration required.

**Existing specs without `## Design Intent` section.** The architect-agent's backward-compatibility rule (FR-15, SUGGESTION at most) ensures no active spec is blocked during or after deployment. Existing specs in flight are unaffected.

**Spec template change is additive.** The new `## Design Intent` section is inserted between `## Context` and `## Scope`. No existing section is renamed or removed. New specs generated after deployment will include the section; existing specs in flight will not (and are tolerated by architect per FR-15).

**`project-memory-template.md` extension.** The template gains new sections. Existing consumers (onboard-agent, promote-agent, contracts test) reference specific sections by content matching; the new sections are additive and do not conflict with existing section matching logic.

**`memory/index.md` format.** Adding `[type:design-intent]` as a valid type. Index consumers (spec-agent, architect-agent, code-agent, debug-agent) currently filter by `[type:invariant]` or `[type:decision]`; the new type is invisible to existing type-based filtering — purely additive.

**Rollback.** Remove the three new DI shard files from `dark-factory/memory/`. Revert the agent file changes. No persistent state is lost (DI entries are new; no existing entries reference them). Zero-downtime rollback.

**Deployment order.** This spec has no external dependencies (see Dependencies section). All file changes deploy in a single commit. Agent prompts are read at spawn time.

**Plugin mirror sync.** After modifying any source file, the identical content MUST be written to the `plugins/dark-factory/` counterpart in the same commit.

## API Endpoints

N/A — no API endpoints. This feature modifies agent prompts, memory template files, and memory shard files.

## Business Rules

- **BR-1: DI entries are authored by spec-agent (via spec `## Design Intent`) and materialized by promote-agent.** Spec-agent populates `DI-TBD-*` placeholders; promote-agent assigns permanent `DI-NNNN` IDs and writes to DI shards. Same single-writer protocol as INV/DEC.
- **BR-2: DI type is orthogonal to INV and DEC.** A design intent describes survival criteria; an invariant describes enforcement rules; a decision describes a choice. The three types answer different questions and are stored in separate shard files. A spec may introduce entries of all three types simultaneously.
- **BR-3: Architect checks DI entries only from DI shards.** Architect-agent MUST NOT infer design intents from freebase codebase reading during the Intent & Drift Check. Source is exclusively `design-intent-{domain}.md` entries. This preserves the deterministic, registry-driven review model.
- **BR-4: Enforcement-level boundary for missing `## Design Intent` is inviolable.** Tier 3 spec missing the section → SUGGESTION. Never CONCERN. Never BLOCKER. This boundary is tested by an assertion in `tests/dark-factory-setup.test.js` that checks for the exact enforcement-level language in the architect-agent prompt. Future edits that weaken or tighten this rule require updating the spec (which triggers the same review pipeline) and the test.
- **BR-5: `Drift risk` empty on cross-cutting spec → CONCERN, not BLOCKER.** A CONCERN may cause the architect to request a spec-agent respawn, but does not block implementation. This keeps the DI mechanism lightweight for specs with obvious drift risk that the author simply forgot to document.
- **BR-6: Spec-agent auto-population is non-blocking.** If no DI shard files exist (pre-onboard state), spec-agent skips DI population and leaves the section empty. This is valid — the section is OPTIONAL for Tier 1 and SUGGESTED for Tier 2/3 (never mandatory). The developer is not prompted to fill it manually; the empty state is acceptable.
- **BR-7: DI TBD IDs are spec-local.** `DI-TBD-a`, `DI-TBD-b` are unique within a single spec, not globally. Two concurrent specs may each declare `DI-TBD-a` without conflict — promote-agent assigns permanent sequential IDs at promotion.
- **BR-8: Onboard-agent DI extraction is conservative.** DI candidates extracted during Phase 3.7d follow the same confidence policy as INV candidates: low-confidence defaults to rejected; developer must explicitly opt in. Missing `sourceRef` → silently dropped. Greenfield project → zero DI candidates emitted.
- **BR-9: DI entries do not carry `guards` field as a code-agent constraint hint.** Same information-barrier rule as INV entries. Code-agent MUST NOT use the `guards` field in a DI entry to infer test coverage or holdout scenario content.

## Error Handling

| Scenario | Response | Side Effects |
|----------|----------|--------------|
| `design-intent-{domain}.md` shard missing | Log: `"DI shard design-intent-{domain}.md not found — proceeding without design intent context for {domain}"` | No BLOCKER; pipeline proceeds |
| `## Design Intent` section missing from Tier 3 spec | Architect emits SUGGESTION: "Tier 3 spec is missing `## Design Intent` section — consider adding intent, existing intents touched, and drift risk fields" | Never CONCERN. Never BLOCKER. Spec-agent may be respawned if architect requests. |
| `Drift risk` field empty on spec with cross-cutting keywords | Architect emits CONCERN: "Drift risk is empty on a cross-cutting spec — document what aspect of this spec is most vulnerable to silent erosion" | Never BLOCKER. May trigger spec-agent respawn for Concern resolution. |
| `## Design Intent` section missing from Tier 1 or Tier 2 spec | No architect action — section is OPTIONAL for Tier 1, SUGGESTED (presented in scope sign-off) for Tier 2 but no enforcement action | Normal flow |
| `DI-TBD-*` placeholder in spec with missing required field | Architect (domain-matching) emits BLOCKER: "DI-TBD-{X} is missing required field(s): {list}" — same policy as INV-TBD-* missing fields | Spec-agent respawned to complete fields |
| Promote-agent encounters spec with `DI-TBD-*` but no design-intent shard for the domain | Create the shard file if it does not exist (with header comment), then write the entry | New shard file created in same promotion commit |
| Architect spawned for legacy spec with no `## Design Intent` section | Emit SUGGESTION: "Spec predates Design Intent section — no DI review possible" — do NOT BLOCKER | Normal flow per BR-4 and FR-15 |
| `DI-TBD-*` entries exist but spec's `## Design Intent > Intent introduced` field is empty | Architect emits CONCERN: "DI-TBD entries declared but Intent introduced field is empty — populate or remove DI entries" | May trigger respawn |
| Architect's Intent & Drift Check finds active DI entry eroded without declaration | BLOCKER in the domain reviewer that owns the DI entry's domain | Spec-agent respawned |
| onboard-agent Phase 3.7d produces zero DI candidates | Normal outcome; Batch 4 in sign-off displays "No design intent candidates found" | Developer proceeds with empty DI shards |

## Acceptance Criteria

- [ ] **AC-1**: `dark-factory/templates/project-memory-template.md` contains a `## File Schema: design-intent shard files` section with DI entry format, field definitions, and a complete DI example entry with all required fields.
- [ ] **AC-2**: `dark-factory/templates/project-memory-template.md` overview table updated to include the three new DI shard files (11 files total).
- [ ] **AC-3**: `dark-factory/templates/project-memory-template.md` documents `[type:design-intent]` as a valid index row type.
- [ ] **AC-4**: `dark-factory/templates/project-memory-template.md` ledger entry format includes `introducedDesignIntents` field.
- [ ] **AC-5**: `dark-factory/templates/spec-template.md` contains `## Design Intent` section placed between `## Context` and `## Scope` with all three fields (Intent introduced, Existing intents touched, Drift risk) and tier-conditionality note.
- [ ] **AC-6**: `.claude/agents/spec-agent.md` Phase 2a loads `design-intent-{domain}.md` shards alongside INV/DEC shards. Phase 4 auto-populates `## Design Intent` and presents to developer at scope sign-off.
- [ ] **AC-7**: `.claude/agents/architect-agent.md` each domain reviewer section contains a `### Intent & Drift Check` subsection with: per-domain check criteria, SUGGESTION rule for missing section on Tier 3, CONCERN rule for empty drift risk on cross-cutting spec, source restriction to memory shards only.
- [ ] **AC-8**: `.claude/agents/architect-agent.md` explicitly states the three enforcement-level rules: SUGGESTION (never CONCERN/BLOCKER) for missing section, CONCERN (never BLOCKER) for empty drift risk, source MUST be only memory shard data.
- [ ] **AC-9**: `.claude/agents/onboard-agent.md` Phase 3.7 includes Phase 3.7d Design Intent extraction step with DI-CANDIDATE-N shape and sources (agent MUST/NEVER/ALWAYS rules + profile Architecture rationale).
- [ ] **AC-10**: `.claude/agents/onboard-agent.md` Phase 7 Memory Sign-Off includes Batch 4 — "Design Intents" — with same per-entry accept/edit/reject semantics as Batch 1. Bootstrap Write Exception updated to include DI shard files.
- [ ] **AC-11**: `.claude/agents/promote-agent.md` DI write-through: reads spec `## Design Intent`, assigns `DI-NNNN` IDs, writes to `design-intent-{domain}.md` shards, updates `memory/index.md` with DI rows, records `introducedDesignIntents` in ledger entry.
- [ ] **AC-12**: `.claude/rules/dark-factory-context.md` includes additive note that agents needing design intent context should load `memory/design-intent-{domain}.md` shard(s).
- [ ] **AC-13**: Three new `memory/design-intent-{domain}.md` files exist with header comment (bootstrapped empty, consistent with existing shard bootstrap pattern).
- [ ] **AC-14**: Plugin mirrors for all changed source files are byte-identical: `project-memory-template.md`, `spec-template.md`, `architect-agent.md`, `onboard-agent.md`, `promote-agent.md`, `dark-factory-context.md`.
- [ ] **AC-15**: `tests/dark-factory-setup.test.js` contains new assertions covering AC-1 through AC-13 (string-matching style consistent with existing patterns), including explicit assertion that architect-agent contains exact enforcement-level language for SUGGESTION/CONCERN/never-BLOCKER boundary.
- [ ] **AC-16**: All existing tests still pass (no regression).

## Edge Cases

- **EC-1**: Spec has `## Design Intent` section with all three fields populated but no `DI-TBD-*` entries in `## Invariants > Introduces`. Promote-agent skips DI write-through for entries (none to write) but the FEAT ledger entry still records `introducedDesignIntents: []`. Normal outcome.
- **EC-2**: Spec has `DI-TBD-a` in `## Invariants > Introduces` but the spec's `## Design Intent` section is absent. Architect emits CONCERN (not BLOCKER): "DI-TBD entries declared but `## Design Intent` section is absent — inconsistency." Spec-agent adds the section on respawn.
- **EC-3**: Onboard-agent extracts a DI candidate with `domain: performance` (not a valid domain). Same resolution as INV candidates with invalid domain: rerouted to architecture shard + `[UNCLASSIFIED DOMAIN]` tag. Security reviewer may suggest the author correct the domain.
- **EC-4**: All three DI shards are absent (pre-onboard state, or clean installation before first run). Spec-agent logs the degradation message and leaves `## Design Intent` with placeholder prose ("No design intent baseline found — populate after `/df-onboard`"). Not a blocker. Architect emits SUGGESTION at most.
- **EC-5**: `design-intent-architecture.md` exists but `design-intent-security.md` and `design-intent-api.md` do not. Architecture reviewer loads its shard normally. Security and API reviewers log degradation messages and perform Intent & Drift Check with empty DI context.
- **EC-6**: Promote-agent encounters a spec with `DI-TBD-a` where the domain-matching DI shard file does not yet exist. Promote-agent creates the shard file with header comment, writes the entry, and updates the index. Same bootstrap-on-first-write behavior as promote-agent uses for other memory files.
- **EC-7**: Two concurrent specs in separate worktrees both declare `DI-TBD-a`. No conflict — TBD IDs are spec-local. Promote-agent assigns distinct `DI-NNNN` sequential IDs at each respective promotion.
- **EC-8**: Architect's Intent & Drift Check is run on a spec that has `## Design Intent` but `Existing intents touched` lists a `DI-NNNN` that does not exist in any loaded DI shard. Architect emits SUGGESTION: "DI-NNNN referenced in spec but not found in design intent shards — confirm this is the correct ID." Not a BLOCKER.
- **EC-9**: Spec-agent is re-spawned by architect in round 2. The re-spawned spec-agent MUST re-load DI shards (same round-re-run protocol as INV/DEC probe re-run). If the architect round introduced a new DI concern, the re-spawned spec-agent updates `## Design Intent` accordingly.
- **EC-10**: Spec with `Drift risk` populated but cross-cutting keywords present and `Existing intents touched` is empty. Architect does NOT emit CONCERN for the empty `Existing intents touched` field alone — only `Drift risk` emptiness triggers a CONCERN. `Existing intents touched` may legitimately be "None" (this spec is the first to touch a domain).
- **EC-11**: A DI entry in `design-intent-architecture.md` has `status: superseded`. Architect's Intent & Drift Check only checks `status: active` entries (same policy as INV/DEC probe). Superseded DI entries do not trigger findings.
- **EC-12**: The spec-agent auto-populates `## Design Intent` with content from a DI shard, but the developer rejects the populated content at scope sign-off. Spec-agent removes the content and leaves the section empty (or with developer-provided replacement). The developer's decision at sign-off is authoritative.

## Dependencies

None — this spec is independently implementable. It introduces the DI memory type and the associated agent extensions from scratch. No other spec in the `ao-pipeline-improvements` group (or any active spec) must complete before this one can be implemented.

## Implementation Size Estimate

- **Scope size**: large — 10 source files + plugin mirrors + 2 test file edits + 3 new memory shard files.

  Count: `project-memory-template.md`, `spec-template.md`, `architect-agent.md`, `onboard-agent.md`, `promote-agent.md`, `dark-factory-context.md` (6 source files), their plugin mirrors (6 mirror files), `tests/dark-factory-setup.test.js` and `tests/dark-factory-contracts.test.js` (2 test file edits), and 3 new `memory/design-intent-{domain}.md` files = 17 files touched total.

- **Suggested parallel tracks**: 3 tracks with zero source file overlap.

  **Track A: Memory schema + shard files (4 files)**
  - `dark-factory/templates/project-memory-template.md` — DI schema sections, overview table update, ledger field, index row type
  - `plugins/dark-factory/templates/project-memory-template.md` — mirror
  - `dark-factory/memory/design-intent-security.md` — bootstrap (empty + header)
  - `dark-factory/memory/design-intent-architecture.md` — bootstrap (empty + header)
  - `dark-factory/memory/design-intent-api.md` — bootstrap (empty + header)
  Test additions: AC-1 through AC-4 assertions in `tests/dark-factory-setup.test.js`; mirror parity for `project-memory-template.md` in `tests/dark-factory-contracts.test.js`.

  **Track B: Spec template + spec-agent + context rule (4 files)**
  - `dark-factory/templates/spec-template.md` — add `## Design Intent` section
  - `plugins/dark-factory/templates/spec-template.md` — mirror
  - `.claude/agents/spec-agent.md` — Phase 2a DI shard load + Phase 4 auto-populate
  - `plugins/dark-factory/agents/spec-agent.md` — mirror
  - `.claude/rules/dark-factory-context.md` — additive DI load guidance
  Test additions: AC-5, AC-6, AC-12 assertions; mirror parity for spec-template, spec-agent, and context rule.

  **Track C: Architect + onboard + promote agents (4 files)**
  - `.claude/agents/architect-agent.md` — Intent & Drift Check subsections
  - `plugins/dark-factory/agents/architect-agent.md` — mirror
  - `.claude/agents/onboard-agent.md` — Phase 3.7d + Batch 4 sign-off + Bootstrap Write Exception extension
  - `plugins/dark-factory/agents/onboard-agent.md` — mirror
  - `.claude/agents/promote-agent.md` — DI write-through
  - `plugins/dark-factory/agents/promote-agent.md` — mirror
  Test additions: AC-7, AC-8, AC-9, AC-10, AC-11 assertions; mirror parity for architect, onboard, and promote.

  **Shared test files.** `tests/dark-factory-setup.test.js` and `tests/dark-factory-contracts.test.js` are edited by all three tracks. Each track appends to distinct sections. Tracks run in order A → B → C if write contention is detected; otherwise parallel.

## Architect Review Tier

- **Tier**: 3
- **Reason**: 10+ files touched; populated migration section; cross-cutting keywords present ("all agents", "pipeline"); touches shared templates (`spec-template.md`, `project-memory-template.md`) and test contracts; introduces new memory type that modifies behavior of onboard-agent, promote-agent, architect-agent, and spec-agent.
- **Agents**: 3 domain agents
- **Rounds**: 3+ rounds minimum

Classification signals:
- Tier 1: ≤ 2 files, no migration section, no security/auth domain, no cross-cutting keywords
- Tier 2: 3–4 files, OR some cross-cutting concerns, not Tier 3 triggers
- Tier 3: 5+ files, OR populated migration section, OR cross-cutting keywords ("all agents", "pipeline", "system-wide"), OR shared templates/test contracts, OR security/auth domain

## Implementation Notes

**Where to add DI schema in project-memory-template.md.** Add a new `## File Schema: design-intent shard files` section after the existing `## File Schema: decision shard files` section. Follow the identical section structure: shard frontmatter, entry format, field definitions table, complete example. Also update the overview table (3 new rows) and the `## File Schema: index.md` section's `[type]` column documentation to include `design-intent`.

**Where to add `## Design Intent` in spec-template.md.** Insert after `## Context` and before `## Scope`. The section requires three fields with brief prose guidance inline. Add the tier-conditionality note immediately after the section header. The spec-agent auto-populate note should be in parentheses or a blockquote to distinguish it from fields the developer fills manually.

**Spec-agent Phase 2a DI load placement.** In spec-agent's Phase 2a (index-first memory load), the existing instruction says: load index → select domain shards for INV/DEC. Extend: "also load `design-intent-{domain}.md` shard(s) for the same selected domains." One line addition; same graceful degradation (missing shard → log and continue).

**Spec-agent Phase 4 auto-populate.** In spec-agent's Phase 4 (Write the Spec), alongside the existing instruction to populate `## Invariants` and `## Decisions`, add: "populate `## Design Intent` from loaded DI entries — list relevant active DI entries in `Existing intents touched`, describe what new intent this spec introduces in `Intent introduced`, and assess drift risk based on the spec's cross-cutting keywords and architectural scope. Present the populated section to the developer during scope sign-off."

**Architect Intent & Drift Check placement.** Each domain reviewer (Security, Architecture, API) already has a domain-specific review criteria section. Add `### Intent & Drift Check` as a final subsection within each reviewer's criteria block. The check is three bullets: (1) scope check against loaded DI entries, (2) SUGGESTION/CONCERN rules, (3) source restriction reminder. Keep it concise — the detailed enforcement rules are in FR-7/FR-8/FR-9/FR-10.

**Onboard-agent Phase 3.7d placement.** Add Phase 3.7d as a new numbered sub-phase after Phase 3.7c (Ledger Retro-Backfill). It uses the same agent rules as Phase 3.7a but targets DI-CANDIDATE-N instead of INV-CANDIDATE-N. Keep the step concise — extraction from agent rules is the same scan; the difference is candidate type and shape.

**Onboard-agent Bootstrap Write Exception extension.** In the `## Bootstrap Write Exception` section, add the three new DI shard file names to the list of files the exception covers.

**Promote-agent DI write-through placement.** In promote-agent's `### 7. Update Registry` step (or a new `### 8. Write Design Intent Memory`), add the DI write-through instructions. The promote-agent already knows the sequential ID assignment pattern; this is a parallel ID series (`DI-NNNN`) following the same logic. Add `introducedDesignIntents` to the FEAT ledger entry it writes.

**Test assertions pattern.** Follow existing `assert.ok(content.includes("..."))` style. For the enforcement-level boundary test (FR-10/AC-8), assert for the exact phrases "SUGGESTION" + "never CONCERN" + "never BLOCKER" (or equivalent phrasing from the agent) appearing in the architect-agent content. For the DI shard existence test (AC-13), use `fs.existsSync(path.join(ROOT, "dark-factory/memory", "design-intent-{domain}.md"))`.

## Invariants

### Preserves

- The existing single-writer protocol (`dark-factory/memory/` written only by promote-agent and onboard-agent) continues to hold. DI shard files are new additions under the same protocol — no new writers are introduced.

### References

*None — no existing registered INV-NNNN entries are in scope for this spec at time of authoring (memory registry is bootstrapped empty).*

### Introduces

- **INV-TBD-a**
  - **title**: DI shard files are single-writer; same protocol as INV/DEC shards
  - **rule**: `dark-factory/memory/design-intent-security.md`, `design-intent-architecture.md`, and `design-intent-api.md` MUST only be written by onboard-agent (at onboard time) and promote-agent (at promotion time). No other agent, skill, or code-agent running in a worktree may write to these files. Parallel code-agents MUST NOT write to any memory file, including DI shards.
  - **scope.modules**: [`dark-factory/memory/design-intent-security.md`, `dark-factory/memory/design-intent-architecture.md`, `dark-factory/memory/design-intent-api.md`, `.claude/agents/promote-agent.md`, `.claude/agents/onboard-agent.md`]
  - **domain**: architecture
  - **enforced_by**: `tests/dark-factory-setup.test.js`
  - **rationale**: DI shards must be consistent across concurrent feature implementations. Allowing multiple writers would cause merge conflicts and ID collisions. The single-writer protocol established for INV/DEC shards must cover DI shards identically.

- **INV-TBD-b**
  - **title**: Architect Intent & Drift Check enforcement level is bounded: SUGGESTION / CONCERN / never-BLOCKER
  - **rule**: The absence of `## Design Intent` on a Tier 3 spec MUST result in at most a SUGGESTION from the architect reviewer. Empty `Drift risk` on a cross-cutting spec MUST result in at most a CONCERN. Neither condition MUST result in a BLOCKER or prevent implementation from proceeding. The enforcement level for DI-related architect findings MUST NOT be escalated by future edits to the architect-agent prompt without a spec change.
  - **scope.modules**: [`.claude/agents/architect-agent.md`, `plugins/dark-factory/agents/architect-agent.md`]
  - **domain**: architecture
  - **enforced_by**: `tests/dark-factory-setup.test.js`
  - **rationale**: Design Intent is a lightweight authoring aid. Making it blocking would introduce friction for all Tier 3 specs and break backward compatibility with all existing specs that were authored before this feature. The enforcement level must be permanently bounded to keep the DI mechanism adopted vs. avoided.

- **INV-TBD-c**
  - **title**: Architect Intent & Drift Check sources design intent context only from DI memory shards, never from codebase inference
  - **rule**: When performing the Intent & Drift Check, architect-agent MUST use only entries from `design-intent-{domain}.md` shard files as the source of existing design intents. Architect MUST NOT infer design intents from reading source code, agent prompts, or any file outside `dark-factory/memory/design-intent-{domain}.md`. Freeform codebase inference as a DI source is prohibited.
  - **scope.modules**: [`.claude/agents/architect-agent.md`, `plugins/dark-factory/agents/architect-agent.md`]
  - **domain**: architecture
  - **enforced_by**: `tests/dark-factory-setup.test.js`
  - **rationale**: If architect could infer DI from freeform codebase reading, the Intent & Drift Check output would be non-deterministic and non-reproducible across agent invocations. Restricting to memory shard data makes the check deterministic: the same shard state always produces the same set of DI concerns.

### Modifies

*None.*

### Supersedes

*None.*

## Decisions

### References

*None — no existing registered DEC-NNNN entries are in scope for this spec at time of authoring.*

### Introduces

- **DEC-TBD-a**
  - **title**: Design Intent entries stored in new domain shard files, not co-mingled into decisions shards
  - **decision**: DI entries are stored in three new shard files (`design-intent-{domain}.md`) rather than appended to the existing `decisions-{domain}.md` files.
  - **rationale**: DI entries answer a different question than decisions ("what must survive" vs. "what was chosen"). Co-mingling them in decisions shards would require consumers to filter by entry type on every read, reducing the shard's coherence. Separate shards maintain clean type boundaries and allow per-type token budgets. The three-file pattern (security/architecture/api) is already established and well-understood.
  - **alternatives**: [{option: "store DI entries in decisions-{domain}.md with a new type field", reason_rejected: "decisions shards would require all-consumer type-filtering; shard coherence reduced; token budget shared between decisions and DI entries"}, {option: "store DI entries in invariants-{domain}.md", reason_rejected: "invariants and design intents have different fields and semantics; consumers would receive irrelevant fields when loading invariant constraints"}]
  - **status**: active
  - **supersededBy**: ""
  - **introducedBy**: ao-design-intent
  - **introducedAt**: 2026-04-29
  - **domain**: architecture
  - **tags**: [schema, memory, shard, design-intent]
  - **shard**: decisions-architecture.md
  - **referencedBy**: [ao-design-intent]

- **DEC-TBD-b**
  - **title**: Spec-agent auto-populates `## Design Intent` rather than leaving it fully human-authored
  - **decision**: Spec-agent auto-populates the `## Design Intent` section during Phase 4 (Write the Spec) using data already loaded from DI/INV/DEC memory shards, then presents the populated section to the developer at scope sign-off for confirmation, editing, or removal.
  - **rationale**: The `## Design Intent` section must be useful even for developers unfamiliar with the existing design intent registry. Auto-population using memory data ensures that existing DI entries surface at the moment the spec is being written, not discovered later at review time. Developer confirmation preserves authorial ownership while reducing the knowledge burden.
  - **alternatives**: [{option: "fully human-authored; spec-agent does not populate", reason_rejected: "authors without deep familiarity with the DI registry will produce empty or incorrect sections; defeats the purpose of maintaining a DI registry"}, {option: "architect-agent auto-fills Design Intent after spec is drafted", reason_rejected: "violates the spec-authoring-time window where intent should be captured; architect is a reviewer, not an author"}]
  - **status**: active
  - **supersededBy**: ""
  - **introducedBy**: ao-design-intent
  - **introducedAt**: 2026-04-29
  - **domain**: architecture
  - **tags**: [spec-agent, design-intent, auto-populate]
  - **shard**: decisions-architecture.md
  - **referencedBy**: [ao-design-intent]

### Supersedes

*None.*

## Traceability

| Spec Item | Scenario(s) |
|-----------|-------------|
| FR-1 (DI shard schema in project-memory-template.md) | P-01, P-02, P-03 |
| FR-2 (DI ID scheme DI-NNNN / DI-TBD-*) | P-04, H-01 |
| FR-3 (DI entry required fields) | P-02, H-02 |
| FR-4 (spec-template ## Design Intent section) | P-05, P-06 |
| FR-5 (spec-agent auto-populates ## Design Intent) | P-07, H-03, H-04 |
| FR-6 (promote-agent DI write-through) | P-08, H-05, H-06 |
| FR-7 (architect Security Intent & Drift Check) | P-09, H-07 |
| FR-8 (architect Architecture Intent & Drift Check) | P-09, H-07 |
| FR-9 (architect API Intent & Drift Check) | P-09, H-07 |
| FR-10 (enforcement-level boundary: SUGGESTION/CONCERN/never-BLOCKER) | P-09, P-10, H-08, H-09 |
| FR-11 (onboard-agent Phase 3.7d) | P-11, H-10 |
| FR-12 (onboard-agent Phase 7 Batch 4) | P-11, H-11 |
| FR-13 (dark-factory-context.md update) | P-12 |
| FR-14 (graceful degradation — DI shard missing) | P-13, H-12 |
| FR-15 (backward compatibility — specs without ## Design Intent) | P-10, H-09 |
| FR-16 (plugin mirror parity) | P-14 |
| FR-17 (test coverage assertions) | P-15 |
| BR-1 | P-07, P-08 |
| BR-2 | P-01 (DI type orthogonal to INV/DEC) |
| BR-3 | H-07 (architect checks DI from shards only) |
| BR-4 | P-10, H-09 (enforcement level boundary tested) |
| BR-5 | P-10 (CONCERN not BLOCKER for empty drift risk) |
| BR-6 | H-01 (DI TBD IDs are spec-local) |
| BR-7 | H-14 (no-op / empty auto-populate) |
| BR-8 | H-10 (conservative extraction) |
| BR-9 | H-13 (DI guards field opaque to code-agent) |
| EC-1 | P-08, H-05 |
| EC-2 | H-02, H-15 |
| EC-3 | H-16 |
| EC-4 | P-13, H-12 |
| EC-5 | H-12 |
| EC-6 | H-06 |
| EC-7 | H-01 |
| EC-8 | H-17 |
| EC-9 | H-03 (re-spawn re-loads DI shards) |
| EC-10 | P-10 |
| EC-11 | H-18 |
| EC-12 | H-04 |
| AC-1 through AC-16 | Covered collectively by P-01..P-15 and H-01..H-18 |
