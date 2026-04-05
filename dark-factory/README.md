# Dark Factory

Specs in, production-grade features out. A multi-agent framework for Claude Code that turns raw ideas into implemented, tested, and validated code. Inspired by the [Dark Factory pattern](https://hackernoon.com/the-dark-factory-pattern-moving-from-ai-assisted-to-fully-autonomous-coding).

## What is Dark Factory?

Dark Factory separates software development into independent phases with strict information barriers between agents. It has **two distinct pipelines**:

### Onboarding (run once)
0. **Onboard Agent** (Project Cartographer) — Maps the project's architecture, conventions, tech stack, quality bar, and structural issues. Produces `project-profile.md` (enriched with section-targeted content for each agent type) and `code-map.md` (deep structural analysis via parallel scanners). Also configures `.claude/settings.json` for autonomous agent permissions.

### Feature Pipeline
1. **Spec Agent** (Business Analyst) — 3 parallel leads discover scope from user, architecture, and reliability perspectives. Smart decomposition splits large features into smaller specs with dependency ordering.
2. **Architect Agent** (Principal Engineer) — 3 parallel domain-focused reviews (security, architecture, API) for every spec. Findings forwarded to code-agents as implementation context.
3. **Code Agent** (Developer) — Implements using spec, public scenarios, architect findings, and code map context. Up to 4 parallel tracks per spec.
4. **Test Agent** (QA) — Validates with holdout scenarios the code-agent never sees.
5. **Promote Agent** — Moves holdout tests to permanent suite with structured annotations (root cause, guarded locations).

### Bugfix Pipeline
1. **Debug Agent** (Forensic Investigator) — 3 parallel investigators trace root cause, search for systemic patterns, produce regression risk assessment with variant scenarios.
2. **Architect Agent** — Same parallel domain review. Evaluates regression risk depth and root-cause vs symptom distinction.
3. **Code Agent** (Surgeon) — Strict red-green cycle. Tests target root cause CLASS, not symptoms. Variant tests proportional to risk.
4. **Test Agent** (QA) — Validates with holdout scenarios.
5. **Promote Agent** — Annotates promoted tests with root cause pattern and guarded code.

### Group Orchestration
- **`--group {name}`** — Implement all specs in a feature group with dependency-aware wave execution
- **`--all`** — Implement every pending spec across all groups, independent groups in parallel
- **Resume** — Re-run after failure, completed specs skipped automatically
- **Failure isolation** — Failed specs pause dependents, independent specs continue

## Deep Code Map

Built during onboarding by **parallel scanner agents** (one per source directory):

- **Module dependency graph** — which modules import from which
- **Entry point traces** — route → controller → service → repository → database
- **Shared dependency hotspots** — modules with high fan-in (blast radius) and fan-out (fragility)
- **Interface/contract boundaries** — what each module exports
- **Cross-cutting concerns** — middleware, decorators, base classes
- **Circular dependencies** — detected and flagged
- **Mermaid diagram** — visual dependency graph for humans (`code-map.mermaid`)

Smart scanning: skip libraries, generated code, binaries. Tech-stack-aware import detection (JS/TS, Python, Go, Java, Rust).

## Regression Prevention

- **Systemic analysis** — search for the same vulnerable pattern across the codebase
- **Regression risk assessment** — isolated vs systemic vs shared-code classification
- **Root cause depth** — immediate cause vs deeper enabling pattern
- **Variant scenarios** — proportional to risk (HIGH: 3-5, MEDIUM: 1-2, LOW: reproduction only)
- **Promoted test annotations** — root cause, guarded code, bug reference

## Information Barriers

| Agent | Can Read | Cannot Read |
|-------|----------|-------------|
| onboard-agent | Entire codebase, docs, configs | Nothing — full read access (writes profile + code map) |
| spec-agent | Profile, code map (hotspots, deps), codebase | Holdout results, code-agent output |
| debug-agent | Profile, code map (entry points, deps), codebase, git | Holdout from other features |
| architect-agent | Profile, code map (full), spec/report, codebase | ALL scenarios (public + holdout) |
| code-agent | Profile, code map (entry points, contracts), spec, public scenarios, architect findings | Holdout scenarios, results |
| test-agent | Profile, code map (entry points, hotspots), spec, holdout scenarios | Public scenarios |
| promote-agent | Profile, code map (hotspots), results, test conventions | Source code modification |

## Commands

| Command | What it does |
|---------|-------------|
| `/df {description}` | Auto-detect bug vs feature, route to right pipeline |
| `/df-onboard` | Map project + build code map + configure permissions |
| `/df-intake {desc}` | Create feature spec (3 parallel leads, smart decomposition) |
| `/df-debug {desc}` | Investigate bug (3 parallel investigators, systemic analysis) |
| `/df-orchestrate {name}` | Implement a single spec |
| `/df-orchestrate --group {name}` | Implement all specs in a feature group (wave-based) |
| `/df-orchestrate --all` | Implement all pending specs |
| `/df-cleanup` | Recover stuck features, verify promoted test health |
| `/df-spec` | Show spec templates |
| `/df-scenario` | Show scenario templates |

## Directory Structure

```
dark-factory/
├── project-profile.md                 # Project map (section-targeted for each agent)
├── code-map.md                        # Dependency graph, hotspots, entry points
├── code-map.mermaid                   # Visual diagram (for humans)
├── manifest.json                      # Feature lifecycle tracking (active only)
├── specs/
│   ├── features/{name}.spec.md        # Feature specs (temporary)
│   └── bugfixes/{name}.spec.md        # Debug reports (temporary)
├── scenarios/
│   ├── public/{name}/                 # Visible to code-agent
│   └── holdout/{name}/                # Hidden from code-agent
└── results/{name}/                    # Test output (gitignored)
```

## Feature Lifecycle

```
active → passed → promoted → cleaned up (removed from manifest)
```

All artifacts committed to git before deletion. Git history is the permanent archive. `/df-cleanup` recovers stuck states.

## License

MIT
