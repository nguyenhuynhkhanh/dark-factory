# Feature: project-memory-onboard

## Context

Dark Factory's cleanup pipeline currently deletes spec artifacts after promotion, and agents do not read git history. As a result, the framework has no persistent memory of:
1. **Invariants** that past features established (e.g., "every employee must have a phone", "every schema field marked required must remain required")
2. **Decisions** that shaped the architecture (e.g., "we chose Mongoose over Prisma because …")
3. **A ledger** of what shipped, when, and with what test coverage

Without this memory, new features can silently violate prior invariants, contradict past decisions, or duplicate concepts that have already been rejected.

The larger **Project Memory + Testability Reinforcement** feature introduces a `dark-factory/memory/` directory. This sub-spec delivers the **bootstrap**: how the onboard-agent populates that directory on first `/df-onboard` and how it intelligently refreshes it on subsequent runs.

### Storage layout

The memory directory uses a **shard-aware layout** for token-efficient loading:

- `dark-factory/memory/index.md` — always-loaded compact index (one row per entry across all shards)
- `dark-factory/memory/invariants-security.md` — security-domain invariants
- `dark-factory/memory/invariants-architecture.md` — architecture-domain invariants
- `dark-factory/memory/invariants-api.md` — api-domain invariants
- `dark-factory/memory/decisions-security.md` — security-domain decisions
- `dark-factory/memory/decisions-architecture.md` — architecture-domain decisions
- `dark-factory/memory/decisions-api.md` — api-domain decisions
- `dark-factory/memory/ledger.md` — monolithic FEAT ledger, all domains

The monolithic `invariants.md` and `decisions.md` files from earlier drafts do NOT exist. All invariants and decisions live in their domain shards. Shard files ship with only YAML frontmatter — no TEMPLATE placeholder entries.

### Index format

The index file uses one heading row per entry:

```
## {ID} [type:{type}] [domain:{domain}] [tags:{comma-joined-or-empty}] [status:active] [shard:{filename}]
{one-line description}
```

Index frontmatter includes: `version`, `lastUpdated`, `generatedBy`, `entryCount`, `shardCount`, `gitHash`.

### Tags field

- `tags: [string]` — optional, max 5 lowercase keywords (e.g., `["auth","schema"]`). Free-form vocabulary.
- During Phase 7 sign-off, onboard-agent proposes `tags` for each candidate based on its source file path and domain.
- Developer can accept proposed tags, edit tags, or clear them (empty = no tags).
- `shard: string` — required on every index row, computed by onboard-agent. Value is the shard filename (e.g., `invariants-security.md`). Consumers never compute this value themselves.

The foundation sub-spec delivers the files/schema; consumers and lifecycle are separate sub-specs. This spec does NOT touch promote-agent, spec-agent, code-agent, architect-agent, or any skill/template.

This feature is a tooling-only change to the Dark Factory framework itself. There is no end-user impact. The blast radius is limited to the onboard-agent workflow and the two test files that enforce its structure.

## Scope

### In Scope (this spec)
- Add a new **Phase 3.7: Memory Extraction** to the onboard-agent, inserted between Phase 3.5 (code map) and Phase 4 (quality bar). The phase has three sub-steps:
  - 3.7a Invariants extraction (medium depth, conservative, confidence-gated)
  - 3.7b Decisions seeding (from `project-profile.md` architecture section + code-visible architectural choices)
  - 3.7c Ledger retro-backfill (from `dark-factory/promoted-tests.json` + git log)
- Extend **Phase 7 developer sign-off** to present memory candidates in three batches (invariants, decisions, ledger) with per-entry accept / edit / reject semantics, including `tags` proposal and domain-rerouting on edit. Low-confidence candidates default to rejected.
- On bootstrap, onboard-agent writes the six domain shard files (`invariants-{security,architecture,api}.md`, `decisions-{security,architecture,api}.md`) and `ledger.md` with accepted entries and sequential IDs (`INV-0001`, `DEC-0001`, `FEAT-0001`) assigned globally across shards. After writing all shards, the agent generates `dark-factory/memory/index.md`. This is a narrowly-scoped exception to the "only promote-agent writes memory" rule (D2). The exception is documented in-agent.
- Incremental refresh on re-run: if `dark-factory/memory/` already exists, re-scan and propose a diff (new candidates, stale entries whose `sourceRef` no longer resolves) for per-entry developer sign-off. Never overwrite or delete silently. After sign-off, regenerate the entire index from scratch (scan all shards → write fresh index).
- Greenfield handling: write six empty domain shard files and one empty `index.md` with only YAML frontmatter and a `## Memory Index` heading (zero entry rows); write `ledger.md` with frontmatter and a "No features shipped yet" comment. Include a header comment in each file explaining entries will accumulate as features are specced.
- Mirror every change to `.claude/agents/onboard-agent.md` in `plugins/dark-factory/agents/onboard-agent.md` (plugin mirror contract).
- Add structural assertions to `tests/dark-factory-setup.test.js` verifying Phase 3.7 exists with the three sub-steps, shard routing is documented, index generation is documented, tags sign-off is documented, extraction rules are documented, confidence gating is specified, developer sign-off is explicit, and the bootstrap-write exception is documented.
- Add plugin mirror parity assertions to `tests/dark-factory-contracts.test.js` for the Phase 3.7 content.

### Out of Scope (explicitly deferred)
- **Creation of `dark-factory/memory/` directory, the template, the schema, and the soft-warn rule** — owned by **project-memory-foundation**.
- **spec-agent / architect-agent / code-agent reading and declaring memory entries** — owned by **project-memory-consumers**.
- **promote-agent writing memory at promotion, full-suite invariant gate, test-agent advisor mode, df-cleanup health check for memory entries** — owned by **project-memory-lifecycle**.
- LLM-based deep inference of business rules from function bodies (too noisy — see DEC-TBD-a).
- Automatic retirement/deletion of invariants or decisions. Retirement is always developer-confirmed (status flip).
- Importing memory from external sources (ADR repos, Confluence, etc.).
- UI/dashboard for browsing memory — the markdown files are the only interface.
- **Loading protocol** — which agents load which shards and in what order — belongs to the consumers spec. This spec only governs writing and bootstrapping.

### Scaling Path
- If candidate volume becomes overwhelming (e.g., 100+ invariants on a large codebase), introduce **bucketed sign-off by scope/domain** (e.g., approve all schema-derived invariants in bulk, review middleware-derived individually).
- If medium-depth extraction misses too much, a follow-up can add an **opt-in deep pass** with LLM inference, gated behind an explicit `--deep` flag on `/df-onboard`.
- If re-run diffs become noisy on active projects, introduce a **`--since <git-sha>`** mode that only scans files changed since a reference commit.
- If any single shard grows beyond token budget, introduce sub-domain sharding (e.g., `invariants-api-auth.md`, `invariants-api-schema.md`).

## Requirements

### Functional
- **FR-1**: A new section titled **"Phase 3.7: Memory Extraction"** must exist in `.claude/agents/onboard-agent.md`, positioned immediately after Phase 3.5 (Code Map Construction) and before Phase 4 (Quality Bar). — *Ordering invariant; consumers/lifecycle sub-specs and test-agent rely on Phase 3.7 running after the code map is present but before quality/structural assessment.*
- **FR-2**: Phase 3.7 must contain three explicitly labeled sub-sections in order: **3.7a Invariants Extraction**, **3.7b Decisions Seeding**, **3.7c Ledger Retro-Backfill**. — *Each sub-step populates different shard files; labeling makes tests and future edits trackable.*
- **FR-3**: Phase 3.7a must list the scan sources for invariant extraction: schema files (Mongoose, Sequelize, Prisma, Drizzle, SQLAlchemy, Pydantic, Zod), required-field markers (`required: true`, `@NotNull`, non-null DB columns), validation middleware, guard clauses in shared utilities, and `NEVER` / `MUST` / `ALWAYS` statements in agent/skill markdown (for Dark-Factory-on-itself onboarding). — *Conservative allowlist matches the locked D6 scope.*
- **FR-4**: Phase 3.7a must specify the candidate record shape: `id` (`INV-CANDIDATE-N`), `title`, `rule`, `scope.modules`, `source: derived-from-code`, `sourceRef` (file:line), `domain` (`security | architecture | api`), `rationale`, `confidence` (`high | medium | low`). — *Matches the locked frontmatter schema (D1 + D3) so that foundation-owned validator accepts onboard output.*
- **FR-5**: Phase 3.7a must specify the **confidence gating rule**: `high` = clear schema constraint; `medium` = validation middleware / guard clause; `low` = pattern inference. Low-confidence candidates must be marked `[LOW CONFIDENCE]` and default to **rejected**; the developer must explicitly opt them in. — *Addresses Lead C's false-positive concern and prevents memory pollution.*
- **FR-6**: Phase 3.7a must include an explicit "conservative bias" rule with at least one positive and one negative example (e.g., "schema requires X → invariant; this endpoint returns 400 if X is missing → NOT an invariant (endpoint-local)"). — *Operational guardrail; without an example, agents will over-extract.*
- **FR-7**: Phase 3.7b must state that decisions cannot be inferred from code bodies and must be sourced from `dark-factory/project-profile.md` (Architecture section + Tech Stack rows representing architectural choices). — *Matches D6: medium depth, no LLM inference of business rules from code.*
- **FR-8**: Phase 3.7b must specify the decision candidate shape: `id` (`DEC-CANDIDATE-N`), `title`, `context`, `decision`, `alternatives: []` (empty unless profile mentioned alternatives), `rationale`, `domain`, `source: derived-from-profile`, `sourceRef: dark-factory/project-profile.md#<section>`, `confidence`. — *Compatibility with foundation schema.*
- **FR-9**: Phase 3.7b must state: if `project-profile.md` does not exist (greenfield), seed an empty decisions list with a header note directing the developer that decisions will accumulate as features are specced. — *Required for greenfield handling.*
- **FR-10**: Phase 3.7c must specify how to parse `dark-factory/promoted-tests.json`: for each `promotedTests[]` entry, produce a `FEAT-NNNN` candidate row with `name` (from `feature`), `summary` (best-effort, from entry description if present, else `null`), `promotedAt` (from entry's `promotedAt` if present), `promotedTests` (file paths + markers from `files[]`), `gitSha` (resolved from git log cleanup commit), `introducedInvariants: []`, `introducedDecisions: []`. FEAT entries are written exclusively to `ledger.md` — no shard routing. After ledger is written, the index is updated to include one FEAT row per ledger entry, with `shard: ledger.md`. — *Retroactive fields are always empty because historical feature boundaries cannot be reconstructed.*
- **FR-11**: Phase 3.7c must specify the git log lookup strategy: use a bounded, deterministic, read-only `git log` invocation (the concrete command is documented in the agent file — e.g., `git log --all --grep='^Cleanup <name>' --format='%H|%cI' -n 5`). If no matching cleanup commit is found, set `gitSha: null` and append `[UNKNOWN SHA]` in the candidate display for developer review. The agent must NEVER modify git (no `git add`, `git commit`, `git reset`, `git push`). — *Safety constraint; git is read-only from onboard's perspective.*
- **FR-12**: Phase 3.7c must specify that ledger candidates are sorted chronologically ascending by `promotedAt`, with entries missing `promotedAt` sorted last. — *Deterministic output for diffing and human review.*
- **FR-13**: Phase 3.7c must specify that if `dark-factory/promoted-tests.json` is absent or empty, the ledger is seeded as an empty list with a header comment. — *Greenfield + fresh-framework-install support.*
- **FR-14**: Phase 3.7c must specify malformed JSON handling: if `promoted-tests.json` exists but is unparseable or does not match the expected `{ version, promotedTests: [...] }` shape, the agent must NOT crash. It must record the defect in the sign-off summary, skip ledger backfill, and proceed — ledger file is still written as empty with a header comment flagging the defect. — *Resilience; a corrupted registry must not block onboarding.*
- **FR-15**: Phase 7 sign-off must be extended with a **"Memory Sign-Off"** step that presents candidates in three batches (invariants, decisions, ledger). For invariants and decisions, per-entry semantics are **accept / edit / reject**, plus bulk actions (accept all non-low-confidence, reject all). For ledger, presentation is read-only confirmation with the option for the developer to flag missing entries (which are added manually after the prompt). — *Per-locked scope; developer has the final word.*
- **FR-16**: Phase 7 sign-off must make explicit that low-confidence candidates are **rejected by default** and require an affirmative developer action to accept. — *Enforces INV-TBD-b.*
- **FR-17**: After sign-off, onboard-agent writes accepted invariant entries to the correct domain shard file (`invariants-security.md`, `invariants-architecture.md`, or `invariants-api.md`) based on the candidate's `domain` field. Accepted decision entries are similarly routed to `decisions-{domain}.md`. Ledger entries go to `ledger.md` only. Sequential permanent IDs (`INV-0001`, `DEC-0001`, `FEAT-0001`) are assigned globally across all shards combined — not per-shard. The `shard` field on each written entry is set to the shard filename. Frontmatter on every shard file must include `generatedBy: onboard-agent`, `lastUpdated: <ISO-8601 UTC>`, `gitHash: <current HEAD short sha>`. — *Bootstrap write; the one exception to D2. Global IDs prevent cross-shard collisions.*
- **FR-17b**: After all entries are written to their shard files, onboard-agent generates `dark-factory/memory/index.md`. Steps: (1) scan all written shard files and `ledger.md` to collect all entries; (2) write one heading row per entry in ID-ascending order using the format `## {ID} [type:{type}] [domain:{domain}] [tags:{comma-joined-or-empty}] [status:active] [shard:{filename}]` followed by the one-line description; (3) write index frontmatter: `version: 1`, `lastUpdated`, `generatedBy: onboard-agent`, `gitHash`, `entryCount` (total across all shards), `shardCount` (number of non-empty shard files). The bootstrap-write exception documentation must reference the six shard files, `ledger.md`, AND `index.md`. — *Index provides bounded token-cost entry point for all consumers; shards provide domain-specific full detail.*
- **FR-18**: The agent file must contain a clearly-labeled section titled **"Bootstrap Write Exception"** (or equivalent) that documents: (a) onboard-agent is the only agent besides promote-agent allowed to write to `dark-factory/memory/`; (b) the exception is narrowly scoped to onboard time (no specs in flight, single-writer invariant trivially preserved); (c) after bootstrap, onboard-agent re-runs must NOT overwrite existing entries — only propose diffs; (d) the exception covers the six domain shard files, `ledger.md`, and `index.md`. — *Architectural guardrail; without explicit documentation, future edits will erode the invariant.*
- **FR-19**: On a subsequent `/df-onboard` where `dark-factory/memory/` already exists, the agent MUST NOT overwrite the memory files. Instead it must run a diff pass:
  - Re-scan for invariant candidates; new candidates not in the registry → proposed as additions (same confidence gating).
  - Existing entries whose `sourceRef` no longer resolves (file missing, line moved beyond reasonable tolerance) → flagged as **potentially stale**, proposed for **review** (status flip, not delete).
  - Unchanged entries → no prompt.
  - Same per-entry sign-off pattern as initial extraction.
  - After sign-off, update the relevant shard files and regenerate the entire index from scratch (scan all shards → write fresh index). Never append to an existing index — always rewrite it in full.
  — *Incremental refresh; preserves accumulated history while keeping the index current.*
- **FR-20**: Retirement/deletion of existing memory entries must never be performed automatically. The onboard-agent's diff proposal for stale entries must be a **status flip proposal** (e.g., `status: retired` with `retiredAt` and `retiredReason`) — never a file deletion. Only developer confirmation may apply the flip. — *Locked by design; irreversible operations require human sign-off.*
- **FR-21**: Every content change made to `.claude/agents/onboard-agent.md` for this feature must be mirrored character-identically in `plugins/dark-factory/agents/onboard-agent.md`. — *Plugin mirror contract; enforced by `dark-factory-contracts.test.js`.*
- **FR-22**: The agent file must explicitly state that onboard-agent's only writeable artifacts during Phase 3.7 and Phase 7 Memory Sign-Off are the files in `dark-factory/memory/` (the six domain shards, `ledger.md`, and `index.md`) plus the pre-existing writes to `project-profile.md`, `.claude/settings.json`, git hooks, and code-map via codemap-agent. The agent MUST NOT write to specs, scenarios, test files, promoted-tests.json, or source code. — *Information barrier; prevents scope creep.*
- **FR-23 (Tags sign-off)**: During the per-entry sign-off batches in Phase 7 (invariants batch, decisions batch), onboard-agent proposes `tags` values for each candidate based on the candidate's source file path and domain. The proposed tags are displayed alongside the candidate. Developer can: accept proposed tags, edit tags inline, or clear tags (empty list = no tags). Tags are free-form lowercase keywords; maximum 5 per entry. If the developer edits a candidate's `domain` field during sign-off, the agent must reroute the entry to the updated domain's shard file at write time. — *Tags enable future cross-domain search; domain-rerouting ensures routing integrity.*
- **FR-24 (Token budget documentation)**: Phase 3.7 must include a note documenting the token cost implication of the memory layout: index loading costs ≤ 4,000 tokens; each domain shard loaded on demand costs ≤ 8,000 tokens. This helps developers understand the budget impact of growing the registry and informs future decisions about shard splitting. — *Architecture transparency; bounded loading is the key advantage over the monolithic layout.*
- **FR-25 (Unknown domain handling)**: If a candidate has a `domain` value that is not one of `security | architecture | api`, the agent must default the routing to `architecture` shard (consistent with the consumers spec rule for unclassified entries). The candidate must be flagged as `[UNCLASSIFIED DOMAIN]` in the sign-off display so the developer can correct the domain before the entry is written. — *Prevents routing failures from breaking the bootstrap flow; keeps the display honest.*

### Non-Functional
- **NFR-1**: The added Phase 3.7 content must keep the onboard-agent within the project's agent token budget. If Phase 3.7 pushes the file over budget, factor the extraction rules into concise bullet form rather than prose. — *Token budgets are enforced by `dark-factory-setup.test.js` token-measurement suite.*
- **NFR-2**: Phase 3.7 must be deterministic given the same inputs: re-running on an unchanged codebase must propose identical candidate lists (same IDs in the `CANDIDATE-N` sequence, same order). — *Enables reproducible onboarding and meaningful diffs in the incremental refresh flow.*
- **NFR-3**: The git log lookup in Phase 3.7c must be bounded (e.g., `-n 200` or equivalent) and MUST have a failure mode that does not block onboarding (network-isolated repos, shallow clones, missing commits). — *Reliability on real-world repos.*
- **NFR-4**: The developer sign-off UX must be explicit and batched — the agent MUST NOT perform a silent bulk write after presenting candidates. — *Product invariant: developer is always the final signer.*

## Data Model

This spec does not introduce new persistent data structures. It consumes:
- `dark-factory/project-profile.md` (read) — architecture section and Tech Stack rows used for decision seeding
- `dark-factory/promoted-tests.json` (read) — ledger source of truth
- Git log (read) — cleanup commit SHAs
- Source files (read) — schemas, validation middleware, guard clauses

It writes (bootstrap only):
- `dark-factory/memory/invariants-security.md` — security-domain invariant entries per foundation schema
- `dark-factory/memory/invariants-architecture.md` — architecture-domain invariant entries
- `dark-factory/memory/invariants-api.md` — api-domain invariant entries
- `dark-factory/memory/decisions-security.md` — security-domain decision entries
- `dark-factory/memory/decisions-architecture.md` — architecture-domain decision entries
- `dark-factory/memory/decisions-api.md` — api-domain decision entries
- `dark-factory/memory/ledger.md` — FEAT entries per foundation schema, with permanent IDs `FEAT-NNNN`
- `dark-factory/memory/index.md` — generated compact index, one row per entry across all files

All shard files are owned by the foundation spec; their exact schema is defined there. This spec depends on the foundation spec's schema being compatible with the candidate shapes described in FR-4, FR-8, FR-10.

**ID assignment algorithm**: IDs are assigned globally across all shards. Before writing, scan all existing shard files in `dark-factory/memory/` for the highest `INV-NNNN` / `DEC-NNNN` / `FEAT-NNNN` numeric portion across ALL shards (defaulting to 0 if none). Assign `INV-{N+1:04d}` / `DEC-{N+1:04d}` / `FEAT-{N+1:04d}` sequentially in presentation order (sign-off acceptance order, file-alphabetical within same acceptance step). On incremental refresh, the highest existing N across all on-disk shard files is the starting point. IDs are never per-shard-local — an invariant in `invariants-security.md` and one in `invariants-architecture.md` must not share the same `INV-NNNN` number.

**Shard routing**:
- `domain: security` → `invariants-security.md` / `decisions-security.md`
- `domain: architecture` → `invariants-architecture.md` / `decisions-architecture.md`
- `domain: api` → `invariants-api.md` / `decisions-api.md`
- Unknown domain → default to `architecture` + flag `[UNCLASSIFIED DOMAIN]` (FR-25)
- FEAT entries → `ledger.md` only (no domain shard)

## Migration & Deployment

This change is a documentation/agent-behavior change in source files that are copied to target projects via `bin/cli.js`. Specifically:
- **Existing data**: Existing target projects with an older Dark Factory install and an existing `dark-factory/project-profile.md` will continue to work — the onboard-agent only touches memory files when the developer re-runs `/df-onboard`. The incremental-refresh path (FR-19) handles the case where `dark-factory/memory/` does not yet exist on a project that was onboarded with a pre-memory version of Dark Factory: Phase 3.7 treats it as a first-time bootstrap (foundation spec creates the directory; onboard populates it).
- **Breaking change — monolithic files eliminated**: Projects that were bootstrapped using a pre-shard version of onboard-agent (which wrote `invariants.md` and `decisions.md`) will have stale files. The incremental-refresh path must handle this: if `invariants.md` or `decisions.md` exist as monolithic files, the agent must warn the developer that these are legacy files from a pre-shard install, skip shard routing for them, and recommend re-running a full bootstrap after manually migrating or deleting the old files. The agent must NEVER silently overwrite them.
- **Rollback plan**: If Phase 3.7 produces bad output on a specific project, the developer can delete the generated files in `dark-factory/memory/` and re-run. The extraction is read-only against source code and can be re-attempted safely.
- **Zero-downtime**: The framework has no running services. No runtime migration needed.
- **Deployment order**: Foundation spec (creates directory + template + schema + soft-warn rule) must deploy before this spec. Consumers and lifecycle specs may deploy in either order relative to this one, because this spec does not change consumer/promote behavior.
- **Stale data/cache**: The `index.md` is always regenerated from shards on every write. There is no incremental index update — the index is always the canonical projection of the shard files at the time of the last onboard write.

Plugin distribution: when a downstream project runs `npx dark-factory update`, the new onboard-agent is copied in. The next `/df-onboard` run will propose memory bootstrap. Previous onboarding runs are unaffected until re-run.

## API Endpoints

N/A — Dark Factory has no HTTP API. This feature changes agent markdown and test files only.

## Business Rules

- **BR-1**: Phase 3.7 executes immediately after Phase 3.5 (code map) and immediately before Phase 4 (quality bar). No other phase may be inserted between them. — *Ordering invariant required by downstream consumers that expect code map + memory candidates to be available together during Phase 7 sign-off.*
- **BR-2**: Every invariant candidate must cite a concrete `sourceRef` (file:line). Candidates with no sourceRef are rejected silently (not even presented). — *Prevents hallucinated invariants.*
- **BR-3**: Every decision candidate must cite a concrete section in `project-profile.md`. Candidates without a profile-section reference are rejected silently. — *Prevents hallucinated decisions.*
- **BR-4**: Low-confidence candidates default to **rejected**. The developer must take an affirmative action to accept them. — *Enforces INV-TBD-b and DEC-TBD-a's conservative extraction stance.*
- **BR-5**: Ledger entries are sorted chronologically ascending by `promotedAt`. Entries with no `promotedAt` are sorted last and marked `[UNKNOWN DATE]` in the sign-off display. — *Deterministic output.*
- **BR-6**: The onboard-agent never writes to `dark-factory/memory/` without an explicit developer sign-off in the current session. Even on first bootstrap, a silent write is forbidden. — *Bootstrap write exception is narrowly scoped and still requires consent.*
- **BR-7**: On incremental refresh, the onboard-agent never deletes an existing memory entry from any shard file. Stale entries are proposed for status-flip (e.g., `retired`) only. — *Memory is append-only except via developer-confirmed status changes.*
- **BR-8**: The onboard-agent must not write to any shard file or `index.md` during the incremental-refresh diff phase until per-entry developer sign-off is complete for that batch. — *Single-writer invariant; incremental writes are not partial.*
- **BR-9**: If `project-profile.md` does not exist, Phase 3.7b emits zero decision candidates (no error, no warning to developer beyond the sign-off note). All three decision shard files are still written as empty with a header comment. — *Greenfield handling.*
- **BR-10**: If the target project has not yet received the foundation spec (i.e., `dark-factory/memory/` directory does not exist and no template is installed), Phase 3.7 must degrade gracefully: it emits a warning ("memory infrastructure not found — skipping memory bootstrap; re-run after foundation is installed"), skips all write steps, and continues to Phase 4. This prevents onboard from breaking when plugin updates land out of order. — *Foundation → onboard deployment ordering resilience.*
- **BR-11**: Every bullet item explicitly tagged `NEVER`, `MUST`, or `ALWAYS` in agent/skill markdown must be considered a potential Dark-Factory-self invariant during 3.7a. Confidence for these is **medium** by default (they are declarative rules but may not represent domain invariants in every target project). — *Dark-Factory-on-itself onboarding correctness.*
- **BR-12**: IDs are assigned globally across all shards. A given numeric suffix may not appear in both `invariants-security.md` and `invariants-architecture.md` as `INV-0001`. IDs increment monotonically in the order entries are accepted during sign-off, regardless of which shard receives them. — *Cross-shard ID uniqueness.*
- **BR-13**: The `index.md` file is always generated last — after all shard writes and the ledger write are complete. If any shard write fails, the index must not be written. The index always reflects the complete committed state of all shards. — *Index consistency invariant.*
- **BR-14**: Domain rerouting during sign-off is applied at write time only — the agent updates the candidate's `shard` field in memory and routes the write accordingly. The original candidate display is not re-rendered; the final written shard is the source of truth. — *UX simplicity; avoids confusing mid-sign-off re-renders.*

## Error Handling

| Scenario | Response | Side Effects |
|----------|----------|--------------|
| `dark-factory/memory/` directory does not exist (foundation not installed) | Warn in sign-off summary, skip writes, proceed to Phase 4 (BR-10) | None |
| `dark-factory/promoted-tests.json` absent | Seed ledger empty with header comment | None |
| `dark-factory/promoted-tests.json` malformed / bad shape | Skip ledger backfill; write empty ledger with `[LEDGER CORRUPTED]` comment; include in sign-off summary | Sign-off summary flags the defect |
| `dark-factory/project-profile.md` absent (greenfield) | Seed decisions empty with header comment (FR-9); no error | None |
| Git log command fails (not a git repo / shallow clone) | `gitSha: null` for all ledger entries; tag each with `[UNKNOWN SHA]` | None |
| Git log finds zero cleanup commits matching a feature | `gitSha: null` for that entry; tag `[UNKNOWN SHA]` in sign-off | None |
| Developer rejects every candidate in a batch | Write the corresponding shard files as empty (with header comment) | Shard files are created but contain no entries |
| Developer rejects ALL candidates across all three batches | Write all shard files and ledger.md as empty (with header comment); write index.md with zero entry rows; Phase 3.7 is considered complete | Files exist, empty |
| `dark-factory/memory/` already exists and diff produces zero additions and zero stale entries | Skip sign-off for memory; log "Memory files are current" | None |
| Developer accepts a stale-entry status-flip proposal | Write updated entry in the appropriate shard with `status: retired`, `retiredAt: <ISO>`, `retiredReason: <developer-provided or default>`; regenerate index | Entry status updated; entry not deleted from shard |
| Developer edits a candidate during sign-off | Use the edited content verbatim when writing; preserve all required schema fields or warn and re-prompt | None |
| Developer edits a candidate's `domain` during sign-off | Reroute entry to the updated domain's shard at write time; update the candidate's `shard` field | Entry written to updated domain shard, not the original |
| Candidate has an unrecognized `domain` value | Default to `architecture` shard; flag `[UNCLASSIFIED DOMAIN]` in sign-off display for developer to correct | Unclassified entry written to `invariants-architecture.md` / `decisions-architecture.md` |
| Bootstrap ID collision (e.g., foundation template pre-seeded `INV-0001` in any shard) | Scan ALL shard files for max existing ID; start candidate IDs at max+1 across all shards | None |
| Shard write fails mid-way (e.g., filesystem error on third shard) | STOP; report to developer; do not write index.md; leave written shards in place (already-written data is not reverted) | Index not written; partial shard state documented in sign-off summary |
| Re-run detects an unparseable existing memory file | STOP; report to developer — do not attempt auto-repair | No writes |
| Re-run detects legacy monolithic `invariants.md` or `decisions.md` | Warn developer of pre-shard legacy files; skip shard routing for those files; recommend full re-bootstrap after migrating old files | No new shard writes for legacy files |
| Index generation fails after all shards are written | Report to developer; leave shard files as written; regenerating the index on next re-run is safe (FR-19 regenerates it from scratch) | Index absent or stale |

## Acceptance Criteria

- [ ] **AC-1**: `.claude/agents/onboard-agent.md` contains a section titled "Phase 3.7: Memory Extraction" positioned between Phase 3.5 and Phase 4.
- [ ] **AC-2**: Phase 3.7 contains three explicitly labeled sub-sections: "3.7a Invariants Extraction", "3.7b Decisions Seeding", "3.7c Ledger Retro-Backfill".
- [ ] **AC-3**: Phase 3.7a documents the full scan-source allowlist (schemas, required-markers, validation middleware, guard clauses, agent/skill NEVER/MUST/ALWAYS statements), the candidate shape (FR-4), the confidence gating rule (FR-5), and a conservative-bias positive+negative example (FR-6).
- [ ] **AC-4**: Phase 3.7b documents that decisions are sourced from `project-profile.md` only (no code-body inference), the candidate shape (FR-8), and the greenfield fallback (FR-9).
- [ ] **AC-5**: Phase 3.7c documents the `promoted-tests.json` parse rules (FR-10), the bounded read-only git log strategy (FR-11), chronological sort (FR-12), the empty-registry fallback (FR-13), and the malformed-JSON fallback (FR-14).
- [ ] **AC-6**: Phase 7 Sign-Off section describes the three-batch presentation (invariants / decisions / ledger), per-entry accept/edit/reject semantics, bulk actions, low-confidence-defaults-to-rejected, ledger read-only confirmation, `tags` proposal per entry, and domain-rerouting on edit.
- [ ] **AC-7**: A clearly-labeled "Bootstrap Write Exception" section documents the narrow scope of onboard-agent writing to `dark-factory/memory/` (six shard files + `ledger.md` + `index.md`) and the prohibition against overwriting during re-run.
- [ ] **AC-8**: The incremental-refresh subsection documents the diff algorithm: re-scan, classify new/unchanged/stale, propose per-entry, never delete automatically (status flip only), and full index regeneration after sign-off.
- [ ] **AC-9**: `plugins/dark-factory/agents/onboard-agent.md` matches `.claude/agents/onboard-agent.md` byte-for-byte (plugin mirror contract).
- [ ] **AC-10**: `tests/dark-factory-setup.test.js` has new assertions under a clearly-labeled section (e.g., `// project-memory-onboard structural assertions`) validating: Phase 3.7 exists and is positioned correctly; the three sub-steps are present; the extraction allowlist is documented; the confidence gating rule is documented (including the `low → rejected by default` clause); per-entry sign-off semantics are documented; the bootstrap-write exception is documented; the shard routing rules are documented; the index generation step is documented; tags sign-off is documented; the incremental-refresh diff behavior is documented; the read-only git constraint is documented.
- [ ] **AC-11**: `tests/dark-factory-contracts.test.js` has mirror-parity assertions for the Phase 3.7 content (both files contain the same required phrases).
- [ ] **AC-12**: Adding Phase 3.7 does not exceed the onboard-agent token budget as measured by the existing `token-measurement` suite.
- [ ] **AC-13**: All existing tests still pass — no regression in Phase 1/2/2.5/3/3.5/4/5/6/7/7.5/8 assertions.
- [ ] **AC-14**: The agent file does NOT claim onboard-agent modifies `promoted-tests.json`, specs, scenarios, test files, or source code (information barrier).
- [ ] **AC-15**: The agent file documents the shard routing table: `security → invariants-security.md`, `architecture → invariants-architecture.md`, `api → invariants-api.md` (and equivalents for decisions).
- [ ] **AC-16**: The agent file documents index generation as a post-write step with the correct format (heading rows + frontmatter fields).
- [ ] **AC-17**: The writeable paths list in the agent's constraints section enumerates all eight memory files (six shards + ledger.md + index.md) and the agent file specifies no TEMPLATE placeholder entries are written to shard files.

## Edge Cases

- **EC-1**: Project has `dark-factory/` but no `memory/` subdirectory and no foundation template present. Expected: warn "foundation not installed", skip memory bootstrap, continue to Phase 4 (BR-10). The onboard run succeeds and writes the profile.
- **EC-2**: Project has `dark-factory/memory/` but all shard files are present from a prior bootstrap. Expected: enter incremental-refresh diff mode; do not overwrite. Regenerate index after sign-off.
- **EC-3**: Project has `dark-factory/memory/` but one shard file is missing (e.g., `invariants-api.md` deleted by hand). Expected: treat the missing shard as a fresh bootstrap for that shard only; leave the other shards in incremental-refresh mode. Document this mixed-mode behavior explicitly. Regenerate index after sign-off to reflect corrected state.
- **EC-4**: Schema scan finds `required: true` inside a Mongoose subdocument (nested). Expected: still produce an invariant candidate with `sourceRef` pointing to the subdocument line; confidence `high`.
- **EC-5**: Validation middleware named in a unit test file, not production code. Expected: ignore — scan excludes `tests/`, `__tests__/`, `*.test.*`, `*.spec.*` files.
- **EC-6**: `package.json` lists `mongoose` but no schema files exist. Expected: zero invariant candidates from schema source; other sources (middleware, markdown rules) still evaluated.
- **EC-7**: Dark Factory onboarding itself (this repo). Expected: Phase 3.7a extracts agent/skill `NEVER`/`MUST`/`ALWAYS` statements as medium-confidence invariant candidates (e.g., "spec-agent never reads holdout scenarios"); 3.7b extracts decisions from the project profile's Architecture section (e.g., "JavaScript CommonJS; Node built-in test runner"). 3.7c backfills from the four entries currently in `promoted-tests.json`.
- **EC-8**: Greenfield — empty project, no `package.json`, no `project-profile.md`, no `promoted-tests.json`. Expected: write six empty shard files (YAML frontmatter only, no placeholder entries), `ledger.md` with "No features shipped yet" comment, and `index.md` with `## Memory Index` heading and zero entry rows. All files include a header comment explaining entries will accumulate as features are specced.
- **EC-9**: `project-profile.md` exists but has no Architecture section. Expected: zero decision candidates; sign-off summary notes "no architecture section found — decisions empty".
- **EC-10**: Multiple ORMs present (e.g., Mongoose + Prisma). Expected: scan both, de-duplicate on (file:line) key, present all candidates.
- **EC-11**: `promoted-tests.json` entry references a file that no longer exists on disk. Expected: include the entry in the ledger with `promotedTests` listing the (now-stale) path, tag with `[STALE PATH]` in sign-off; do not drop the entry.
- **EC-12**: Git log returns multiple cleanup commits that could match a feature name (e.g., a feature was cleaned up, re-introduced, and cleaned up again). Expected: select the most recent cleanup commit (first in `-n 5` result set ordered by committer date); note ambiguity in sign-off if more than one match.
- **EC-13**: Developer edits a candidate's `sourceRef` to point to a non-existent file during sign-off. Expected: warn the developer, do not auto-correct, accept the edit only if the developer confirms. Written entry retains the edited reference.
- **EC-14**: During incremental refresh, a previously-accepted invariant's `sourceRef` file has been deleted and replaced by an equivalent file at a different path. Expected: flag as stale (path no longer resolves); developer can either edit the `sourceRef` or flip to `retired`. No automatic re-pointing. Index is regenerated after sign-off.
- **EC-15**: During incremental refresh, a new candidate matches an existing retired entry (same `title` + `rule`). Expected: surface both to the developer with a "possible un-retirement" note; do not auto-reactivate.
- **EC-16**: Re-run happens after a previous `/df-onboard` crashed mid-sign-off (memory files are partially written or absent). Expected: treat as fresh bootstrap; do not attempt to recover prior session state.
- **EC-17**: Developer accepts all invariant candidates but rejects all decision candidates. Expected: write invariant entries to their domain shards; write all three decision shard files empty with header comments; regenerate index including only invariant rows.
- **EC-18**: Foundation template or prior bootstrap pre-seeds an entry in any shard file (e.g., `INV-0001` in `invariants-security.md`). Expected: onboard scans ALL shard files for max existing ID, starts new candidate IDs at max+1 across all shards.
- **EC-19**: The agent/skill markdown scan finds a `NEVER` in a comment that is actually a negation of an invariant (e.g., "NEVER do X unless Y"). Expected: still extract it; mark confidence `low` and rely on developer sign-off to cull. Do not attempt to parse the full conditional.
- **EC-20**: Developer edits an invariant candidate's `domain` from `security` to `api` during sign-off. Expected: entry is written to `invariants-api.md`, not `invariants-security.md`. The `shard` field is set to `invariants-api.md`. The index row reflects the updated domain and shard.
- **EC-21**: An invariant candidate arrives with `domain: compliance` (unrecognized). Expected: default to `architecture` shard; display `[UNCLASSIFIED DOMAIN]` in sign-off. Developer can edit domain before accepting.
- **EC-22**: Two invariant candidates are accepted: one security, one architecture. Global ID assignment gives the first accepted entry `INV-0001` and the second `INV-0002`, regardless of which shard each lands in. The index lists both in `INV-0001`, `INV-0002` order.

## Dependencies

- **Depends on**: `project-memory-foundation` — needs the `dark-factory/memory/` directory, the `project-memory-template.md`, the schema, and the soft-warn rule before this spec's write path can populate files successfully. If foundation is not yet installed on a target project, this spec degrades gracefully (BR-10, EC-1).
- **Depended on by**: none directly. The `project-memory-consumers` and `project-memory-lifecycle` sub-specs are wave-3 and can proceed in parallel with this one (Wave 2) but do not import from this spec.
- **Group**: `project-memory`

Shared resources touched by this spec:
- `.claude/agents/onboard-agent.md` — also touched by the onboard-agent itself at runtime (writes) and by `dark-factory-setup.test.js` (reads). No other sub-spec edits this file.
- `plugins/dark-factory/agents/onboard-agent.md` — same.
- `tests/dark-factory-setup.test.js` — also appended to by promote-agent at promotion time; this spec only ADDS new assertions in a clearly-marked section; does not modify unrelated tests.
- `tests/dark-factory-contracts.test.js` — same.
- `dark-factory/memory/*` — owned by foundation; populated (at runtime) by this spec and later by promote-agent. Single-writer invariant is preserved because onboard runs before any spec is active.

No breaking changes to any existing agent, skill, or test. Phase 3.7 is additive.

## Implementation Size Estimate

- **Scope size**: **medium** (~4 files touched)
  - `.claude/agents/onboard-agent.md` (edit — add Phase 3.7 with shard routing + index generation + tags sign-off, extend Phase 7 sign-off, add Bootstrap Write Exception section)
  - `plugins/dark-factory/agents/onboard-agent.md` (mirror edit)
  - `tests/dark-factory-setup.test.js` (append new assertion block)
  - `tests/dark-factory-contracts.test.js` (append mirror parity assertions for new content)
- **Suggested parallel tracks**: **1 serial track recommended.** Although the work splits naturally into (A) agent file edits and (B) test assertions, the agent files are small (~250 lines) and the assertions in (B) must precisely match wording in (A). A single-track serial implementation avoids wording drift and is likely faster end-to-end than coordinating two tracks. If the code-agent prefers two tracks, the agent-file track MUST land first; the test track depends on the exact phrases written. No file overlap between tracks under this split.

## Implementation Notes

Patterns to follow (evidence from existing onboard-agent.md and prior features):

1. **Phase numbering style**: match the existing "Phase X: Title" heading style with numbered step lists inside. See Phase 2.5 (UI Layer & E2E Detection) for a close precedent that introduces a new phase between existing phases with numbered sub-steps.
2. **Allowlist-driven scanning**: Phase 2.5 uses explicit package allowlists for frontend/E2E detection. Phase 3.7a should use the same pattern — explicit ORM/validation allowlist, explicit markers (`required: true`, `@NotNull`, etc.) — to avoid ambiguous pattern matching.
3. **Ask-the-developer pattern**: Phase 2.5's ambiguous-UI prompt and Phase 6's batched questions are the precedents for Phase 7's three-batch sign-off UX. Reuse the `AskUserQuestion` tool.
4. **Template consumption**: Phase 3.7 should read foundation's `dark-factory/templates/project-memory-template.md` for the schema, mirroring how Phase 7 reads `project-profile-template.md`. Do not duplicate schema definitions inside onboard-agent.md.
5. **Bootstrap write exception**: Place a dedicated "Bootstrap Write Exception" section after Phase 7 and before Phase 7.5 (Git Hook Setup) for discoverability. Reference all eight memory write targets (six shards + ledger.md + index.md).
6. **Shard routing table**: Present the routing as a concise table (domain → invariant shard, domain → decision shard) inside Phase 3.7 and again in the Bootstrap Write Exception section for discoverability.
7. **Index generation step**: Document index generation as a distinct sub-step in Phase 3.7 and in the Bootstrap Write Exception section. The index is always generated last. Use the exact heading format `## {ID} [type:{type}] ...` so structural tests can assert it.
8. **Tags display**: During sign-off, display proposed tags alongside each candidate's domain. If no tags are proposed, show `tags: (none)` explicitly. Accepted tags are written to the shard entry; they also appear in the index row.
9. **Test wiring**: Append assertions to `tests/dark-factory-setup.test.js` at the bottom of the file inside a clearly-marked block (e.g., `// === project-memory-onboard structural assertions ===`) to minimize diff against the existing 3635-line file. The setup test already uses a string-matching pattern — follow the same style: `assert.match(onboardAgentContent, /Phase 3\.7: Memory Extraction/)`.
10. **Mirror contract test**: The existing contracts test iterates over agent files and compares `.claude/agents/` and `plugins/dark-factory/agents/` byte-for-byte. Adding Phase 3.7 to both files is sufficient; no new mirror assertion is strictly required, but an additional phrase-level assertion for Phase 3.7 content is recommended for defensive coverage.
11. **Conservative language**: Follow the existing onboard-agent tone — "document reality, don't judge". Phase 3.7 extraction MUST NOT assert opinions about codebase quality; it MUST only extract mechanical signals (schema constraints, middleware presence) and defer interpretation to the developer.
12. **Token budget**: The token-measurement suite enforces a cap per agent. If Phase 3.7's prose risks overflow, factor extraction rules into dense bullet form. The shard routing table, index generation steps, and tags sign-off UX can all be expressed as compact bullet lists.
13. **Git log invocation**: Use `Bash` tool with a read-only `git log --all --grep='^Cleanup <feature>' --format='%H|%cI' -n 5` (or equivalent) — NEVER use `git add/commit/reset/push/rebase/checkout -b`. Document this constraint inline in Phase 3.7c.

## Invariants

- **INV-TBD-a**: **onboard-agent must present every memory candidate for developer sign-off before writing any entry to `dark-factory/memory/*`.** This applies to bootstrap AND incremental refresh. Even on first install, the bootstrap-write exception does NOT permit silent writes — only unattended writes are forbidden; developer-confirmed writes are allowed.
  - Scope: `.claude/agents/onboard-agent.md`, `plugins/dark-factory/agents/onboard-agent.md`
  - Domain: `architecture`
  - Enforced by: `tests/dark-factory-setup.test.js` (assertions on Phase 7 Memory Sign-Off wording)
  - Rationale: Prevents onboard-agent from becoming a silent writer into memory, which would corrupt the single-writer invariant that the broader project-memory feature relies on (D2). The bootstrap-write exception is narrow: it says onboard-agent is the only non-promote writer, NOT that onboard-agent may write without consent.

- **INV-TBD-b**: **Low-confidence memory candidates (`confidence: low`) are rejected by default during developer sign-off. They require explicit opt-in by the developer to be accepted.** The agent MUST NOT present low-confidence candidates with "accepted" as the default action.
  - Scope: `.claude/agents/onboard-agent.md`, `plugins/dark-factory/agents/onboard-agent.md`
  - Domain: `architecture`
  - Enforced by: `tests/dark-factory-setup.test.js` (assertion on the `[LOW CONFIDENCE]` marker and default-rejected clause in Phase 3.7a and Phase 7 Memory Sign-Off)
  - Rationale: Lead C investigation flagged false-positive invariants as worse than false-negatives — a bad invariant blocks legitimate features until someone retracts it. Defaulting low-confidence to rejected ensures the memory layer stays high-signal.

## Decisions

- **DEC-TBD-a**: **Medium-depth extraction (schema + validation middleware + markdown NEVER/MUST/ALWAYS only; no LLM inference of business rules from code bodies)**.
  - Context: Memory extraction can span a spectrum from shallow (only explicit schema) to deep (LLM inference from function bodies). The depth chosen trades off coverage against false-positive rate.
  - Decision: Medium depth — scan schemas, required-field markers, validation middleware, guard clauses in shared utilities, and agent/skill NEVER/MUST/ALWAYS statements. Do not perform free-form reasoning over function bodies to infer business rules.
  - Alternatives rejected:
    - *Shallow (schemas only)*: Too incomplete. Misses half the domain invariants that live in validation layers rather than schemas.
    - *Deep (LLM inference from function bodies)*: Too noisy. Triage cost on a real project would overwhelm the developer during sign-off; false positives would pollute memory and erode trust in the registry.
  - Rationale: Medium depth produces a candidate set small enough for per-entry sign-off (tens, not hundreds) and high enough signal that false positives are rare. Low-confidence candidates defaulting to rejected further reduces the false-positive risk (INV-TBD-b).
  - Domain: `architecture`
  - Source: locked in investigation phase (D6); re-stated here for spec traceability.
  - Confidence: high

- **DEC-TBD-b**: **Shard-aware layout with global IDs (not per-shard-local IDs)**.
  - Context: Shard routing creates the possibility of ID collisions if each shard maintains its own counter (e.g., `invariants-security.md` and `invariants-architecture.md` both start at `INV-0001`).
  - Decision: IDs are assigned globally across all shards in sign-off acceptance order. A single monotonic counter determines the next `INV-NNNN` regardless of which shard the accepted entry routes to.
  - Alternatives rejected:
    - *Per-shard-local IDs*: Causes collision when consumer agents cross-reference entries by ID. Cross-shard references become ambiguous without the shard prefix.
    - *Shard-prefixed IDs (e.g., SEC-INV-0001)*: More complex, breaks the foundation schema, and requires all consumers to understand the prefixing scheme.
  - Rationale: Global IDs keep cross-shard references unambiguous at the cost of non-contiguous numbering within a single shard (which is acceptable — gaps are not a correctness issue).
  - Domain: `architecture`
  - Confidence: high

## Traceability

| Spec Item | Scenario(s) |
|-----------|-------------|
| FR-1 (Phase ordering) | P-01 |
| FR-2 (three sub-sections) | P-02 |
| FR-3 (scan sources) | P-03, P-04 |
| FR-4 (invariant candidate shape) | P-03 |
| FR-5 (confidence gating) | P-05, H-01 |
| FR-6 (conservative bias example) | P-06 |
| FR-7 (decisions from profile) | P-07 |
| FR-8 (decision candidate shape) | P-07 |
| FR-9 (greenfield decisions fallback) | P-10, H-02, H-NEW-05 |
| FR-10 (promoted-tests.json parse + FEAT rows in index) | P-08 |
| FR-11 (bounded read-only git log) | P-08, H-03 |
| FR-12 (chronological sort) | P-08 |
| FR-13 (empty registry fallback) | P-10, H-NEW-05 |
| FR-14 (malformed JSON handling) | H-04 |
| FR-15 (three-batch sign-off + tags) | P-09, H-05, P-NEW-03 |
| FR-16 (low-confidence default reject) | P-05, H-01 |
| FR-17 (shard routing + global IDs + frontmatter) | P-NEW-01, H-NEW-01, H-NEW-07 |
| FR-17b (index generation) | P-NEW-02, H-NEW-02, H-NEW-06 |
| FR-18 (Bootstrap Write Exception — shards + index) | P-11 |
| FR-19 (incremental refresh + index regeneration) | P-12, H-06, H-07, H-NEW-06 |
| FR-20 (no auto-delete, status flip only) | H-06, H-08 |
| FR-21 (plugin mirror parity) | P-13 |
| FR-22 (info barrier — shards + index in writeable paths) | P-14 |
| FR-23 (tags sign-off + domain rerouting) | P-NEW-03, H-NEW-03 |
| FR-24 (token budget documentation) | P-15 |
| FR-25 (unknown domain → architecture + UNCLASSIFIED) | H-NEW-04 |
| NFR-1 (token budget) | P-15 |
| NFR-2 (deterministic) | H-09 |
| NFR-3 (bounded git log, fail-soft) | H-03 |
| NFR-4 (no silent bulk writes) | P-09, H-05 |
| BR-1 (phase ordering) | P-01 |
| BR-2 (invariant requires sourceRef) | H-10 |
| BR-3 (decision requires profile ref) | H-10 |
| BR-4 (low-confidence default reject) | P-05, H-01 |
| BR-5 (ledger sort) | P-08 |
| BR-6 (no silent writes even on bootstrap) | P-09, H-05 |
| BR-7 (no auto-delete on refresh, all shards) | H-06 |
| BR-8 (no partial writes on refresh, shards + index) | H-11 |
| BR-9 (greenfield = empty decisions shards) | P-10, H-02, H-NEW-05 |
| BR-10 (graceful degrade if foundation absent) | P-16, H-12 |
| BR-11 (agent markdown NEVER/MUST/ALWAYS → medium-confidence) | P-04 |
| BR-12 (global IDs across shards) | H-NEW-07 |
| BR-13 (index generated last, after all shards) | H-NEW-02 |
| BR-14 (domain rerouting applied at write time) | H-NEW-03 |
| EC-1 (foundation not installed) | P-16, H-12 |
| EC-2 (memory exists → incremental refresh) | P-12 |
| EC-3 (partial shard files mixed-mode) | H-13 |
| EC-4 (nested schema required) | H-14 |
| EC-5 (test files excluded) | H-15 |
| EC-6 (ORM present, no schema files) | H-16 |
| EC-7 (Dark Factory onboarding itself) | H-17 |
| EC-8 (full greenfield — 6 shards + index) | P-10, H-02, H-NEW-05 |
| EC-9 (profile without architecture section) | H-18 |
| EC-10 (multiple ORMs) | H-19 |
| EC-11 (ledger entry with stale path) | H-20 |
| EC-12 (ambiguous git log match) | H-21 |
| EC-13 (developer edits sourceRef to bad path) | H-22 |
| EC-14 (refresh: sourceRef replaced at different path) | H-07 |
| EC-15 (refresh: new candidate matches retired entry) | H-23 |
| EC-16 (crash mid-sign-off recovery) | H-24 |
| EC-17 (accept all invariants, reject all decisions) | H-25 |
| EC-18 (any shard pre-seeds an ID → global max+1) | H-26 (updated) |
| EC-19 (NEVER in a conditional comment) | H-27 |
| EC-20 (developer edits domain during sign-off) | H-NEW-03 |
| EC-21 (unrecognized domain → UNCLASSIFIED) | H-NEW-04 |
| EC-22 (global ID across two shards) | H-NEW-07 |
| AC-1..AC-17 | P-01 through P-16, P-NEW-01..P-NEW-03, H-* coverage as above |
