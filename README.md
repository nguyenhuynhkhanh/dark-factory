# Dark Factory

**Specs in, production-grade features out.**

Dark Factory is an open-source multi-agent framework for Claude Code. Feed it a raw idea or a bug report — it assembles a team of AI specialists (BA, principal engineer, developer, QA) who research, challenge, implement, and validate autonomously. No agent can cut corners because no agent has the full picture.

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

---

## Quick Start

**Prerequisites**: [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) installed + Node.js 18+

```bash
npx dark-factory init
```

Then open Claude Code and run `/df-onboard` to map your project.

To update to the latest version later:

```bash
npx dark-factory update
```

---

## Usage

### 1. Onboard your project (once)

```
/df-onboard
```

Maps your tech stack, architecture, conventions, and quality bar into `dark-factory/project-profile.md`. Every agent reads this before starting work.

### 2. Add a feature

```
/df-intake I need an API endpoint that lets users export their data as CSV
```

1. **Spec-agent** researches the codebase, asks focused questions, proposes scope (IN/OUT), writes spec + scenarios
2. You review holdout scenarios in `dark-factory/scenarios/holdout/`
3. `/df-orchestrate user-csv-export` — architect reviews (3+ rounds), code-agent implements, test-agent validates
4. On success: holdout tests promoted into your permanent test suite, artifacts archived

### 3. Fix a bug

```
/df-debug Users get 500 errors when exporting CSV with special characters in the filename
```

1. **Debug-agent** traces root cause (not just the symptom), maps impact, writes debug report
2. You confirm the diagnosis
3. `/df-orchestrate csv-special-chars-fix` — architect reviews, then strict red-green cycle:
   - Write a failing test that **proves** the bug (no source code changes)
   - Implement the minimal fix (no test changes)
   - Failing test now passes, all existing tests still pass
4. Holdout validation, promote, archive

### 4. Maintenance

```
/df-cleanup
```

Retries stuck promotions, completes archival, lists stale features.

---

## Why Dark Factory?

AI coding assistants write code fast, but fast code on a flawed spec is fast failure. They skip architecture review, miss security concerns, and can't validate their own work honestly — they wrote both the code and the tests.

Dark Factory separates concerns into independent agents with strict information barriers:

| What goes wrong without it | How Dark Factory prevents it |
|---|---|
| AI guesses the scope instead of asking | Spec-agent runs structured discovery — asks focused questions, proposes IN/OUT scope, waits for confirmation |
| AI skips architecture review | Architect-agent reviews every spec for security, performance, data integrity — 3+ rounds before any code |
| AI writes tests that match its own implementation | Test-agent uses **holdout scenarios** the code-agent has never seen — can't teach to the test |
| Bug fixes that mask symptoms | Debug-agent traces root cause forensically; code-agent must write a failing test FIRST, then fix WITHOUT changing the test |
| AI doesn't understand the existing codebase | Onboard-agent maps architecture, conventions, and quality bar before any work begins |
| Specs and test artifacts pile up forever | Auto-promote holdout tests into permanent suite, then archive artifacts |

---

## How It Works

### The 7 Agents

| Agent | Role | Analogy |
|-------|------|---------|
| **Onboard** | Maps the project before any work begins | New team lead's first week |
| **Spec** | Discovers scope, challenges assumptions, writes specs | Senior BA who asks hard questions |
| **Debug** | Forensic root cause analysis, impact assessment | The engineer who reads stack traces for breakfast |
| **Architect** | Reviews specs for architecture, security, performance | Principal engineer who blocks bad designs |
| **Code** | Implements features and fixes | Senior dev who follows the spec exactly |
| **Test** | Validates with hidden scenarios | QA who writes tests the dev has never seen |
| **Promote** | Moves holdout tests into permanent test suite | Release engineer |

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

Dark Factory enforces strict discipline that prevents the most common AI failure mode: fixing the symptom instead of the root cause.

```
Phase 1 (Red):   Write test   →  Test FAILS  ✓  (bug is real)
                 ⚠ Zero source code changes allowed

Phase 2 (Green): Implement fix →  Test PASSES ✓  (fix works)
                 ⚠ Zero test file changes allowed
                 ⚠ All existing tests must still pass
```

If the test doesn't fail in Phase 1, the test is wrong — not the bug. If existing tests break in Phase 2, the fix has regression — revise the fix, not the tests.

### Feature Lifecycle

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

---

## Reference

### Commands

| Command | What it does |
|---------|-------------|
| `/df-onboard` | Map project architecture, conventions, quality bar |
| `/df-intake {desc}` | Create feature spec (discovers scope, writes scenarios) |
| `/df-debug {desc}` | Investigate bug (root cause, impact, debug report) |
| `/df-orchestrate {name}` | Implement (architect review → code → test → promote → archive) |
| `/df-cleanup` | Recover stuck features, list stale work |
| `/df-spec` | Show spec templates for manual writing |
| `/df-scenario` | Show scenario templates for manual writing |

### Project Structure

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

### Configuration

The init script auto-detects your project type:

```bash
# Force a project type
node scripts/init-dark-factory.js --dir . --project-type nestjs
node scripts/init-dark-factory.js --dir . --project-type node
node scripts/init-dark-factory.js --dir . --project-type generic

# Scaffold a first feature
node scripts/init-dark-factory.js --dir . --feature user-auth
```

Supported project types affect agent prompts (e.g., NestJS agents know about modules, decorators, and DTOs).

---

## Design Decisions

**Why holdout scenarios?** — Without them, the AI writes code and tests from the same understanding. Holdout scenarios are written by the spec-agent (who understands the requirements) and validated by the test-agent (who never talks to the code-agent). The code-agent must implement correctly to pass tests it's never seen.

**Why architect review?** — A spec written by a BA may miss performance concerns, security gaps, or architectural inconsistencies. The architect-agent reviews every spec with principal-engineer rigor — but is banned from seeing tests, so it can't influence what gets tested.

**Why strict red-green for bugs?** — The most dangerous AI bug fix is one that makes the test pass by changing the test. Dark Factory enforces: write the test first (Phase 1, no code changes allowed), then fix the code (Phase 2, no test changes allowed). If the test doesn't fail, the test is wrong.

**Why project onboarding?** — An AI dropped into an unknown codebase will follow "best practices" instead of "this project's practices." The onboard-agent maps reality — messy or clean — so every agent works WITH the existing patterns instead of against them.

**Why auto-promote and archive?** — Dark Factory artifacts (specs, scenarios) accumulate forever. After holdout tests pass, they're automatically promoted into the permanent test suite (preserving regression coverage) and artifacts are archived.

---

## Contributing

Contributions welcome. The test suite is the source of truth — if the tests pass, the pipeline is intact.

```bash
# Run all tests (no dependencies — uses Node.js built-in test runner)
node --test tests/dark-factory-setup.test.js
```

## License

MIT
