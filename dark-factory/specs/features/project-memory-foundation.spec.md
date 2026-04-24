# Feature: project-memory-foundation

## Context

Dark Factory's cleanup phase deletes spec artifacts once a feature is promoted. Agents do not read git history for context. This causes three recurring failures:

1. New features silently break existing invariants that no one remembers declaring (e.g., "every employee must have a phone number").
2. New features contradict past architectural decisions (e.g., "we validate at middleware, not in services") without anyone noticing at review time.
3. The framework has no durable memory of what was shipped — the "feature ledger" lives only in git log, which no agent consults.

The Project Memory layer introduces a structured, committed artifact directory at `dark-factory/memory/` that captures invariants, decisions, and a feature ledger. Later sub-specs will wire agents to read and write it. **This spec delivers the structural foundation only** — no agent behavior changes yet.

The foundation must land first because every downstream sub-spec (`project-memory-onboard`, `project-memory-consumers`, `project-memory-lifecycle`) depends on the directory, the schema, the template, and the rule plumbing existing.

## Scope

### In Scope (this spec)

- **New directory** `dark-factory/memory/` containing:
  - `index.md` — always-loaded compact index with one heading row per memory entry, grep-friendly inline metadata. Loaded by every agent as the primary memory context source.
  - `invariants-security.md` — domain-sharded invariants for the security domain. Ships empty (frontmatter only, zero entries).
  - `invariants-architecture.md` — domain-sharded invariants for the architecture domain. Ships empty.
  - `invariants-api.md` — domain-sharded invariants for the api domain. Ships empty.
  - `decisions-security.md` — domain-sharded decisions for the security domain. Ships empty.
  - `decisions-architecture.md` — domain-sharded decisions for the architecture domain. Ships empty.
  - `decisions-api.md` — domain-sharded decisions for the api domain. Ships empty.
  - `ledger.md` — YAML frontmatter + append-only feature ledger. Ships with a prominent append-only note. Unchanged from original design (stays monolithic).
- **New canonical template** `dark-factory/templates/project-memory-template.md` documenting the schema for index.md, all six shard files, and ledger.md, every field (name, type, required vs. optional), and one complete valid example entry per file type. This is the source of truth for onboard-agent and promote-agent.
- **Rule update** to `.claude/rules/dark-factory-context.md`: always read `dark-factory/memory/index.md` if it exists. Treat a missing index as "not yet onboarded" — warn and proceed. Do NOT load shard files from the context rule — each consumer agent's own instructions specify which shards to load.
- **Plugin mirror** of all new and changed files in `plugins/dark-factory/` (templates + rules) so contract tests pass. The plugin mirror file lives at `plugins/dark-factory/rules/dark-factory-context.md` (note: no `.claude/` prefix — this is the established layout for the plugin mirror).
- **Template cross-reference** in `dark-factory/templates/project-profile-template.md` — a short pointer note under Business Domain Entities that points to `dark-factory/memory/invariants-*.md` shards as the canonical registry. The existing "Invariants" bullet line stays as a human-readable summary.
- **Contract + structural tests** in `tests/dark-factory-setup.test.js` (schema + structure) and `tests/dark-factory-contracts.test.js` (plugin mirror parity) covering every new and changed file.
- **Gitignore check**: ensure `dark-factory/memory/` is NOT gitignored (committed project memory) and `dark-factory/results/` remains gitignored.

### Out of Scope (explicitly deferred)

- **Any agent behavior change.** No agent reads, writes, or parses memory yet. onboard-agent extraction is `project-memory-onboard`. spec-agent / architect-agent / code-agent declaration + probe is `project-memory-consumers`. promote-agent writing + test-agent advisor mode + impl-agent routing + df-cleanup health check is `project-memory-lifecycle`.
- **Real invariants / decisions.** The shards ship empty (frontmatter only). The first real entries are extracted by onboard (handled by `project-memory-onboard`).
- **ID assignment logic.** Permanent zero-padded IDs (`INV-0001`, `DEC-0001`, `FEAT-0001`) are assigned by promote-agent in the lifecycle sub-spec. This spec only documents the format.
- **Spec template sections** (`## Invariants` / `## Decisions`) in `dark-factory/templates/spec-template.md` — handled by `project-memory-consumers`.
- **Debug report template** updates — out of scope for v1 foundation.
- **Supersession cascade.** Past specs are frozen in git history; no cascade logic ships.
- **Domain-classification probe logic** — architect-agent changes are in `project-memory-consumers`. This spec only documents the `domain: security|architecture|api` field so the probe can later parse it.
- **Memory parsing helper module.** If a tiny helper is shipped as part of this spec it is scoped to structural tests only. Real consumer use (spec-agent, architect-agent reading memory) lives in later sub-specs.
- **`tags` field on the spec template.** Adding `tags` to `dark-factory/templates/spec-template.md` belongs to `project-memory-consumers`.

### Scaling Path

Once the foundation is in place, three parallel sub-specs can extend it without changing the artifact layout:

- `project-memory-onboard` adds extraction during `/df-onboard` with per-entry developer sign-off and retro-backfill of the ledger from `promoted-tests.json` + git log.
- `project-memory-consumers` wires spec/architect/code agents to read memory, adds `## Invariants` / `## Decisions` sections to the spec template, and adds the 3-domain architect invariant probe.
- `project-memory-lifecycle` makes promote-agent the single writer that assigns permanent IDs, adds test-agent `advisor` / `validator` modes, and adds df-cleanup memory health checks.

The shard-per-domain layout is already token-efficient at steady state. If a single domain shard ever exceeds the soft limit (~8,000 tokens), the shard can be split further (e.g., `invariants-security-2026.md`) — the index heading format already contains the shard filename as a routing key, so consumers need only update which shard they request.

## Requirements

### Functional

- FR-1: The directory `dark-factory/memory/` MUST exist and contain exactly eight files: `index.md`, `invariants-security.md`, `invariants-architecture.md`, `invariants-api.md`, `decisions-security.md`, `decisions-architecture.md`, `decisions-api.md`, `ledger.md`. — All downstream sub-specs assume this layout.
- FR-2: Each of the eight memory files MUST ship with a valid YAML frontmatter block containing `version: 1`, `lastUpdated`, `generatedBy`, and `gitHash` keys. `index.md` additionally MUST contain `entryCount` and `shardCount` fields in its frontmatter. — Frontmatter is how consumers verify schema version; missing keys would break forward-compat.
- FR-3: `index.md` MUST be a compact index file with one heading row per real memory entry. Each heading MUST match the format:
  ```
  ## {ID} [type:{type}] [domain:{domain}] [tags:{tag1,tag2,...}] [status:{status}] [shard:{filename}]
  ```
  The heading body (text below the heading marker) is a single-line summary of the entry. — Agents load only the index for context; grep-based probes use the inline brackets to filter by domain, type, or tag without loading shard files.
- FR-4: The `index.md` frontmatter MUST include `entryCount` (integer) equal to the number of heading rows in the index body, and `shardCount` (integer) equal to the number of distinct shard filenames referenced by entries. — Allows consumers to validate index integrity without parsing the full index body.
- FR-5: FEAT (ledger) entries in `index.md` MUST use `[domain:—]` and `[status:—]` (em-dash, not applicable) for those fields. TEMPLATE entries MUST be excluded from the index entirely. — Ledger entries have no domain classification; TEMPLATE entries are schema examples, not real memory.
- FR-6: Each of the six shard files (`invariants-security.md`, `invariants-architecture.md`, `invariants-api.md`, `decisions-security.md`, `decisions-architecture.md`, `decisions-api.md`) MUST ship with only a valid YAML frontmatter block and zero entries. No placeholder or TEMPLATE entries. — Shard files ship empty; the canonical template at `dark-factory/templates/project-memory-template.md` is the schema reference.
- FR-7: `ledger.md` MUST ship with a valid YAML frontmatter block and a prominent append-only note near the top (within the first 20 lines). It ships with zero ledger entries. — The ledger is append-only (BR-2); the note prevents edits.
- FR-8: Invariant entries stored in shard files MUST document the following fields: `id` (format `INV-NNNN`), `title`, `rule` (markdown), `scope.modules` (list), `scope.entities` (list), `source` (enum: `derived-from-code` | `declared-by-spec` | `declared-by-developer`), `sourceRef`, `status` (enum: `active` | `superseded` | `deprecated`), `supersededBy`, `introducedBy` (spec name or `"baseline"`), `introducedAt` (ISO date), `rationale`, `domain` (enum: `security` | `architecture` | `api`), `tags` (optional, max 5 lowercase keywords, list), `shard` (required, computed by writers — the shard filename), `enforced_by` (test path) OR `enforcement` (enum: `runtime` | `manual`), `guards` (list of `file:line`), `referencedBy` (list of spec names). — The full field list locks the schema so downstream agents emit consistent entries.
- FR-9: Decision entries stored in shard files MUST document the following fields: `id` (format `DEC-NNNN`), `title`, `context` (markdown), `decision` (markdown), `rationale`, `alternatives` (list of `{option, reason_rejected}`), `status` (enum: `active` | `superseded`), `supersededBy`, `introducedBy`, `introducedAt`, `domain`, `tags` (optional, max 5 lowercase keywords, list), `shard` (required, computed by writers), `referencedBy`. — See FR-8.
- FR-10: Ledger entries stored in `ledger.md` MUST document the following fields: `id` (format `FEAT-NNNN`), `name` (spec name), `summary`, `promotedAt`, `introducedInvariants` (list of INV-IDs), `introducedDecisions` (list of DEC-IDs), `promotedTests` (list of test paths), `gitSha` (cleanup commit SHA). — See FR-8.
- FR-11: A new file `dark-factory/templates/project-memory-template.md` MUST exist and MUST document the full schema for `index.md`, the six shard file types (invariants and decisions per domain), and `ledger.md`, listing every field with its type, whether it is required, and including one complete valid example entry per file type. — Onboard-agent and promote-agent will reference this template when writing real entries.
- FR-12: The template MUST document that every invariant entry MUST carry either an `enforced_by` path OR an explicit `enforcement: runtime|manual` escape hatch, with a note that one of the two is required. — Locked by decision D4; this spec documents the rule even though enforcement is deferred to `project-memory-consumers`.
- FR-13: The template MUST document that IDs use zero-padded 4-digit sequential numbering (`INV-0001`, `DEC-0001`, `FEAT-0001`), are never reused, and are assigned only by promote-agent at promotion time (until then, specs carry `INV-TBD-*` / `DEC-TBD-*` placeholders). — Locked by decision D2; documented here to prevent accidental assignment by other agents.
- FR-14: `.claude/rules/dark-factory-context.md` MUST be updated so agents always read `dark-factory/memory/index.md` if it exists, and treat a missing index as "not yet onboarded" — warn and proceed (non-blocking). The rule MUST NOT direct agents to load shard files; each consumer agent's own instructions specify which shards to load. — Without this rule update, no downstream agent will load the memory index.
- FR-15: The rule prose MUST state that a missing index file is treated as "not yet onboarded" — agents warn and proceed (non-blocking), matching the existing pattern for missing `project-profile.md`. — Greenfield and pre-onboard projects must not break.
- FR-16: Every source file added or modified under `.claude/` or `dark-factory/templates/` MUST have an exact mirror in `plugins/dark-factory/`. — Plugin mirror contract tests enforce exact content parity; this spec's changes must not break that suite.
- FR-17: `dark-factory/templates/project-profile-template.md` MUST gain a short pointer note under its Business Domain Entities section that points to `dark-factory/memory/invariants-*.md` shards as the canonical invariant registry. The existing `Invariants` bullet line MUST NOT be removed — it stays as a human-readable summary. — Preserves existing profile semantics while pointing readers to the new canonical source.
- FR-18: `dark-factory/memory/` MUST NOT be listed in `.gitignore`. All eight files under `dark-factory/memory/*.md` MUST be tracked by git. — Memory is committed project state, not ephemeral output.
- FR-19: `tests/dark-factory-setup.test.js` MUST contain assertions verifying: (a) the memory directory and its eight files exist, (b) each memory file has valid YAML frontmatter with the required keys, (c) `index.md` frontmatter contains `entryCount` and `shardCount` fields, (d) each shard file contains zero entries (no headings beyond frontmatter), (e) `ledger.md` contains a prominent append-only note, (f) `index.md` heading rows match the `## {ID} [type:...] [domain:...] [tags:...] [status:...] [shard:...]` format, (g) the template file exists and documents every field listed in FR-8 / FR-9 / FR-10, (h) the rule file references `dark-factory/memory/index.md` as the always-load source, (i) memory is not gitignored, (j) a token-budget note is documented somewhere in agents or rules referencing the index soft-limit (~4,000 tokens) and per-shard soft-limit (~8,000 tokens). — Locks the foundation contract so later sub-specs cannot accidentally break it.
- FR-20: `tests/dark-factory-contracts.test.js` MUST contain plugin-mirror parity assertions for: `plugins/dark-factory/templates/project-memory-template.md`, `plugins/dark-factory/rules/dark-factory-context.md`, and `plugins/dark-factory/templates/project-profile-template.md`. — Ensures the distributed plugin ships the memory foundation to target projects.

### Non-Functional

- NFR-1: The template file MUST be human-readable — a developer opening it without prior context MUST be able to understand the schema from the file alone. — Developers will copy from this template when declaring invariants in specs; clarity is load-bearing.
- NFR-2: All memory files MUST be valid markdown that renders cleanly in GitHub and common markdown viewers (headings, code blocks, tables as applicable). — Memory is committed and reviewed like code; rendering matters.
- NFR-3: The YAML frontmatter format MUST be parseable by the same `parseFrontmatter()` helper used in existing tests (between `---` delimiters, simple `key: value` lines). — Reuse existing parsing rather than introducing a new dependency; zero external packages stays the project convention.
- NFR-4: The index heading format MUST be predictable enough that a grep-based probe can find entries without LLM ambiguity. A regex of the form `grep "domain:security"` run against `index.md` MUST return only entries for that domain. — Later the architect invariant probe will parse these headings deterministically.
- NFR-5 (token budget, soft limit): The `index.md` file SHOULD NOT exceed approximately 4,000 tokens at steady state (roughly 500 entries at ~8 tokens/row). Each domain shard SHOULD NOT exceed approximately 8,000 tokens at steady state. These are soft limits — they are monitoring targets, not hard enforced caps. Exceeding them is a signal to split a shard. The limits MUST be documented in a comment in the rule file or a note in the template. — Token budget controls the cost of always-loading the index; per-shard budget controls the cost of loading a targeted domain shard.

## Data Model

No runtime data model changes. This spec introduces eight new markdown files as artifacts:

### `dark-factory/memory/index.md` (always-loaded compact index)

- Top-level YAML frontmatter:
  ```yaml
  ---
  version: 1
  lastUpdated: <ISO date>
  generatedBy: onboard-agent | promote-agent | df-cleanup
  gitHash: <git SHA at last write>
  entryCount: <N>
  shardCount: <N>
  ---
  ```
- Body: zero or more index rows, one per real memory entry, using the format:
  ```
  ## {ID} [type:{invariant|decision|feature}] [domain:{security|architecture|api|—}] [tags:{csv}] [status:{active|superseded|deprecated|—}] [shard:{filename}]
  {one-line summary of the entry}
  ```
- Example rows (for illustration; not shipped):
  ```
  ## INV-0001 [type:invariant] [domain:architecture] [tags:spec,compliance] [status:active] [shard:invariants-architecture.md]
  Every spec must declare the invariants it touches

  ## DEC-0001 [type:decision] [domain:architecture] [tags:schema,format] [status:active] [shard:decisions-architecture.md]
  Memory files use YAML frontmatter + markdown headings

  ## FEAT-0001 [type:feature] [domain:—] [status:—] [shard:ledger.md]
  project-memory-foundation
  ```
- Ships empty: zero entry rows. `entryCount: 0`, `shardCount: 0` in frontmatter.
- TEMPLATE entries are NEVER written to the index.

### `dark-factory/memory/invariants-{domain}.md` (domain-sharded invariants, three files)

- Same top-level YAML frontmatter structure (without `entryCount`/`shardCount`).
- Body: zero or more invariant entries of the form:
  ```
  ## INV-NNNN: <title>

  - **id**: INV-NNNN
  - **title**: <title>
  - **rule**: <markdown>
  - **scope.modules**: [<list>]
  - **scope.entities**: [<list>]
  - **source**: derived-from-code | declared-by-spec | declared-by-developer
  - **sourceRef**: <path or spec name>
  - **status**: active | superseded | deprecated
  - **supersededBy**: <ID or "">
  - **introducedBy**: <spec name or "baseline">
  - **introducedAt**: <ISO date>
  - **rationale**: <markdown>
  - **domain**: security | architecture | api
  - **tags**: [<up to 5 lowercase keywords>]
  - **shard**: invariants-{domain}.md
  - **enforced_by**: <test path>      # OR
  - **enforcement**: runtime | manual
  - **guards**: [<file:line>, ...]
  - **referencedBy**: [<spec names>]
  ```
- Each shard ships with ONLY a valid YAML frontmatter block. Zero entries. No placeholder headings.

### `dark-factory/memory/decisions-{domain}.md` (domain-sharded decisions, three files)

- Same top-level YAML frontmatter structure.
- Body: zero or more decision entries of the form:
  ```
  ## DEC-NNNN: <title>

  - **id**: DEC-NNNN
  - **title**: <title>
  - **context**: <markdown>
  - **decision**: <markdown>
  - **rationale**: <markdown>
  - **alternatives**: [{option, reason_rejected}, ...]
  - **status**: active | superseded
  - **supersededBy**: <ID or "">
  - **introducedBy**: <spec name>
  - **introducedAt**: <ISO date>
  - **domain**: security | architecture | api
  - **tags**: [<up to 5 lowercase keywords>]
  - **shard**: decisions-{domain}.md
  - **referencedBy**: [<spec names>]
  ```
- Each shard ships with ONLY a valid YAML frontmatter block. Zero entries. No placeholder headings.

### `dark-factory/memory/ledger.md` (append-only; frontmatter updates still go through promote-agent)

- Same top-level YAML frontmatter structure.
- Prominent append-only note near the top (within first 20 lines).
- Body: zero or more ledger entries of the form:
  ```
  ## FEAT-NNNN: <name>

  - **id**: FEAT-NNNN
  - **name**: <spec name>
  - **summary**: <markdown>
  - **promotedAt**: <ISO datetime>
  - **introducedInvariants**: [INV-NNNN, ...]
  - **introducedDecisions**: [DEC-NNNN, ...]
  - **promotedTests**: [<test path>, ...]
  - **gitSha**: <cleanup commit SHA>
  ```
- Ships with ONLY frontmatter and the append-only note. Zero ledger entries.

### `dark-factory/templates/project-memory-template.md` (canonical schema reference)

- Single file documenting the index format, all shard formats (invariants and decisions), and the ledger format with one complete, valid example entry per file type. This is what onboard-agent and promote-agent read when they emit real entries in later sub-specs.

## Migration & Deployment

**Applies.** The rule file change (`.claude/rules/dark-factory-context.md`) and template addition affect how future agents load context. Existing projects without `dark-factory/memory/` must not break.

- **Breaking layout change (from original spec)**: The previously documented `invariants.md` and `decisions.md` monolithic files are REPLACED by `index.md` + six domain-sharded files. If any implementation partially shipped the old two-file layout, those files must be removed and the new layout applied. The rule update is written so that missing memory files emit a warning and proceed (FR-15).
- **Existing data**: None — there is no pre-existing memory directory anywhere. Existing Dark Factory installations simply won't have the directory until `/df-onboard` is re-run (in a later sub-spec).
- **Rollback plan**: Revert the commit. All new files are additive; the only edits are to two template files and the context rule, all of which are backward-compatible (new rows / new pointer note / new load target that is tolerated as missing).
- **Zero-downtime**: Yes. There is no running service. Agents that have not yet been updated (in later sub-specs) will simply ignore memory; agents that are updated will tolerate its absence.
- **Deployment order**: Single wave. This spec ships alone, then Wave 2 (`project-memory-onboard` + `project-memory-consumers`) can run in parallel, then Wave 3 (`project-memory-lifecycle`).
- **Stale data/cache**: None — no caches touched.

## API Endpoints

N/A — this spec introduces no runtime APIs. All changes are artifacts + templates + rules + tests.

## Business Rules

- BR-1: **Memory files are single-writer.** Only promote-agent (once `project-memory-lifecycle` ships) writes to memory. During the foundation phase the files ship as empty skeletons committed by this spec's implementation; after that, only promote-agent edits them. — Locked by decision D2 (avoids worktree merge conflicts).
- BR-2: **Ledger is append-only.** Ledger entries once written are never edited. Frontmatter bookkeeping (lastUpdated, gitHash) still changes. — Locked by shared-context decision set; ensures ledger is a faithful history.
- BR-3: **IDs are never reused.** Even superseded or deprecated entries keep their ID forever. — Allows historical references in git to remain meaningful.
- BR-4: **Every invariant has a proof of enforcement.** Either an `enforced_by` test path or an explicit `enforcement: runtime|manual` field. — Locked by decision D4; prevents "invariants" that are just aspirations.
- BR-5: **Missing memory index is tolerated, not fatal.** Agents warn and proceed when `dark-factory/memory/index.md` is absent, matching the existing pattern for missing `project-profile.md`. — Greenfield and pre-onboard projects must not break.
- BR-6: **Shard files ship empty.** No TEMPLATE or placeholder entries in shard files. The canonical template at `dark-factory/templates/project-memory-template.md` is the schema reference. A shard file with only frontmatter is valid state.
- BR-7: **Plugin mirrors match source exactly.** Every source file added or edited under `.claude/` or `dark-factory/templates/` MUST have an exact mirror in `plugins/dark-factory/`. — Existing project convention; enforced by contract tests.
- BR-8: **TEMPLATE entries are excluded from the index.** The index contains only real entries (`INV-\d{4}`, `DEC-\d{4}`, `FEAT-\d{4}`). TBD-placeholder entries (`INV-TBD-*`) carried in specs during the spec phase are also excluded from the shipped index. — The index is a production record, not a working document.
- BR-9: **Agents load only the index from the context rule; shard loading is consumer-driven.** The context rule directs agents to load only `dark-factory/memory/index.md`. Each downstream agent's own system prompt (added in `project-memory-consumers`) specifies which domain shards to load. — Prevents unnecessary token spend by always-loading all 6 shards.

## Error Handling

| Scenario | Response | Side Effects |
|----------|----------|--------------|
| Memory directory missing (e.g., legacy project) | Agents load context normally, emit a `memory: not-yet-onboarded` warning, proceed | None |
| `index.md` missing | Agents warn and treat memory as not-yet-onboarded, proceed | Warning logged |
| Shard file missing (one of six) | Agents that request it warn and treat the missing shard as empty (zero entries), proceed | Warning logged |
| Malformed YAML frontmatter in a memory file | A defensive parser (if shipped) returns an empty entry set and emits a warning; does NOT throw. The rest of the file is skipped. Downstream agents proceed as if the file is empty for this load cycle | Warning logged; full file re-validation deferred to `project-memory-lifecycle` |
| `index.md` entry row does not match the heading format regex | Flagged by the structural test in `tests/dark-factory-setup.test.js`; downstream agents skip the malformed row and warn | Test fails at build time if the shipped index has malformed rows |
| `entryCount` in `index.md` frontmatter does not match actual row count | Flagged by the structural test; downstream consumers emit a warning and use the actual row count | Test fails at build time |
| Missing required field on a shard entry | Flagged by the schema-check test in `tests/dark-factory-setup.test.js` when validating the shipped skeletons; downstream runtime flagging is in `project-memory-consumers` | Test fails at build time if any shard entry is malformed |
| Plugin mirror out of sync | Contract test in `tests/dark-factory-contracts.test.js` fails | Build breaks until mirror matches |
| `dark-factory/memory/` accidentally gitignored | Test in `tests/dark-factory-setup.test.js` fails | Build breaks until `.gitignore` is corrected |

## Acceptance Criteria

- [ ] AC-1: `dark-factory/memory/` exists and contains exactly eight files: `index.md`, `invariants-security.md`, `invariants-architecture.md`, `invariants-api.md`, `decisions-security.md`, `decisions-architecture.md`, `decisions-api.md`, `ledger.md`.
- [ ] AC-2: Each of the eight files has valid YAML frontmatter with `version`, `lastUpdated`, `generatedBy`, `gitHash`. `index.md` additionally has `entryCount` and `shardCount`.
- [ ] AC-3: All six shard files contain zero entries (only frontmatter, no headings beyond frontmatter).
- [ ] AC-4: `ledger.md` contains a prominent append-only note near the top and zero ledger entries.
- [ ] AC-5: `index.md` ships with zero entry rows (`entryCount: 0`, `shardCount: 0`). Any future entry rows must match the format `## {ID} [type:...] [domain:...] [tags:...] [status:...] [shard:...]`.
- [ ] AC-6: `dark-factory/templates/project-memory-template.md` exists and documents the index format, all shard entry fields (FR-8 / FR-9), ledger entry fields (FR-10), with one complete valid example per file type.
- [ ] AC-7: `.claude/rules/dark-factory-context.md` directs agents to read `dark-factory/memory/index.md` (not individual shard files) and states that a missing index is non-blocking (warn and proceed).
- [ ] AC-8: `plugins/dark-factory/templates/project-memory-template.md`, `plugins/dark-factory/rules/dark-factory-context.md`, and `plugins/dark-factory/templates/project-profile-template.md` match their sources exactly.
- [ ] AC-9: `dark-factory/templates/project-profile-template.md` Business Domain Entities section has a pointer note to `dark-factory/memory/invariants-*.md` and retains its existing `Invariants` bullet.
- [ ] AC-10: `.gitignore` does NOT list `dark-factory/memory/` or any file inside it. `dark-factory/results/` remains gitignored.
- [ ] AC-11: `node --test tests/` passes. New tests in `tests/dark-factory-setup.test.js` and `tests/dark-factory-contracts.test.js` assert the items from FR-19 and FR-20.
- [ ] AC-12: No agent file (`.claude/agents/*.md` or plugin mirrors) is modified by this spec.
- [ ] AC-13: No skill file (`.claude/skills/*/SKILL.md` or plugin mirrors) is modified by this spec.
- [ ] AC-14: `dark-factory/templates/spec-template.md` and `dark-factory/templates/debug-report-template.md` are NOT modified by this spec.
- [ ] AC-15: `dark-factory/manifest.json` and `dark-factory/promoted-tests.json` are NOT modified by this spec.

## Edge Cases

- EC-1: **Fresh clone of an existing project that has never been onboarded** — The user clones a repo that uses older Dark Factory. `dark-factory/memory/` does not exist. Agents reading the updated rule file must warn and proceed. The next `/df-onboard` (in `project-memory-onboard`) will create the directory. **Expected behavior**: no crash, warning surfaced, pipelines continue.
- EC-2: **Malformed YAML frontmatter in a memory file** — Someone hand-edits `invariants-security.md` and breaks the frontmatter. A defensive parse returns an empty entry set and emits a warning; downstream agents do not throw. **Expected behavior**: warning in logs, file treated as empty for that load cycle, tests in `project-memory-consumers` catch it at runtime.
- EC-3: **Shard file with only frontmatter (zero entries)** — This is valid state; it means no entries for that domain yet. Downstream parsers must return 0 real entries and not error. **Expected behavior**: valid state; 0 real entries.
- EC-4: **Plugin mirror drift** — A developer edits `.claude/rules/dark-factory-context.md` but forgets `plugins/dark-factory/rules/dark-factory-context.md`. **Expected behavior**: contract test fails, CI/local test run blocks until the mirror is synced.
- EC-5: **`.gitignore` accidentally matches `dark-factory/memory/`** — e.g., someone adds `dark-factory/*` and forgets to exempt memory. **Expected behavior**: setup test fails, forcing the `.gitignore` fix.
- EC-6: **Missing required field in a shard entry** — e.g., an invariant entry is missing `enforced_by` AND `enforcement`. **Expected behavior**: schema-check test in setup fails, blocking the landing.
- EC-7: **`index.md` `entryCount` does not match actual heading rows** — Someone manually edits the index and forgets to update the frontmatter counter. **Expected behavior**: setup test fails with a clear diagnostic comparing declared vs actual count.
- EC-8: **Template file omits a documented field** — e.g., `project-memory-template.md` forgets to document `shard` for invariants. **Expected behavior**: template-completeness test in setup fails.
- EC-9: **Rule file updated but mirror stale** — dark-factory-context.md source mentions `index.md`, mirror still mentions old `invariants.md`. **Expected behavior**: contract mirror test fails.
- EC-10: **Pre-existing `dark-factory/memory/` directory with random content** — defensive: onboard / foundation implementer must NOT overwrite existing memory. This spec's skeleton-write logic must check for an existing directory and refuse to clobber. (In the current repo, the directory does not yet exist, so this is a defensive contract on implementation.) **Expected behavior**: if the directory already exists with non-skeleton content, the foundation install step exits cleanly without overwrite, and the test run still passes structural checks.
- EC-11: **Unknown domain value in an index entry** — e.g., an entry has `[domain:performance]` which is not in the allowed set. **Expected behavior**: treated as a malformed entry; the setup test flags it. By convention, the fallback domain is `security` (most conservative).
- EC-12: **Index missing but shard files exist** — a partial install where some shards were written but the index was never generated. **Expected behavior**: agents warn with "memory index missing, treating as not-yet-onboarded" and proceed. The shard files are not consulted without the index.

## Dependencies

**None — this spec is independently implementable.**

- **Depends on**: no other sub-spec.
- **Depended on by**: `project-memory-onboard`, `project-memory-consumers`, `project-memory-lifecycle`. Each of those reads memory files, writes memory files, or depends on the rule / template being in place.
- **Group**: `project-memory`.
- **Wave**: 1 (alone). Wave 2 = `project-memory-onboard` + `project-memory-consumers` (parallel). Wave 3 = `project-memory-lifecycle`.

This spec introduces no runtime dependencies (no new npm packages, no new external services). All shared dependencies (`parseFrontmatter()` in tests, standard `fs`/`path` from node stdlib) already exist.

## Implementation Size Estimate

- **Scope size**: small-to-medium — approximately 12 files touched (8 new memory files + template + rule + profile template + 2 test files).
- **Suggested parallel tracks**: 1–2 code-agent tracks. If the orchestrator assigns two tracks, split as below with **zero file overlap**:
  - **Track A (memory artifacts + templates)**: creates all 8 files under `dark-factory/memory/`, creates `dark-factory/templates/project-memory-template.md`, creates `plugins/dark-factory/templates/project-memory-template.md`; edits `dark-factory/templates/project-profile-template.md` + its plugin mirror.
  - **Track B (rule + tests + gitignore)**: edits `.claude/rules/dark-factory-context.md` + plugin mirror at `plugins/dark-factory/rules/dark-factory-context.md`, adds assertions to `tests/dark-factory-setup.test.js` and `tests/dark-factory-contracts.test.js`, audits `.gitignore`.

Tracks are disjoint (no file is touched by both tracks). Track B's test assertions depend on Track A's files existing, so if the orchestrator runs these in parallel it must merge Track A first OR run the test suite only after both tracks land. A single-track implementation is perfectly acceptable — the split is an optimization.

## Invariants

**N/A — bootstrap.**

This spec DEFINES the memory mechanism; it does not yet declare project invariants. The first real invariants will be declared via `project-memory-onboard` extraction (developer-signed, retro-backfilled from the current project-profile architecture section). Once `project-memory-consumers` ships the spec template `## Invariants` section, every future spec will declare the invariants it touches.

## Decisions

The following architectural decisions are locked for this spec. They are worth preserving because they shape the entire memory foundation. `promote-agent` will assign permanent IDs (`DEC-NNNN`) at promotion time. Until then these carry `DEC-TBD-*` placeholders.

- **DEC-TBD-a: Memory file format is YAML frontmatter + structured markdown entries (per-entry headings).**
  - **Context**: Agents need a machine-parseable format for grep-based probes AND a human-readable format for developer review.
  - **Decision**: Each shard file is a single markdown document with top-level YAML frontmatter and one `## <ID>: <title>` heading per entry, with structured bullet fields inside each entry. The index is a companion file of heading-only rows for always-loaded compact context.
  - **Alternatives considered**: (1) pure JSON (rejected — not human-readable, diffs are noisy); (2) pure YAML file (rejected — review tooling is weaker than markdown); (3) one file per entry (rejected — directory explosion, harder to scan).
  - **Domain**: architecture.

- **DEC-TBD-b: Directory layout is `dark-factory/memory/` with `index.md` + 6 domain-sharded files + `ledger.md`.**
  - **Context**: Need a stable layout that all downstream agents can hardcode. Earlier design used two monolithic files (`invariants.md`, `decisions.md`) — replaced by shard-per-domain for token efficiency.
  - **Decision**: Eight-file layout under `dark-factory/memory/`. Index provides always-loaded summary; shards hold full entry detail loaded on demand per domain; ledger is append-only history.
  - **Alternatives considered**: (1) two monolithic files (rejected — grows unbounded, always-loading full content wastes tokens); (2) single file mashing all types (rejected — different write cadences); (3) one file per entry (rejected — directory explosion).
  - **Domain**: architecture.

- **DEC-TBD-c: Single-writer protocol — only promote-agent writes memory (once the lifecycle sub-spec ships).**
  - **Context**: Multiple agents writing to the same files across parallel worktrees would create merge conflicts.
  - **Decision**: promote-agent is the sole writer at promotion time. Specs carry `INV-TBD-*` / `DEC-TBD-*` placeholders; promote-agent assigns permanent zero-padded sequential IDs (`INV-0001`, never reused).
  - **Alternatives considered**: (1) any agent may write (rejected — worktree conflicts); (2) onboard-agent writes initial entries but promote-agent takes over (partially accepted — onboard-agent does write the initial extraction in `project-memory-onboard`, but after that promotion is the only writer).
  - **Domain**: architecture.

- **DEC-TBD-d: Every invariant must carry `enforced_by` (test path) OR an explicit `enforcement: runtime|manual` escape hatch.**
  - **Context**: "Invariants" with no proof of enforcement decay into aspirations; the framework should refuse to accept undefended rules.
  - **Decision**: Schema requires one of the two fields. `manual` is a legitimate escape hatch for rules that cannot be automatically verified (e.g., code style conventions).
  - **Alternatives considered**: (1) always require a test (rejected — some rules genuinely can't be tested automatically); (2) optional field (rejected — every invariant decays over time without enforcement).
  - **Domain**: architecture.

- **DEC-TBD-e: Domain classification uses `domain: security | architecture | api` to enable the 3-parallel architect probe.**
  - **Context**: The architect-agent is already spawned in a 3-parallel domain pattern (Security & Data Integrity, Architecture & Performance, API Design & Backward Compatibility). Memory entries need a routing key.
  - **Decision**: Every invariant and decision entry carries a `domain` field with one of three values. The `project-memory-consumers` sub-spec will use this to route per-domain during architect probes.
  - **Alternatives considered**: (1) no domain, scan everything every time (rejected — wastes architect context); (2) free-form tags (rejected — fragments the taxonomy; tags are now an ADDITIONAL secondary lookup mechanism, not the primary routing key).
  - **Domain**: architecture.

- **DEC-TBD-f: Missing memory index is non-blocking — warn and proceed.**
  - **Context**: Existing projects without memory must not break. Greenfield projects must be able to onboard later.
  - **Decision**: All agents treat missing `index.md` as "not yet onboarded" and proceed with a warning, matching the existing pattern for missing `project-profile.md`.
  - **Alternatives considered**: (1) block the pipeline until `/df-onboard` runs (rejected — forces an onboarding step on every existing project before they can use any other command); (2) silently ignore (rejected — developers need to know memory is missing).
  - **Domain**: architecture.

- **DEC-TBD-g: Index is always-loaded; domain shards are consumer-driven, not context-rule-driven.**
  - **Context**: Loading all 6 shard files in the shared context rule would burn 6 × 8,000 tokens on every agent invocation, even when most domains are irrelevant.
  - **Decision**: The context rule loads only `index.md` (≤ 4,000 tokens). Each consumer agent (spec-agent, architect-agent, etc.) loads only the shard(s) relevant to its current task, guided by domain tags in the index.
  - **Alternatives considered**: (1) load all shards in context rule (rejected — too expensive at scale); (2) load no memory at context rule level (rejected — agents would have no way to discover what memory exists without reading all shard files).
  - **Domain**: architecture.

- **DEC-TBD-h: Shard files ship empty; TEMPLATE entries are eliminated.**
  - **Context**: TEMPLATE placeholder entries in shard files create confusion — they count as headings and can be accidentally picked up by grep probes as real entries. The canonical template at `project-memory-template.md` is the schema reference.
  - **Decision**: All six shard files ship with only YAML frontmatter. No TEMPLATE headings. Downstream parsers never need to filter TEMPLATE entries from shard files.
  - **Alternatives considered**: (1) keep TEMPLATE entries (rejected — ambiguity between schema example and real entry; test complexity for filtering); (2) one TEMPLATE per file (rejected — same problem at smaller scale).
  - **Domain**: architecture.

- **DEC-TBD-i: `tags` field is an optional secondary lookup; `domain` remains the primary routing key.**
  - **Context**: Some entries span multiple concerns (e.g., an invariant that is both auth-related and schema-related). Free-form tags provide a secondary search dimension without fragmenting the domain taxonomy.
  - **Decision**: `tags` is an optional field (max 5 lowercase keywords) on invariant and decision entries. Tags appear inline in index rows for grep-based lookup. Tags do NOT replace `domain` for shard routing.
  - **Alternatives considered**: (1) no tags, domain only (rejected — some cross-cutting concerns don't fit neatly into one domain); (2) tags replace domain (rejected — domain is needed for shard routing, which requires a small closed enum).
  - **Domain**: architecture.

## Implementation Notes

Patterns to follow from the existing codebase:

- **Template file format**: follow `dark-factory/templates/project-profile-template.md` exactly. Top of file: a `> Auto-generated by ...` note. Then section headings with placeholders in `{curly braces}` where values go. Keep language concise and developer-facing.
- **Rule file pattern**: `.claude/rules/dark-factory-context.md` is a short (10-line) bullet list. Replace the memory bullet with: "Read `dark-factory/memory/index.md` if it exists. Treat missing as 'not yet onboarded' — warn and proceed. Do NOT load shard files from this rule; each agent's own system prompt specifies which shards to load." Keep the existing three bullets (project-profile, code-map, manifest) intact.
- **Plugin mirror**: every edit to `.claude/rules/dark-factory-context.md` must be applied identically to `plugins/dark-factory/rules/dark-factory-context.md` (note: no `.claude/` prefix in the plugin path). Likewise every template edit must be mirrored in `plugins/dark-factory/templates/`. Use the same exact bytes — contract tests do literal content comparison.
- **Test-file conventions**: tests use `node:test` + `node:assert/strict`, no external deps. Follow the structure of existing `describe`/`it` blocks in `tests/dark-factory-setup.test.js`. Reuse the existing `parseFrontmatter()` helper (do NOT reintroduce a copy).
- **Index heading regex**: every index entry heading must match: `^## (INV|DEC|FEAT)-\d{4} \[type:[a-z]+\] \[domain:[a-z-—]+\] \[tags:[^\]]*\] \[status:[a-z-—]+\] \[shard:[a-z0-9._-]+\]$`. Tests in setup assert this shape for any future entries. For the shipped empty index, the test asserts zero heading rows exist.
- **Token budget documentation**: add a comment in `.claude/rules/dark-factory-context.md` (or a note in `project-memory-template.md`) documenting: "Index soft limit: ≤ 4,000 tokens (~500 entries). Per-shard soft limit: ≤ 8,000 tokens. Exceeding either is a signal to split a shard."
- **No agent edits**: do not touch any file under `.claude/agents/` or `plugins/dark-factory/agents/`. Those are the territory of the other three sub-specs.
- **No skill edits**: do not touch any file under `.claude/skills/` or `plugins/dark-factory/skills/`.
- **No spec/debug template edits**: `spec-template.md` and `debug-report-template.md` are untouched by this spec.

## Traceability

| Spec Item | Scenario(s) |
|-----------|-------------|
| FR-1 (8 files under `dark-factory/memory/`) | P-01, P-02 |
| FR-2 (valid frontmatter, required keys; index has entryCount + shardCount) | P-03, P-NEW-04, H-01 |
| FR-3 (index heading format per-row) | P-NEW-01, H-NEW-01 |
| FR-4 (index entryCount and shardCount in frontmatter) | P-NEW-04, H-NEW-03 |
| FR-5 (FEAT entries use —; TEMPLATE excluded from index) | H-NEW-02 |
| FR-6 (shard files ship empty — frontmatter only, zero entries) | P-NEW-02, P-NEW-03, H-NEW-04 |
| FR-7 (ledger ships with frontmatter + append-only note, zero entries) | H-11 |
| FR-8 (invariants fields documented, including tags and shard) | P-07, H-04 |
| FR-9 (decisions fields documented, including tags and shard) | P-07, H-04 |
| FR-10 (ledger fields documented) | P-07, H-04 |
| FR-11 (enforced_by OR enforcement escape hatch) | H-05 |
| FR-12 (ID format + assignment locus documented) | H-06 |
| FR-13 (template file exists + documents schema) | P-07 |
| FR-14 (rule file: index-first loading, no shard loading from rule) | P-08, P-NEW-05 |
| FR-15 (missing index is warn-and-proceed) | H-07, H-NEW-06 |
| FR-16 (plugin mirror parity for all changed files) | P-09, H-08 |
| FR-17 (project-profile pointer note, existing Invariants bullet preserved) | P-10, H-09 |
| FR-18 (memory NOT gitignored; results still gitignored) | P-11, H-10 |
| FR-19 (setup tests assert structure) | P-12 |
| FR-20 (contract tests assert mirror parity) | P-09, H-08 |
| BR-1 (single-writer) | documented in template — H-06 |
| BR-2 (ledger append-only) | H-11 |
| BR-3 (IDs never reused) | documented in template — H-06 |
| BR-4 (enforcement required) | H-05 |
| BR-5 (missing index tolerated) | H-07, H-NEW-06 |
| BR-6 (shard files ship empty) | P-NEW-02, P-NEW-03, H-NEW-04 |
| BR-7 (plugin mirrors match) | P-09, H-08 |
| BR-8 (TEMPLATE entries excluded from index) | H-NEW-02 |
| BR-9 (agents load only index from context rule) | P-08, P-NEW-05 |
| EC-1 (fresh clone without memory) | H-07, H-NEW-06 |
| EC-2 (malformed YAML frontmatter) | H-12 |
| EC-3 (shard with only frontmatter = valid-but-empty) | H-NEW-04 |
| EC-4 (plugin mirror drift) | H-08 |
| EC-5 (.gitignore accidentally matches memory) | H-10 |
| EC-6 (missing required field in shard entry) | H-14 |
| EC-7 (entryCount mismatch) | H-NEW-03 |
| EC-8 (template file omits a field) | H-04 |
| EC-9 (rule file updated but mirror stale) | H-08 |
| EC-10 (existing non-skeleton memory directory not clobbered) | H-15 |
| EC-11 (unknown domain value) | H-NEW-05 |
| EC-12 (index missing but shards exist) | H-NEW-06 |
| AC-12 / AC-13 / AC-14 / AC-15 (no out-of-scope files touched) | H-16 |
