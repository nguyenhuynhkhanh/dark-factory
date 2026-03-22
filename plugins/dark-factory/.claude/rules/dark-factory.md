# Dark Factory

This project uses the Dark Factory pattern for feature development and bug fixes.

## Auto-Detection (IMPORTANT — read this first)

**When a developer sends a message that describes a bug or a feature request, ALWAYS invoke the `/df` skill automatically.** Do NOT wait for them to type `/df` — most developers will just paste a description directly. You must proactively detect and route it.

**Trigger `/df` when the message:**
- Describes something broken, wrong, or erroring (bug)
- Requests new functionality or changes to existing behavior (feature)
- Pastes an error message, stack trace, or log output (bug)
- Describes a user story, requirement, or product need (feature)
- References a ticket, issue, or task to implement (feature or bug)

**Do NOT trigger `/df` when the message:**
- Is a question about the codebase ("how does X work?", "where is Y defined?")
- Is a small, direct code change ("rename this variable", "add a log line here")
- Is about Dark Factory itself ("show me the manifest", "what's the status of X")
- Is a general conversation, greeting, or config request
- Is explicitly using another `/df-*` command already

**Conversations that evolve into implementation:**
Developers often start with a question or exploration ("how does auth work?", "why is this slow?"), then through discussion arrive at a concrete solution or decision to build something. **Watch for the transition moment** — when the conversation shifts from understanding to action:
- "OK let's do that" / "let's implement this" / "go ahead and build it"
- "so the fix would be..." / "we should change X to Y"
- "can you make that change?" / "let's go with option B"
- You and the developer agree on an approach and the next natural step is writing code

At that moment, trigger `/df` with a summary of what was discussed and decided. Tell the developer: "We've landed on a concrete plan — let me route this through Dark Factory so we get a proper spec, scenarios, and validation." Pass the full context of what was agreed (the problem, the decided approach, any constraints discussed).

When in doubt, ask: "Would you like me to run this through the Dark Factory pipeline?"

## Available Commands
- **`/df {description}`** — **Just describe what you need.** Auto-detects bug vs feature and routes to the right pipeline. Asks you to confirm if ambiguous.
- `/df-onboard` — Map the project. Produces `dark-factory/project-profile.md` with architecture, conventions, quality bar. **Run this first on any existing project.**
- `/df-intake {description}` — Start **feature** spec creation. Spawns 3 parallel spec-agents (user/product, architecture, reliability perspectives), synthesizes into one spec.
- `/df-debug {description}` — Start **bug** investigation. Spawns 3 parallel debug-agents investigating from different angles (code path, history, patterns), synthesizes findings, then writes the report.
- `/df-orchestrate {name}` — Start implementation. Auto-scales parallel code-agents based on spec size. Auto-promotes holdout tests and archives on success.
- `/df-cleanup` — Recovery/maintenance. Retries stuck promotions, completes archival, lists stale features.
- `/df-spec` — Show spec templates for manual writing.
- `/df-scenario` — Show scenario templates.

## Onboarding (run once per project)
`/df-onboard` → onboard-agent maps the codebase → produces `dark-factory/project-profile.md` → all agents reference it

## Feature Pipeline
1. **Spec phase** (`/df-intake`): Developer provides raw input → 3 spec-agents analyze from different perspectives (user/product, architecture, reliability) → orchestrator synthesizes → developer confirms → spec + scenarios written → DONE
2. **Review**: Lead reviews holdout scenarios in `dark-factory/scenarios/holdout/`
3. **Architect review** (`/df-orchestrate`): Principal engineer reviews spec for architecture, security, performance, production-readiness → 3+ rounds of refinement with spec-agent → APPROVED or BLOCKED
4. **Implementation**: Parallel code-agents implement (scaled by spec size) → test-agent validates with holdout → iterate (max 3 rounds)
5. **Promote**: On success, holdout tests are automatically promoted into the permanent test suite
6. **Archive**: Specs and scenarios are moved to `dark-factory/archive/{name}/`

## Bugfix Pipeline
1. **Investigation** (`/df-debug`): Developer reports bug → 3 debug-agents investigate in parallel (code path, history, patterns) → orchestrator synthesizes findings → developer confirms → report + scenarios written → DONE
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
