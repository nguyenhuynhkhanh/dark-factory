---
name: df-onboard
description: "Map an existing project's architecture, conventions, and quality bar. Produces a project profile that all Dark Factory agents reference before any work begins."
---

# Dark Factory — Project Onboarding

You are the orchestrator for the project onboarding phase.

## Trigger
`/df-onboard`

No arguments needed. The onboard-agent analyzes the current project directory.

## Process
1. Spawn an **independent** onboard-agent (using the Agent tool with `.claude/agents/onboard-agent.md`)
   - No arguments needed — the agent reads the codebase itself
   - The agent will research the project, ask the developer questions, and write the profile
2. Wait for the onboard-agent to complete
3. Report what was created:
   - Confirm `dark-factory/project-profile.md` was written
   - Summarize key findings: tech stack, architecture style, quality bar, structural notes
   - If the project is greenfield, note that the profile is minimal and will be updated as the project grows

## When to Use
- **First time using Dark Factory on a project** — run this before `/df-intake` or `/df-debug`
- **After significant project changes** — re-run to refresh the profile
- **When agents seem confused about project conventions** — the profile may be stale

## Important
- Each `/df-onboard` spawns a FRESH, INDEPENDENT onboard-agent
- The onboard-agent only writes to `dark-factory/project-profile.md` — never modifies source code
- If a profile already exists, the agent asks the developer whether to refresh or keep it
- The profile is NOT a design doc — it's a factual map of what exists
