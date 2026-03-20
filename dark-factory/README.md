# Dark Factory

Specs in, production-grade features out. A multi-agent framework for Claude Code that turns raw ideas into implemented, tested, and validated code. Inspired by the [Dark Factory pattern](https://hackernoon.com/the-dark-factory-pattern-moving-from-ai-assisted-to-fully-autonomous-coding).

## What is Dark Factory?

Dark Factory separates software development into independent phases with strict information barriers between agents. It has **two distinct pipelines**:

### Onboarding (run once)
0. **Onboard Agent** (Project Cartographer) — Maps the project's architecture, conventions, tech stack, quality bar, and structural issues. Produces `dark-factory/project-profile.md` that all other agents reference.

### Feature Pipeline
1. **Spec Agent** (Business Analyst) — Discovers scope, challenges assumptions, produces a detailed spec with comprehensive test scenarios
2. **Architect Agent** (Principal Engineer) — Reviews spec for architecture, security, performance, production-readiness. Drives 3+ rounds of refinement with the spec-agent before any code is written.
3. **Code Agent** (Developer) — Implements the feature using only the spec and public scenarios
4. **Test Agent** (QA) — Validates the implementation using holdout scenarios that the code agent never sees

### Bugfix Pipeline
1. **Debug Agent** (Forensic Investigator) — Traces root cause, assesses impact, writes debug report with regression scenarios
2. **Architect Agent** (Principal Engineer) — Reviews fix approach, blast radius, systemic patterns. Drives 3+ rounds of refinement with the debug-agent.
3. **Code Agent** (Surgeon) — Writes a failing test that proves the bug, then implements the minimal fix in a strict red-green cycle
4. **Test Agent** (QA) — Validates with holdout scenarios

This separation ensures no code is written on a flawed foundation. The architect catches what the BA/investigator missed, and the code agent can't "teach to the test."

## Feature Architecture

```
Developer Input (feature)
      │
      ▼
┌─────────────┐
│  Spec Agent  │  Discovers scope, writes spec + ALL scenarios
│  (BA role)   │  Challenges assumptions, proposes IN/OUT scope
└──────┬──────┘
       │
  Lead reviews holdout scenarios
       │
       ▼
┌─────────────────┐
│ Architect Agent  │  Reviews architecture, security, performance
│ (Principal Eng)  │  3+ rounds of refinement with spec-agent
│                  │  ⚠ NEVER sees or discusses tests/scenarios
└──────┬──────────┘
       │ APPROVED
       ▼
┌─────────────┐     ┌─────────────┐
│  Code Agent  │────▶│  Test Agent  │
│  (Dev role)  │     │  (QA role)   │
│              │     │              │
│  Sees: spec, │     │  Sees: spec, │
│  public      │     │  holdout     │
│  scenarios   │     │  scenarios   │
└──────┬──────┘     └──────┬──────┘
       │                    │
       │◀── failure ───────┘
       │    (behavioral summary only)
       ▼
   Max 3 rounds → Promote → Archive
```

## Bugfix Architecture

```
Developer Input (bug)
      │
      ▼
┌──────────────┐
│ Debug Agent  │  Root cause analysis, impact assessment
│ (Forensic)   │  Writes debug report + regression scenarios
└──────┬───────┘
       │
  Developer confirms diagnosis
       │
       ▼
┌─────────────────┐
│ Architect Agent  │  Reviews fix approach, blast radius,
│ (Principal Eng)  │  systemic patterns. 3+ rounds with debug-agent.
│                  │  ⚠ NEVER sees or discusses tests/scenarios
└──────┬──────────┘
       │ APPROVED
       ▼
┌──────────────┐
│  Code Agent  │  Step 1: Write failing test (PROVES bug)
│  (Red phase) │  ⚠ NO source code changes allowed
└──────┬───────┘
       │ Test FAILS ✓ (bug confirmed)
       ▼
┌──────────────┐
│  Code Agent  │  Step 2: Implement minimal fix
│  (Green      │  ⚠ NO test file changes allowed
│   phase)     │  ⚠ All existing tests must still pass
└──────┬───────┘
       │ Test PASSES ✓ (fix works)
       ▼
┌──────────────┐
│  Test Agent  │  Holdout validation (regression scenarios)
│  (QA role)   │
└──────┬───────┘
       │
       ▼
   Promote → Archive
```

## Information Barriers

| Agent | Can Read | Cannot Read |
|-------|----------|-------------|
| onboard-agent | Entire codebase, docs, configs, deps | Nothing — full read access (write only to project-profile.md) |
| spec-agent | Project profile, codebase, docs, specs | Holdout results, code-agent output |
| debug-agent | Project profile, codebase, docs, git history | Holdout from other features, results |
| architect-agent | Project profile, spec/report, codebase | ALL scenarios (public + holdout), results |
| code-agent | Project profile, spec/report, public scenarios | Holdout scenarios, results |
| test-agent | Spec/report, holdout scenarios, code | Public scenarios |
| promote-agent | Results, test conventions, CLAUDE.md | Source code (read-only for conventions) |

## Directory Structure

```
dark-factory/
├── README.md                          # This file
├── project-profile.md                 # Project map (from /df-onboard)
├── manifest.json                      # Feature lifecycle tracking
├── specs/
│   ├── features/                      # Feature specs
│   │   └── {name}.spec.md
│   └── bugfixes/                      # Bug report specs
│       └── {name}.spec.md
├── scenarios/
│   ├── public/                        # Visible to code-agent
│   │   └── {name}/
│   │       ├── scenario-01.md
│   │       └── scenario-02.md
│   └── holdout/                       # Hidden from code-agent
│       └── {name}/
│           ├── holdout-01.md
│           └── holdout-02.md
├── results/                           # Test output (gitignored)
│   └── {name}/
│       ├── holdout-tests.spec.ts
│       └── run-{timestamp}.md
└── archive/                           # Archived specs + scenarios
    └── {name}/
        ├── spec.md
        └── scenarios/
            ├── public/
            └── holdout/
```

## Commands

### `/df-onboard`
Map the project's architecture, conventions, and quality bar. **Run this first on any existing project.**

```
/df-onboard
```

The onboard-agent will:
1. Detect the tech stack, framework, and dependencies
2. Map architecture, code patterns, and shared abstractions
3. Assess testing setup and quality bar
4. Flag structural issues (inconsistencies, missing infrastructure, tech debt)
5. Ask you questions about what code can't tell (user scale, deployment, fragile areas)
6. Write `dark-factory/project-profile.md`

All other agents read this profile before starting their work. Re-run after significant project changes.

### `/df-intake {description}`
Start the **feature** spec creation phase. Provide a raw description of what you need.

```
/df-intake I need an API endpoint that lets users export their data as CSV
```

The spec-agent will:
1. Research the codebase for related code
2. Ask focused questions to discover scope (IN/OUT boundaries)
3. Propose a concrete scope and get your confirmation
4. Write a detailed spec with rationale
5. Write public + holdout scenarios

**After intake**: Review the holdout scenarios in `dark-factory/scenarios/holdout/{name}/` before proceeding.

### `/df-debug {description}`
Start the **bug** investigation phase. Describe what's wrong.

```
/df-debug Users are getting 500 errors when exporting CSV with special characters
```

The debug-agent will:
1. Research the codebase and trace the execution path
2. Identify the root cause (not just the symptom)
3. Assess the impact and blast radius of a fix
4. Present findings and proposed fix for your confirmation
5. Write a debug report + regression scenarios

**After investigation**: Review the diagnosis and holdout scenarios before proceeding.

### `/df-orchestrate {name}`
Start the implementation phase for a named spec. Auto-detects feature vs. bugfix mode.

```
/df-orchestrate user-csv-export
```

**Both modes start with architect review:**
1. Architect-agent reviews spec for architecture, security, performance, production-readiness
2. 3+ rounds of refinement with the spec/debug agent (NEVER discusses tests)
3. Must be APPROVED before any implementation begins

**Feature mode**: code-agent implements → test-agent validates → iterate (max 3 rounds)

**Bugfix mode** (strict red-green cycle):
1. Code-agent writes failing test (proves bug exists, NO source code changes)
2. Code-agent implements minimal fix (NO test changes)
3. Verify: failing test passes, all existing tests pass
4. Test-agent validates with holdout scenarios

Both modes → promote holdout tests → archive on success.

### `/df-cleanup`
Recovery and maintenance. Reads `dark-factory/manifest.json` and:
- Retries stuck promotions (status: `passed`)
- Completes stuck archival (status: `promoted`)
- Lists stale active features (older than 7 days)

### `/df-spec`
Show spec templates for manual writing.

### `/df-scenario`
Show scenario templates for manual writing.

## How to Add a New Feature

0. **Onboard first** (if not done): `/df-onboard` — maps the project so agents understand conventions
1. **Start intake**: `/df-intake {your feature description}`
2. **Answer questions**: The spec-agent will ask clarifying questions to discover scope
3. **Review**: Check the spec in `dark-factory/specs/features/`
4. **Review holdouts**: Check `dark-factory/scenarios/holdout/{name}/` — add/edit scenarios
5. **Implement**: `/df-orchestrate {name}` — architect reviews first (3+ rounds), then code-agent implements
6. **Check results**: Review any failures, iterate if needed

## How to Report a Bug

0. **Onboard first** (if not done): `/df-onboard` — maps the project so agents understand the codebase
1. **Start investigation**: `/df-debug {description of what's wrong}`
2. **Provide details**: The debug-agent will trace the root cause and ask for confirmation
3. **Review diagnosis**: Check the debug report in `dark-factory/specs/bugfixes/`
4. **Review holdouts**: Check regression scenarios in `dark-factory/scenarios/holdout/{name}/`
5. **Fix**: `/df-orchestrate {name}` — architect reviews fix approach first, then strict red-green cycle

## Feature Lifecycle

Each feature tracked in `dark-factory/manifest.json` transitions through these statuses:

| Status | Meaning |
|--------|---------|
| `active` | Spec created, awaiting implementation |
| `passed` | All holdout tests passed, awaiting promotion |
| `promoted` | Tests promoted to permanent suite, awaiting archive |
| `archived` | Specs + scenarios archived, lifecycle complete |

Use `/df-cleanup` to diagnose and fix features stuck in intermediate states.

## Key Principles

- **Spec-first**: Always build a good spec (features) or debug report (bugs) before any code is written
- **Architect review**: Every spec passes principal engineer review (3+ rounds) before implementation — architecture, security, performance, production-readiness
- **Discovery over speed**: For bugs, understanding the root cause and impact is more important than a fast fix
- **Fully decoupled**: Spec/debug and implementation are never auto-triggered
- **Independent agents**: Every agent spawn is fresh — no shared state between runs
- **Information barriers**: Architect never sees tests. Code-agent never sees holdout. Each agent has strict access boundaries.
- **Red-green integrity**: Bugfixes enforce strict separation — write failing test first, then fix without touching tests
- **Human in the loop**: Lead reviews holdout scenarios and confirms diagnoses before orchestration
