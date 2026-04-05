# Dark Factory

**Specs in, production-grade features out.**

Dark Factory is an open-source multi-agent framework for Claude Code. Just describe what you need — it assembles a team of AI specialists who research, challenge, implement, and validate autonomously. No agent can cut corners because no agent has the full picture.

> Inspired by [The Dark Factory Pattern](https://hackernoon.com/the-dark-factory-pattern-moving-from-ai-assisted-to-fully-autonomous-coding) — moving from AI-assisted to fully autonomous coding.

```
                          ┌─────────────┐
  /df-onboard      ──────▶│   Onboard   │──▶ project-profile.md + code-map.md
                          └─────────────┘

                          ┌─────────────────────────┐
  Just describe     ──────▶│  3 Spec/Debug Leads     │──▶ synthesized spec
  what you need           │  (parallel perspectives) │
                          └─────────────────────────┘
                                    │
                          ┌─────────────────────────┐
                          │  Architect Review        │──▶ APPROVED
                          │  (3 parallel domains)    │
                          └─────────────────────────┘
                                    │
                          ┌─────────────┐     ┌─────────────┐
                          │ Code Agents │────▶│ Test Agent  │──▶ Promote → Cleanup
                          │ (1-4, auto) │◀────│ (unit + e2e)│
                          └─────────────┘  max└─────────────┘
                                           3 rounds
```

---

## Quick Start

**Prerequisites**: [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) installed

### Install as Claude Code Plugin (recommended)

Inside any Claude Code session, run:

```
/plugin marketplace add nguyenhuynhkhanh/dark-factory
/plugin install dark-factory@dark-factory-marketplace
```

That's it — Dark Factory is now available across **all** your projects. The plugin auto-updates when new versions are pushed.

### Alternative: npm (per-project install)

```bash
npx dark-factory init
```

This copies agents, skills, and rules into the current project only. To update later: `npx dark-factory update`

### Get started

1. Open Claude Code in your project
2. Run `/df-onboard` to map your project's architecture and build a code map
3. Just describe what you need — Dark Factory activates automatically

---

## Usage

### Just describe what you need

You don't need to remember any commands. Just tell Claude Code what you want:

```
I need an API endpoint that lets users export their data as CSV
```

Dark Factory auto-detects this is a feature and routes it through the pipeline. If it's a bug report, it routes to the debug pipeline instead. If it can't tell, it asks.

You can also start with a question — "how does the auth system work?" — and when the conversation evolves into a concrete plan, Dark Factory activates at that moment.

### What happens next

**For features:**
1. **3 spec leads** research in parallel (user/product, architecture, reliability perspectives)
2. Findings are synthesized → you confirm scope
3. **Smart decomposition**: large features are automatically split into smaller specs with declared dependencies and wave ordering
4. Spec(s) + scenarios written → holdout scenarios shown inline for your review
5. **Architect review**: 3 parallel domain-focused reviews (security, architecture, API) for every spec — no exceptions
6. **Implementation in parallel worktrees**: each spec gets its own worktree, with up to 4 code-agents per spec. Multi-spec features execute in dependency-aware waves — independent specs run in parallel, dependent specs wait.
7. **Group orchestration**: use `--group` to orchestrate all specs in a decomposed feature, or `--all` to run everything pending. Resume after failure with the same command — completed specs are skipped automatically.
8. On success: holdout tests promoted into your permanent test suite, artifacts cleaned up (git history is the archive)

**For bugs:**
1. **3 investigators** research in parallel (code path tracer, history detective, pattern analyst)
2. Findings synthesized → you confirm diagnosis → debug report + regression scenarios written
3. **Systemic analysis**: investigators search for similar vulnerable patterns across the codebase, classify the bug as isolated or systemic, and produce a regression risk assessment
4. Strict red-green cycle: failing test first (proves bug), then minimal fix (no test changes)
5. **Variant regression tests**: proportional to risk — high-risk bugs get 3-5 variant scenarios covering different paths to the same root cause
6. Holdout validation, promote tests (with structured annotations linking to root cause), cleanup artifacts

### Explicit commands (optional)

| Command | What it does |
|---------|-------------|
| `/df {description}` | Auto-detect bug vs feature, route to right pipeline |
| `/df-onboard` | Map project architecture, conventions, quality bar, and build code map |
| `/df-intake {desc}` | Create feature spec (3 parallel leads, synthesized) |
| `/df-debug {desc}` | Investigate bug (3 parallel investigators, synthesized) |
| `/df-orchestrate {name} [name2...]` | Implement specs in parallel worktrees |
| `/df-orchestrate --group {name}` | Implement all specs in a feature group |
| `/df-orchestrate --all` | Implement all pending specs across all groups |
| `/df-cleanup` | Recover stuck features, verify promoted test health |
| `/df-spec` | Show spec templates for manual writing |
| `/df-scenario` | Show scenario templates for manual writing |

---

## Why Dark Factory?

AI coding assistants write code fast, but fast code on a flawed spec is fast failure. They skip architecture review, miss security concerns, and can't validate their own work honestly — they wrote both the code and the tests.

Dark Factory separates concerns into independent agents with strict information barriers:

| What goes wrong without it | How Dark Factory prevents it |
|---|---|
| AI guesses the scope instead of asking | 3 spec-agents research from different perspectives — user, architecture, reliability |
| AI skips architecture review | Architect-agent reviews every spec with 3 parallel domain-focused reviews (security, architecture, API) |
| AI writes tests that match its own implementation | Test-agent uses **holdout scenarios** the code-agent has never seen |
| Bug fixes that mask symptoms | 3 debug-agents investigate from different angles; systemic analysis finds similar patterns; strict red-green cycle prevents symptom-masking |
| Bugs keep coming back after being "fixed" | Regression risk assessment, variant test coverage proportional to risk, promoted tests annotated with root cause and guarded code locations |
| AI doesn't understand the existing codebase | Onboard-agent maps architecture, conventions, quality bar, AND builds a deep code map (dependency graph, entry point traces, hotspots) |
| AI doesn't know what it might break | Code map shows shared dependency hotspots and blast radius — agents know impact before making changes |
| Large features get stuck in one context window | Smart decomposition into smaller specs with dependency-aware wave execution across parallel worktrees |
| Some specs in a group never get implemented | Group orchestration (`--group`, `--all`) ensures every spec is tracked, with resume semantics for partial failures |
| AI forgets migration plans for production data | Every spec requires a mandatory Migration & Deployment section |
| Specs get updated but scenarios don't | Scenario re-evaluation is mandatory after every spec change during architect review |

---

## How It Works

### The 7 Agents

| Agent | Role | How it works |
|-------|------|-------------|
| **Onboard** | Maps the project before any work begins | Analyzes codebase → produces project profile + code map (parallel scanners per directory) |
| **Spec** (x3) | Discovers scope, challenges assumptions, writes specs | 3 leads research in parallel from different perspectives |
| **Debug** (x3) | Forensic root cause analysis, impact assessment | 3 investigators run in parallel — code path, history, patterns. Produces systemic analysis + regression risk assessment |
| **Architect** | Reviews specs for architecture, security, performance | 3 parallel domain-focused reviews for every spec. Findings forwarded to code-agents |
| **Code** (x1-4) | Implements features and fixes | Auto-scaled parallel sessions within a worktree-isolated spec. Receives architect findings as context |
| **Test** | Validates with hidden scenarios | Unit tests + Playwright e2e (auto-detected) |
| **Promote** | Moves holdout tests into permanent test suite | Adapts both unit and e2e tests. Annotates with root cause, guarded code locations |

### Deep Code Map

During onboarding, Dark Factory builds a structural analysis of your codebase:

- **Module dependency graph** — which modules import from which, grouped by directory
- **Entry point traces** — HTTP route → controller → service → repository → database
- **Shared dependency hotspots** — modules imported by many others (high blast radius for changes)
- **Interface/contract boundaries** — what each module exports
- **Cross-cutting concerns** — middleware, decorators, base classes affecting multiple modules
- **Circular dependencies** — detected and flagged

The code map is built by **parallel scanner agents** — one per top-level source directory, analyzing all project code (smart exclusions for libraries, generated code, binaries). A Mermaid diagram (`code-map.mermaid`) is generated for human visualization.

Every downstream agent reads relevant sections of the code map: spec-agents use it for scope estimation, architects for blast radius, code-agents for contract preservation, debug-agents for call chain tracing.

### Information Barriers

The key innovation. Each agent has **strict boundaries** on what it can see:

```
                    ┌─────────────────────────────────────────────┐
                    │     Project Profile + Code Map               │
                    │  (all agents can read relevant sections)     │
                    └─────────────────────────────────────────────┘

    ┌──────────┐          ┌──────────┐          ┌──────────┐
    │   Spec   │          │   Code   │          │   Test   │
    │  Agent   │          │  Agent   │          │  Agent   │
    │          │          │          │          │          │
    │ Sees:    │          │ Sees:    │          │ Sees:    │
    │ codebase │          │ spec,    │          │ spec,    │
    │ docs     │          │ PUBLIC   │          │ HOLDOUT  │
    │          │          │ scenarios│          │ scenarios│
    │ Cannot:  │          │ +architect│          │          │
    │ holdout  │          │ findings │          │ Cannot:  │
    │ results  │          │          │          │ PUBLIC   │
    └──────────┘          │ Cannot:  │          │ scenarios│
                          │ HOLDOUT  │          └──────────┘
    ┌──────────┐          │ results  │
    │Architect │          └──────────┘
    │  Agent   │
    │          │  Can see: spec, codebase, project profile, code map
    │          │  CANNOT see: ANY scenarios (public or holdout)
    │          │  CANNOT discuss tests with other agents
    └──────────┘
```

### Regression Prevention

Bug fixes include built-in protection against recurrence:

- **Systemic analysis**: investigators search for the same vulnerable pattern across the codebase — not just fixing one instance while leaving others
- **Regression risk assessment**: classified as isolated, systemic, or shared-code risk, with concrete reintroduction vectors
- **Root cause depth**: distinguishes immediate cause from deeper enabling pattern — tests target the deeper pattern
- **Variant scenarios**: proportional to risk level (HIGH: 3-5 variants, MEDIUM: 1-2, LOW: reproduction only)
- **Promoted test annotations**: every promoted test includes root cause pattern, guarded code locations, and bug reference — so future developers understand what the test protects

### Group Orchestration

Large features decompose into multiple specs with dependencies. Dark Factory handles this with:

- **`--group {name}`**: orchestrate all specs in a feature group, resolving dependencies into execution waves
- **`--all`**: orchestrate every pending spec across all groups, running independent groups in parallel
- **Wave execution**: foundation specs complete first, then dependent specs start (each in its own worktree from the latest code)
- **Resume semantics**: re-run the same command after a failure — completed specs are automatically skipped
- **Failure isolation**: if a spec fails, only its transitive dependents are paused — independent specs continue
- **Cross-group guard**: warns when explicitly mixing specs from different groups (override with `--force`)

### Red-Green Cycle (Bugfixes)

Strict discipline that prevents the most common AI failure mode: fixing the symptom instead of the root cause.

```
Phase 1 (Red):   Write test   →  Test FAILS  ✓  (bug is real)
                 ⚠ Zero source code changes allowed

Phase 2 (Green): Implement fix →  Test PASSES ✓  (fix works)
                 ⚠ Zero test file changes allowed
                 ⚠ All existing tests must still pass
```

### Feature Lifecycle

Every feature is tracked in `dark-factory/manifest.json` while active:

```
active → passed → promoted → cleaned up
  │         │         │          │
  │         │         │          └── Artifacts committed to git, then deleted
  │         │         └── Holdout tests in permanent test suite
  │         └── All holdout tests passed
  └── Spec created, awaiting implementation
```

Completed features are removed from the manifest — it only tracks in-progress work. All artifacts are in git history if you ever need them. `/df-cleanup` recovers features stuck in intermediate states.

---

## Project Structure

```
your-project/
├── .claude/
│   ├── agents/                    # 7 agent definitions
│   │   ├── onboard-agent.md       # Maps project + builds code map
│   │   ├── spec-agent.md          # Discovers scope, writes specs
│   │   ├── debug-agent.md         # Root cause analysis + regression risk
│   │   ├── architect-agent.md     # Domain-focused review (security, arch, API)
│   │   ├── code-agent.md          # Implements features and fixes
│   │   ├── test-agent.md          # Validates with holdout scenarios
│   │   └── promote-agent.md       # Promotes tests with annotations
│   ├── rules/                     # Auto-detection & pipeline rules
│   │   └── dark-factory.md
│   ├── settings.json              # Auto-approved tool permissions
│   └── skills/                    # 8 slash commands
│       ├── df/SKILL.md            # Unified entry (auto-routes)
│       ├── df-onboard/SKILL.md
│       ├── df-intake/SKILL.md
│       ├── df-debug/SKILL.md
│       ├── df-orchestrate/SKILL.md
│       ├── df-spec/SKILL.md
│       ├── df-scenario/SKILL.md
│       └── df-cleanup/SKILL.md
├── dark-factory/
│   ├── project-profile.md         # Project map (from /df-onboard)
│   ├── code-map.md                # Dependency graph, hotspots, entry points
│   ├── code-map.mermaid           # Visual dependency diagram (for humans)
│   ├── manifest.json              # Feature lifecycle tracking
│   ├── specs/features/            # Feature specs (temporary)
│   ├── specs/bugfixes/            # Debug reports (temporary)
│   ├── scenarios/public/          # Visible to code-agent
│   ├── scenarios/holdout/         # Hidden from code-agent
│   └── results/                   # Test output (gitignored)
└── CLAUDE.md                      # Your project instructions (untouched)
```

---

## Design Decisions

**Why a deep code map?** — Agents that understand module dependencies, shared hotspots, and entry point traces make better decisions. Spec-agents estimate scope accurately, architects evaluate blast radius precisely, debug-agents trace call chains faster. The code map is built by parallel scanner agents (one per source directory) and summarized for agent consumption.

**Why git worktree isolation?** — Each spec implementation runs in its own [git worktree](https://git-scm.com/docs/git-worktree). When you run `/df-orchestrate --group my-feature`, Dark Factory resolves dependencies into waves and runs independent specs in parallel worktrees. Foundation specs complete and merge first; dependent specs get fresh worktrees from the updated code.

**Why group orchestration?** — Large features decompose into multiple specs. `--group` ensures every spec is implemented, with dependency-aware wave ordering and resume after failure. `--all` runs everything pending. No spec gets forgotten.

**Why massive parallelism?** — Speed without cutting corners. Within a single spec: 3 spec leads, 3 debug investigators, 1-4 code-agents. Across specs: wave-based parallel worktrees. During onboarding: parallel scanner agents per directory.

**Why 3 parallel leads/investigators?** — A single agent has blind spots. Three agents with different lenses catch more issues and produce a more complete spec.

**Why holdout scenarios?** — Without them, the AI writes code and tests from the same understanding. The code-agent must implement correctly to pass tests it's never seen.

**Why parallel domain review for every spec?** — Quality is non-negotiable. 3 domain-focused reviews (security, architecture, API) in parallel. Same depth, 1/3 the wall-clock time.

**Why regression prevention?** — Bugs that come back after being "fixed" erode trust. Systemic analysis finds similar patterns, variant tests cover multiple paths to the root cause, and promoted test annotations preserve institutional knowledge.

**Why auto-approved permissions?** — Dark Factory sets up `.claude/settings.json` during onboarding with tool permissions so spawned agents run without interrupting the developer for Edit/Write/Bash approval.

**Why strict red-green for bugs?** — The most dangerous AI bug fix changes the test to match the broken behavior. Dark Factory enforces: write the test first (no code changes), then fix the code (no test changes).

**Why `.claude/rules/` instead of CLAUDE.md?** — Dark Factory instructions load automatically from `.claude/rules/dark-factory.md` without touching your project's `CLAUDE.md`.

**Why a Claude Code plugin?** — Install once with `/plugin install`, get Dark Factory across all your projects with auto-updates.

---

## Contributing

Contributions welcome. The test suite is the source of truth — if the tests pass, the pipeline is intact.

```bash
node --test tests/dark-factory-setup.test.js
```

## License

MIT
