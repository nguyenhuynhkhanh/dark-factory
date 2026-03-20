# Dark Factory

**Autonomous, production-grade software development with Claude Code.**

Dark Factory is an open-source multi-agent pipeline that turns Claude Code into a team of specialists — a BA who discovers scope, a principal engineer who reviews architecture, a developer who implements, and a QA who validates against hidden test scenarios. No agent can cut corners because no agent has the full picture.

> Inspired by [The Dark Factory Pattern](https://hackernoon.com/the-dark-factory-pattern-moving-from-ai-assisted-to-fully-autonomous-coding) — moving from AI-assisted to fully autonomous coding.

```
                          ┌─────────────┐
  /df-onboard      ──────▶│   Onboard   │──▶ project-profile.md
                          └─────────────┘
                          ┌─────────────┐     ┌───────────────┐
  /df-intake       ──────▶│  Spec Agent │────▶│   Architect   │──▶ APPROVED
                          │  (BA)       │◀────│  (Principal)  │    │
                          └─────────────┘  3+ │   3+ rounds   │    │
                                           rounds └──────────────┘    ▼
                          ┌─────────────┐     ┌─────────────┐   ┌──────────┐
                          │ Code Agent  │────▶│ Test Agent  │──▶│ Promote  │──▶ Archive
                          │ (Dev)       │◀────│ (QA)        │   │ + Archive│
                          └─────────────┘  max└─────────────┘   └──────────┘
                                           3 rounds
```

## Why Dark Factory?

**The problem**: AI coding assistants write code fast, but fast code on a flawed spec is fast failure. They skip architecture review, miss security concerns, and can't validate their own work honestly — they wrote both the code and the tests.

**The solution**: Separate concerns into independent agents with strict information barriers:

| What goes wrong without it | How Dark Factory prevents it |
|---|---|
| AI guesses the scope instead of asking | Spec-agent runs a structured discovery — asks focused questions, proposes IN/OUT scope, waits for confirmation |
| AI skips architecture review | Architect-agent reviews every spec for security, performance, data integrity — 3+ rounds of refinement before any code |
| AI writes tests that match its own implementation | Test-agent uses **holdout scenarios** the code-agent has never seen — can't teach to the test |
| Bug fixes that mask symptoms | Debug-agent traces root cause forensically; code-agent must write a failing test FIRST (proves the bug), then fix WITHOUT changing the test |
| AI doesn't understand the existing codebase | Onboard-agent maps architecture, conventions, and quality bar before any work begins |
| Specs and test artifacts pile up forever | Auto-promote holdout tests into permanent suite, then archive artifacts |

## Quick Start

### Prerequisites

- [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) installed and authenticated
- Node.js 18+

### Install into an existing project

```bash
# From your project root
npx dark-factory init

# Or clone and run manually
git clone https://github.com/user/dark-factory.git /tmp/dark-factory
node /tmp/dark-factory/scripts/init-dark-factory.js --dir .
```

This creates the `.claude/agents/`, `.claude/skills/`, and `dark-factory/` directories in your project.

### Install with Claude Code CLI

If you're using Claude Code's built-in installer:

```bash
# Install Claude Code if you haven't
npm install -g @anthropic-ai/claude-code

# Navigate to your project
cd your-project

# Run the Dark Factory init script
node path/to/dark-factory/scripts/init-dark-factory.js --dir .

# Start Claude Code — skills are auto-discovered
claude
```

Claude Code automatically discovers the `/df-*` slash commands from `.claude/skills/`.

### Verify installation

```bash
# Run the test suite (Node.js built-in test runner, no dependencies)
node --test path/to/dark-factory/tests/dark-factory-setup.test.js
```

113 tests verify all agents, skills, information barriers, and pipeline integrity.

## Usage

### Step 0: Onboard (run once per project)

```
/df-onboard
```

Maps your project's tech stack, architecture, conventions, and quality bar into `dark-factory/project-profile.md`. Every agent reads this before starting work. Handles greenfield, well-structured, and messy codebases.

### Add a Feature

```
/df-intake I need an API endpoint that lets users export their data as CSV
```

The pipeline:
1. **Spec-agent** researches the codebase, asks you focused questions, proposes scope (IN/OUT), writes a detailed spec + test scenarios
2. You review holdout scenarios in `dark-factory/scenarios/holdout/`
3. **`/df-orchestrate user-csv-export`** — architect reviews (3+ rounds), then code-agent implements, test-agent validates against hidden scenarios
4. On success: holdout tests are promoted into your permanent test suite, artifacts are archived

### Fix a Bug

```
/df-debug Users get 500 errors when exporting CSV with special characters in the filename
```

The pipeline:
1. **Debug-agent** traces execution path, identifies root cause (not just the symptom), maps impact/blast radius, writes a debug report
2. You confirm the diagnosis
3. **`/df-orchestrate csv-special-chars-fix`** — architect reviews fix approach, then strict red-green cycle:
   - Code-agent writes a failing test that **proves** the bug exists (no source code changes)
   - Code-agent implements the minimal fix (no test changes)
   - Verification: failing test now passes, all existing tests still pass
4. Holdout validation, promote, archive

### Maintenance

```
/df-cleanup
```

Retries stuck promotions, completes archival, lists stale features.

## The 7 Agents

| Agent | Role | Analogy |
|-------|------|---------|
| **Onboard** | Maps the project before any work begins | New team lead's first week |
| **Spec** | Discovers scope, challenges assumptions, writes specs | Senior BA who asks hard questions |
| **Debug** | Forensic root cause analysis, impact assessment | The engineer who reads stack traces for breakfast |
| **Architect** | Reviews specs for architecture, security, performance | Principal engineer who blocks bad designs |
| **Code** | Implements features and fixes | Senior dev who follows the spec exactly |
| **Test** | Validates with hidden scenarios | QA who writes tests the dev has never seen |
| **Promote** | Moves holdout tests into permanent test suite | Release engineer |

## Information Barriers

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

**Why this matters**: The code-agent can't "teach to the test" because it never sees the holdout scenarios. The architect can't compromise test coverage because it never sees tests at all. The test-agent can't soften its validation because it doesn't know what the code-agent was told to build.

## Bugfix Integrity: Red-Green Cycle

Dark Factory enforces a strict discipline for bug fixes that prevents the most common AI failure mode: fixing the symptom instead of the root cause.

```
Phase 1 (Red):   Write test   →  Test FAILS  ✓  (bug is real)
                 ⚠ Zero source code changes allowed

Phase 2 (Green): Implement fix →  Test PASSES ✓  (fix works)
                 ⚠ Zero test file changes allowed
                 ⚠ All existing tests must still pass
```

If the test doesn't fail in Phase 1, the test is wrong — not the bug. If existing tests break in Phase 2, the fix has regression — revise the fix, not the tests.

## Feature Lifecycle

Every feature is tracked in `dark-factory/manifest.json`:

```
active → passed → promoted → archived
  │         │         │          │
  │         │         │          └── Specs + scenarios in dark-factory/archive/
  │         │         └── Holdout tests in permanent test suite
  │         └── All holdout tests passed
  └── Spec created, awaiting implementation
```

`/df-cleanup` recovers features stuck in intermediate states.

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
│   └── skills/                    # 7 slash commands
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
│   ├── results/                   # Test output (gitignored)
│   └── archive/                   # Completed feature artifacts
└── CLAUDE.md                      # Project instructions (auto-updated)
```

## Configuration

The init script auto-detects your project type:

```bash
# Auto-detect (default)
node scripts/init-dark-factory.js --dir .

# Force a project type
node scripts/init-dark-factory.js --dir . --project-type nestjs
node scripts/init-dark-factory.js --dir . --project-type node
node scripts/init-dark-factory.js --dir . --project-type generic

# Scaffold a first feature
node scripts/init-dark-factory.js --dir . --feature user-auth
```

Supported project types affect the agent prompts (e.g., NestJS agents know about modules, decorators, and DTOs).

## Commands Reference

| Command | What it does |
|---------|-------------|
| `/df-onboard` | Map project architecture, conventions, quality bar |
| `/df-intake {desc}` | Create feature spec (discovers scope, writes scenarios) |
| `/df-debug {desc}` | Investigate bug (root cause, impact, debug report) |
| `/df-orchestrate {name}` | Implement (architect review → code → test → promote → archive) |
| `/df-cleanup` | Recover stuck features, list stale work |
| `/df-spec` | Show spec templates for manual writing |
| `/df-scenario` | Show scenario templates for manual writing |

## Testing

```bash
# Run all 113 tests (no dependencies — uses Node.js built-in test runner)
node --test tests/dark-factory-setup.test.js
```

Tests verify:
- All 7 agents and 7 skills exist with valid frontmatter
- Information barriers are enforced in every agent definition
- Pipeline routing (features → spec-agent, bugs → debug-agent)
- Architect review gate (3+ rounds, APPROVED/BLOCKED flow)
- Bugfix red-green integrity constraints
- Promote/archive lifecycle
- Init script scaffold (creates all files, idempotent)
- Project onboarding (agents reference profile, orchestrator checks for it)

## Design Decisions

**Why holdout scenarios?** — Without them, the AI writes code and tests from the same understanding. Holdout scenarios are written by the spec-agent (who understands the requirements) and validated by the test-agent (who never talks to the code-agent). The code-agent must implement correctly to pass tests it's never seen.

**Why architect review?** — A spec written by a BA may miss performance concerns, security gaps, or architectural inconsistencies. The architect-agent reviews every spec with principal-engineer rigor — but is banned from seeing tests, so it can't influence what gets tested.

**Why strict red-green for bugs?** — The most dangerous AI bug fix is one that makes the test pass by changing the test. Dark Factory enforces: write the test first (Phase 1, no code changes allowed), then fix the code (Phase 2, no test changes allowed). If the test doesn't fail, the test is wrong.

**Why project onboarding?** — An AI dropped into an unknown codebase will follow "best practices" instead of "this project's practices." The onboard-agent maps reality — messy or clean — so every agent works WITH the existing patterns instead of against them.

**Why auto-promote and archive?** — Dark Factory artifacts (specs, scenarios) accumulate forever. After holdout tests pass, they're automatically promoted into the permanent test suite (preserving regression coverage) and artifacts are archived.

## Contributing

Contributions welcome. The test suite is the source of truth — if the tests pass, the pipeline is intact.

```bash
# Run tests before submitting
node --test tests/dark-factory-setup.test.js
```

## License

MIT
