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

**Do NOT auto-trigger `/df` when the message:**
- Is a question about the codebase ("how does X work?", "where is Y defined?")
- Is about Dark Factory itself ("show me the manifest", "what's the status of X")
- Is a general conversation, greeting, or config request
- Is explicitly using another `/df-*` command already
- Is a **trivial task** (see below) — implement directly instead

**Trivial tasks — implement directly, no pipeline:**
A task is trivial when ALL of these are true: (1) the scope is a single file or a small, obvious set of files, (2) there is no logic change (no new behavior, no branching, no API contract changes), and (3) the correctness is self-evident without test coverage. Examples:
- Updating docs or README (rewording, adding sections, fixing typos)
- Adding or updating a comment or log line
- Changing a config value or env variable name
- Renaming a file, variable, or constant with no semantic change
- Reformatting or linting fixes

For trivial tasks: just do it. No spec, no agents, no pipeline.

**For everything else — real bugs and real features — route through `/df`.**

**But if the developer explicitly types `/df {description}`, check if it is a trivial task first:**
- If trivial: implement directly and tell the developer why you skipped the pipeline.
- If not trivial: route through `/df-intake` (feature) or `/df-debug` (bug). No exceptions.

**CRITICAL: NEVER implement code directly for non-trivial tasks when `/df` is invoked.** For non-trivial work, the ONLY valid response to `/df` is routing to `/df-intake` (features) or `/df-debug` (bugs). Every non-trivial `/df` invocation goes through spec → scenarios → architect review → implementation → holdout validation.

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
- `/df-orchestrate {name} [name2...] | --group {name} | --all [--force]` — Start implementation. Supports explicit spec names, `--group` for all specs in a group, or `--all` for every active spec. Each spec runs in its own git worktree. Multiple specs implement in parallel. Auto-scales code-agents per spec (up to 4). Auto-promotes holdout tests and cleans up on success.
- `/df-cleanup` — Recovery/maintenance. Runs health check on promoted tests (detects missing, skipped, failing, or stale tests), retries stuck promotions, completes archival, lists stale features. Use `--rebuild` to reconstruct the promoted test registry from annotation headers.
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
6. **Cleanup**: All artifacts committed to git then deleted — git history is the archive

## Bugfix Pipeline
1. **Investigation** (`/df-debug`): Developer reports bug → 3 debug-agents investigate in parallel (code path, history, patterns) → orchestrator synthesizes findings → developer confirms → report + scenarios written → DONE
2. **Review**: Lead reviews diagnosis, holdout scenarios
3. **Architect review** (`/df-orchestrate`): Principal engineer reviews fix approach, blast radius, systemic patterns → 3+ rounds with debug-agent → APPROVED or BLOCKED
4. **Red-Green Fix**: Code-agent writes failing test (proves bug) → implements minimal fix (no test changes) → test passes → holdout validation
5. **Promote + Cleanup**: Same as feature pipeline

## Rules
- Implementation requires developer confirmation but can be auto-triggered from df-intake after that confirmation
- Every agent spawn is INDEPENDENT — fresh context, no shared state
- NEVER pass holdout scenario content to the code-agent
- NEVER pass public scenario content to the test-agent
- NEVER pass test/scenario content to the architect-agent
- Architect-agent reviews EVERY spec before implementation (minimum 3 rounds of refinement)
- Architect-agent communicates with spec/debug agents ONLY about the spec — never about tests

## Lifecycle Tracking
- `dark-factory/manifest.json` tracks active features only — completed entries are removed after cleanup
- All artifacts are committed to git before deletion — git history is the permanent archive
- Status transitions: active → passed → promoted → cleaned up (removed from manifest)

## Directory
- `dark-factory/specs/features/` — Feature specs (temporary, deleted after promotion)
- `dark-factory/specs/bugfixes/` — Bug report specs (temporary, deleted after promotion)
- `dark-factory/scenarios/public/{name}/` — Scenarios visible to code-agent (temporary)
- `dark-factory/scenarios/holdout/{name}/` — Hidden scenarios for validation (temporary)
- `dark-factory/results/{name}/` — Test output (gitignored)
- `dark-factory/manifest.json` — Active feature tracking only
- `dark-factory/project-profile.md` — Project architecture, conventions, and quality bar (from `/df-onboard`)
