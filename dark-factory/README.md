# Dark Factory

A spec-first, three-agent pipeline for autonomous feature development and bug fixing. Inspired by the [Dark Factory pattern](https://hackernoon.com/the-dark-factory-pattern-moving-from-ai-assisted-to-fully-autonomous-coding).

## What is Dark Factory?

Dark Factory separates software development into three independent phases with strict information barriers between agents:

1. **Spec Agent** (Business Analyst) — Researches the codebase, interviews the developer, and produces a detailed spec with comprehensive test scenarios
2. **Code Agent** (Developer) — Implements the feature using only the spec and public scenarios
3. **Test Agent** (QA) — Validates the implementation using holdout scenarios that the code agent never sees

This separation ensures the code agent can't "teach to the test" — it must implement the spec correctly to pass scenarios it has never seen.

## Three-Agent Architecture

```
Developer Input
      │
      ▼
┌─────────────┐
│  Spec Agent  │  Writes spec + ALL scenarios (public + holdout)
│  (BA role)   │  Can ask developer questions
└──────┬──────┘
       │
  Lead reviews holdout scenarios
       │
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
       │    summary
       │    (behavioral,
       │     no holdout
       │     content)
       ▼
   Max 3 rounds
```

## Information Barriers

| Agent | Can Read | Cannot Read |
|-------|----------|-------------|
| spec-agent | Codebase, docs, existing specs | Holdout results, code-agent output |
| code-agent | Spec, public scenarios, codebase | Holdout scenarios, results |
| test-agent | Spec, holdout scenarios, implemented code | Public scenarios |

## Directory Structure

```
dark-factory/
├── README.md                          # This file
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
└── results/                           # Test output (gitignored)
    └── {name}/
        ├── holdout-tests.spec.ts
        └── run-{timestamp}.md
```

## Commands

### `/df-intake {description}`
Start the spec creation phase. Provide a raw description of what you need.

```
/df-intake I need an API endpoint that lets users export their data as CSV
```

The spec-agent will:
1. Research the codebase for related code
2. Ask you clarifying questions
3. Write a detailed spec
4. Write public scenarios (visible to code-agent)
5. Write holdout scenarios (hidden from code-agent)

**After intake**: Review the holdout scenarios in `dark-factory/scenarios/holdout/{name}/` before proceeding.

### `/df-orchestrate {name}`
Start the implementation phase for a named spec.

```
/df-orchestrate user-csv-export
```

The orchestrator will:
1. Verify spec and scenarios exist
2. Spawn an independent code-agent (reads spec + public scenarios)
3. Spawn an independent test-agent (validates with holdout scenarios)
4. If failures: extract behavioral descriptions, retry (max 3 rounds)

### `/df-spec`
Show spec templates for manual writing.

### `/df-scenario`
Show scenario templates for manual writing.

## How to Add a New Feature

1. **Start intake**: `/df-intake {your feature description}`
2. **Answer questions**: The spec-agent will ask clarifying questions
3. **Review**: Check the spec in `dark-factory/specs/features/`
4. **Review holdouts**: Check `dark-factory/scenarios/holdout/{name}/` — add/edit scenarios
5. **Implement**: `/df-orchestrate {name}`
6. **Check results**: Review any failures, iterate if needed

## How to Report a Bug

1. **Start intake**: `/df-intake Bug: {description of what's wrong}`
2. **Provide details**: The spec-agent will ask about reproduction steps
3. **Review**: Check the spec in `dark-factory/specs/bugfixes/`
4. **Review holdouts**: Check holdout scenarios cover edge cases
5. **Fix**: `/df-orchestrate {name}`

## Key Principles

- **Spec-first**: Always build a good spec before any code is written
- **Fully decoupled**: Spec creation (`/df-intake`) and implementation (`/df-orchestrate`) are never auto-triggered
- **Independent agents**: Every agent spawn is fresh — no shared state between runs
- **Information barriers**: Spec, code, and test agents never share context
- **Human in the loop**: Lead reviews holdout scenarios before orchestration
