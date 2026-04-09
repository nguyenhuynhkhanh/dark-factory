# Scenario: P-04 — Balanced Search — Map for Orientation, Read/Grep for Precision

## Type
feature

## Priority
high — this is the core agent behavior change; without it, agents continue exploring blindly and the map provides no efficiency benefit

## Preconditions
- `dark-factory/code-map.md` exists and is current (hash matches HEAD)
- The map's "Shared Dependency Hotspots" section lists `scripts/init-dark-factory.js` as the highest fan-in module (imported by 7+ modules)
- The map's "Module Dependency Graph" section shows `spec-agent.md -> [project-profile.md reader, code-map.md reader]`
- A spec-agent is spawned for a feature that involves modifying agent behavior (e.g., updating spec-agent.md)
- The spec-agent's updated prompt contains the balanced search policy

## Action
The spec-agent begins its research phase for a feature touching agent files:
1. Read `dark-factory/code-map.md` — the full map
2. From the map, identify: `spec-agent.md` is in `.claude/agents/`, the Module Dependency Graph shows it has no imports (it is a standalone markdown file), the Hotspots section shows it is NOT a hotspot
3. From the map, identify: `scripts/init-dark-factory.js` IS a hotspot — any change to agent content must also change this file
4. The spec-agent does NOT run Glob or Grep to discover which files exist in `.claude/agents/`
5. The spec-agent uses the map's entry for `.claude/agents/` to know all agents are there
6. THEN: the spec-agent uses `Read` to open `.claude/agents/spec-agent.md` directly (precision read on a specific known target)
7. THEN: the spec-agent uses `Read` to open `scripts/init-dark-factory.js` to read the exact generator function for spec-agent (precision read on a specific known target)

## Expected Outcome
- The spec-agent reads the map first (orientation layer)
- The spec-agent does NOT run `Glob("**/*.md")` or `Grep("spec-agent")` to find which files are agents
- The spec-agent does NOT run `Bash("ls .claude/agents/")` to list agents
- The spec-agent DOES use `Read` on specific files that the map directed it to
- The spec-agent correctly identifies the dual-source-of-truth (agent file + init script) because the map's hotspot section highlights `scripts/init-dark-factory.js` as high fan-in
- The research phase requires fewer total tool calls than it would without the map

## Failure Mode (if applicable)
None applicable — this scenario tests behavior, not a failure path.

## Notes
This scenario verifies the behavioral change, not the text change. It is insufficient for the code-agent to merely add the balanced search policy text to agent prompts — the actual agent behavior during research must reflect that policy.

The test validator should check: does the agent's tool call sequence show map read BEFORE any file-level reads? Does the agent avoid Glob/Grep for discovery? Does the agent use Read only on files named in the map?
