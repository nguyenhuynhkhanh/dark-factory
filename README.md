# Dark Factory

**Specs in, production-grade features out.**

Dark Factory is an open-source multi-agent framework for Claude Code. Just describe what you need — it assembles a team of AI specialists who research, challenge, implement, and validate autonomously. No agent can cut corners because no agent has the full picture.

> Inspired by [The Dark Factory Pattern](https://hackernoon.com/the-dark-factory-pattern-moving-from-ai-assisted-to-fully-autonomous-coding) — moving from AI-assisted to fully autonomous coding.

```
                          ┌─────────────┐
  /df-onboard      ──────▶│   Onboard   │──▶ project-profile.md
                          └─────────────┘

                          ┌─────────────────────────┐
  Just describe     ──────▶│  3 Spec/Debug Leads     │──▶ synthesized spec
  what you need           │  (parallel perspectives) │
                          └─────────────────────────┘
                                    │
                          ┌─────────────────────────┐
                          │  Architect Review        │──▶ APPROVED
                          │  (tiered by scope size)  │
                          └─────────────────────────┘
                                    │
                          ┌─────────────┐     ┌─────────────┐
                          │ Code Agents │────▶│ Test Agent  │──▶ Promote → Archive
                          │ (1-4, auto) │◀────│ (unit + e2e)│
                          └─────────────┘  max└─────────────┘
                                           3 rounds
```

---

## Quick Start

**Prerequisites**: [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) installed

### Option A: Claude Code Plugin (recommended)

```bash
claude plugin marketplace add nguyenhuynhkhanh/dark-factory
claude plugin install dark-factory@dark-factory-marketplace
```

Done. Dark Factory is now available across all your projects.

### Option B: npm (per-project)

```bash
npx dark-factory init
```

To update later: `npx dark-factory update`

### Then

Open Claude Code in your project and run `/df-onboard` to map it. After that, just describe what you need — Dark Factory activates automatically.

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
3. **Smart decomposition**: large features are automatically split into smaller, independent specs with declared dependencies — you confirm the split
4. Spec(s) + scenarios written → holdout scenarios shown inline for your review
5. Architect review (tiered by scope size)
6. Implementation in parallel worktrees: each spec gets its own worktree, with up to 4 code-agents per spec → test-agent validates
7. On success: holdout tests promoted into your permanent test suite, artifacts cleaned up (git history is the archive)

**For bugs:**
1. **3 investigators** research in parallel (code path tracer, history detective, pattern analyst)
2. Findings synthesized → you confirm diagnosis → debug report + scenarios written
3. Strict red-green cycle: failing test first (proves bug), then minimal fix (no test changes)
4. Holdout validation, promote tests, cleanup artifacts

### Explicit commands (optional)

| Command | What it does |
|---------|-------------|
| `/df {description}` | Auto-detect bug vs feature, route to right pipeline |
| `/df-onboard` | Map project architecture, conventions, quality bar |
| `/df-intake {desc}` | Create feature spec (3 parallel leads, synthesized) |
| `/df-debug {desc}` | Investigate bug (3 parallel investigators, synthesized) |
| `/df-orchestrate {name} [name2...]` | Implement specs in parallel worktrees (architect review → code → test → promote → cleanup) |
| `/df-cleanup` | Recover stuck features, list stale work |
| `/df-spec` | Show spec templates for manual writing |
| `/df-scenario` | Show scenario templates for manual writing |

---

## Why Dark Factory?

AI coding assistants write code fast, but fast code on a flawed spec is fast failure. They skip architecture review, miss security concerns, and can't validate their own work honestly — they wrote both the code and the tests.

Dark Factory separates concerns into independent agents with strict information barriers:

| What goes wrong without it | How Dark Factory prevents it |
|---|---|
| AI guesses the scope instead of asking | 3 spec-agents research from different perspectives — user, architecture, reliability |
| AI skips architecture review | Architect-agent reviews every spec (tiered by scope — small skips, large gets full parallel review) |
| AI writes tests that match its own implementation | Test-agent uses **holdout scenarios** the code-agent has never seen |
| Bug fixes that mask symptoms | 3 debug-agents investigate from different angles; strict red-green cycle prevents symptom-masking |
| AI doesn't understand the existing codebase | Onboard-agent maps architecture, conventions, and quality bar before any work begins |
| Small changes get stuck in heavy process | Scope-based fast track — small changes skip architect review, test-agent is the safety net |

---

## How It Works

### The 7 Agents

| Agent | Role | How it works |
|-------|------|-------------|
| **Onboard** | Maps the project before any work begins | Analyzes codebase → produces project profile |
| **Spec** (x3) | Discovers scope, challenges assumptions, writes specs | 3 leads research in parallel from different perspectives |
| **Debug** (x3) | Forensic root cause analysis, impact assessment | 3 investigators run in parallel — code path, history, patterns |
| **Architect** | Reviews specs for architecture, security, performance | Tiered by scope; parallel domain review for large changes |
| **Code** (x1-4) | Implements features and fixes | Auto-scaled parallel sessions within a worktree-isolated spec |
| **Test** | Validates with hidden scenarios | Unit tests + Playwright e2e (auto-detected) |
| **Promote** | Moves holdout tests into permanent test suite | Adapts both unit and e2e tests to project conventions |

### Information Barriers

The key innovation. Each agent has **strict boundaries** on what it can see:

```
                    ┌─────────────────────────────────────────────┐
                    │              Project Profile                 │
                    │  (all agents except test/promote can read)   │
                    └─────────────────────────────────────────────┘

    ┌──────────┐          ┌──────────┐          ┌──────────┐
    │   Spec   │          │   Code   │          │   Test   │
    │  Agent   │          │  Agent   │          │  Agent   │
    │          │          │          │          │          │
    │ Sees:    │          │ Sees:    │          │ Sees:    │
    │ codebase │          │ spec,    │          │ spec,    │
    │ docs     │          │ PUBLIC   │          │ HOLDOUT  │
    │          │          │ scenarios│          │ scenarios│
    │ Cannot:  │          │          │          │          │
    │ holdout  │          │ Cannot:  │          │ Cannot:  │
    │ results  │          │ HOLDOUT  │          │ PUBLIC   │
    └──────────┘          │ results  │          │ scenarios│
                          └──────────┘          └──────────┘

    ┌──────────┐
    │Architect │  Can see: spec, codebase, project profile
    │  Agent   │  CANNOT see: ANY scenarios (public or holdout)
    │          │  CANNOT discuss tests with other agents
    └──────────┘
```

The code-agent can't "teach to the test" because it never sees the holdout scenarios. The architect can't compromise test coverage because it never sees tests at all. The test-agent can't soften its validation because it doesn't know what the code-agent was told to build.

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
│   │   ├── onboard-agent.md
│   │   ├── spec-agent.md
│   │   ├── debug-agent.md
│   │   ├── architect-agent.md
│   │   ├── code-agent.md
│   │   ├── test-agent.md
│   │   └── promote-agent.md
│   ├── rules/                     # Auto-detection & pipeline rules
│   │   └── dark-factory.md
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
│   ├── manifest.json              # Feature lifecycle tracking
│   ├── specs/features/            # Feature specs
│   ├── specs/bugfixes/            # Debug reports
│   ├── scenarios/public/          # Visible to code-agent
│   ├── scenarios/holdout/         # Hidden from code-agent
│   └── results/                   # Test output (gitignored)
└── CLAUDE.md                      # Your project instructions (untouched)
```

---

## Design Decisions

**Why git worktree isolation?** — Each spec implementation runs in its own [git worktree](https://git-scm.com/docs/git-worktree) — a separate working directory on an isolated branch. When you run `/df-orchestrate spec-a spec-b spec-c`, Dark Factory analyzes dependencies between specs, groups them into waves, and runs independent specs in parallel worktrees. Foundation specs (e.g., project init, shared data models) complete first; dependent specs wait. Each spec can scale up to 4 internal code-agents, so 3 parallel specs could mean 12 agents running simultaneously.

**Why massive parallelism?** — Speed without cutting corners. Within a single spec: 3 spec leads research in parallel, 3 debug investigators trace different angles, 1-4 code-agents implement different tracks. Across specs: dependency-aware worktree isolation runs independent specs concurrently while respecting ordering constraints.

**Why 3 parallel leads/investigators?** — A single agent has blind spots. Three agents with different lenses (user, architecture, reliability for features; code path, history, patterns for bugs) catch more issues and produce a more complete spec.

**Why holdout scenarios?** — Without them, the AI writes code and tests from the same understanding. Holdout scenarios are written by the spec-agent and validated by the test-agent. The code-agent must implement correctly to pass tests it's never seen.

**Why tiered architect review?** — A one-file change doesn't need the same scrutiny as a 10-file architectural overhaul. Small changes skip review (test-agent is the safety net), medium gets one round, large gets full parallel domain review.

**Why auto-scaled code-agents?** — A large spec with independent tracks can be implemented faster with multiple agents working in parallel. Combined with worktree-level isolation per spec, you can run many implementations concurrently without any conflicts.

**Why unit + Playwright?** — The test-agent auto-detects available test infrastructure and classifies each scenario as unit test, e2e test, or both. If Playwright isn't installed, it suggests it for UI scenarios but doesn't block.

**Why strict red-green for bugs?** — The most dangerous AI bug fix changes the test to match the broken behavior. Dark Factory enforces: write the test first (no code changes), then fix the code (no test changes).

**Why `.claude/rules/` instead of CLAUDE.md?** — Dark Factory instructions load automatically from `.claude/rules/dark-factory.md` without touching your project's `CLAUDE.md`. Your project settings stay clean.

**Why `npx` instead of cloning?** — `npx dark-factory init` copies template files into your project. `npx dark-factory update` refreshes agents/skills/rules without touching your specs or scenarios. No git submodules, no manual copying.

---

## Contributing

Contributions welcome. The test suite is the source of truth — if the tests pass, the pipeline is intact.

```bash
node --test tests/dark-factory-setup.test.js
```

## License

MIT
