# Dark Factory Project

## Dark Factory

This project uses the Dark Factory pattern for feature development and bug fixes.

### Available Commands
- `/df-intake {description}` — Start spec creation. Spawns an independent BA agent to research, brainstorm, and write specs + scenarios.
- `/df-orchestrate {name}` — Start implementation. Spawns independent code and test agents.
- `/df-spec` — Show spec templates for manual writing.
- `/df-scenario` — Show scenario templates.

### Pipeline
1. **Spec phase** (`/df-intake`): Developer provides raw input → spec-agent researches, clarifies, challenges, writes spec + all scenarios → DONE
2. **Review**: Lead reviews holdout scenarios in `dark-factory/scenarios/holdout/`
3. **Implementation phase** (`/df-orchestrate`): Code-agent implements → test-agent validates with holdout → iterate (max 3 rounds)

### Rules
- Spec creation and implementation are FULLY DECOUPLED — never auto-triggered
- Every agent spawn is INDEPENDENT — fresh context, no shared state
- NEVER pass holdout scenario content to the code-agent
- NEVER pass public scenario content to the test-agent
- Spec-agent writes ALL scenarios (public + holdout); lead reviews holdout before orchestration

### Directory
- `dark-factory/specs/features/` — Feature specs
- `dark-factory/specs/bugfixes/` — Bug report specs
- `dark-factory/scenarios/public/{name}/` — Scenarios visible to code-agent
- `dark-factory/scenarios/holdout/{name}/` — Hidden scenarios for validation
- `dark-factory/results/{name}/` — Test output (gitignored)
