# Dark Factory

This project uses the Dark Factory pattern for feature development and bug fixes.

## Available Commands
- **`/df {description}`** — **Just describe what you need.** Auto-detects bug vs feature and routes to the right pipeline. Asks you to confirm if ambiguous.
- `/df-onboard` — Map the project. Produces `dark-factory/project-profile.md` with architecture, conventions, quality bar. **Run this first on any existing project.**
- `/df-intake {description}` — Start **feature** spec creation. Spawns an independent BA agent to research, brainstorm, and write specs + scenarios.
- `/df-debug {description}` — Start **bug** investigation. Spawns an independent debug-agent for forensic root cause analysis, impact assessment, and debug report writing.
- `/df-orchestrate {name}` — Start implementation. Auto-detects feature vs. bugfix mode. Auto-promotes holdout tests and archives on success.
- `/df-cleanup` — Recovery/maintenance. Retries stuck promotions, completes archival, lists stale features.
- `/df-spec` — Show spec templates for manual writing.
- `/df-scenario` — Show scenario templates.

## Onboarding (run once per project)
`/df-onboard` → onboard-agent maps the codebase → produces `dark-factory/project-profile.md` → all agents reference it

## Feature Pipeline
1. **Spec phase** (`/df-intake`): Developer provides raw input → spec-agent discovers scope, challenges, writes spec + all scenarios → DONE
2. **Review**: Lead reviews holdout scenarios in `dark-factory/scenarios/holdout/`
3. **Architect review** (`/df-orchestrate`): Principal engineer reviews spec for architecture, security, performance, production-readiness → 3+ rounds of refinement with spec-agent → APPROVED or BLOCKED
4. **Implementation**: Code-agent implements → test-agent validates with holdout → iterate (max 3 rounds)
5. **Promote**: On success, holdout tests are automatically promoted into the permanent test suite
6. **Archive**: Specs and scenarios are moved to `dark-factory/archive/{name}/`

## Bugfix Pipeline
1. **Investigation** (`/df-debug`): Developer reports bug → debug-agent traces root cause, assesses impact, writes debug report + scenarios → DONE
2. **Review**: Lead reviews diagnosis, holdout scenarios
3. **Architect review** (`/df-orchestrate`): Principal engineer reviews fix approach, blast radius, systemic patterns → 3+ rounds with debug-agent → APPROVED or BLOCKED
4. **Red-Green Fix**: Code-agent writes failing test (proves bug) → implements minimal fix (no test changes) → test passes → holdout validation
5. **Promote + Archive**: Same as feature pipeline

## Rules
- Spec creation and implementation are FULLY DECOUPLED — never auto-triggered
- Every agent spawn is INDEPENDENT — fresh context, no shared state
- NEVER pass holdout scenario content to the code-agent
- NEVER pass public scenario content to the test-agent
- NEVER pass test/scenario content to the architect-agent
- Architect-agent reviews EVERY spec before implementation (minimum 3 rounds of refinement)
- Architect-agent communicates with spec/debug agents ONLY about the spec — never about tests

## Lifecycle Tracking
- `dark-factory/manifest.json` tracks feature status: active → passed → promoted → archived
- Status transitions are managed by df-intake and df-orchestrate

## Directory
- `dark-factory/specs/features/` — Feature specs
- `dark-factory/specs/bugfixes/` — Bug report specs
- `dark-factory/scenarios/public/{name}/` — Scenarios visible to code-agent
- `dark-factory/scenarios/holdout/{name}/` — Hidden scenarios for validation
- `dark-factory/results/{name}/` — Test output (gitignored)
- `dark-factory/archive/{name}/` — Archived specs + scenarios (post-completion)
- `dark-factory/manifest.json` — Feature lifecycle manifest
- `dark-factory/project-profile.md` — Project architecture, conventions, and quality bar (from `/df-onboard`)
