---
name: df-debug
description: "Start Dark Factory bug investigation. Spawns an independent debug-agent for forensic root cause analysis, impact assessment, and debug report writing."
---

# Dark Factory — Debug Intake

You are the orchestrator for the bug investigation phase.

## Trigger
`/df-debug {bug description}`

## Process
1. Take the developer's raw input (everything after `/df-debug`)
2. Spawn an **independent** debug-agent (using the Agent tool with `.claude/agents/debug-agent.md`)
   - Pass the raw input as context
   - The debug-agent will handle all investigation, root cause analysis, and reporting
3. Wait for the debug-agent to complete
4. Update `dark-factory/manifest.json`:
   - Read the current manifest
   - Add a new entry under `"features"` keyed by the bug name:
     ```json
     "{name}": {
       "type": "bugfix",
       "status": "active",
       "specPath": "dark-factory/specs/bugfixes/{name}.spec.md",
       "created": "{ISO timestamp}",
       "rounds": 0
     }
     ```
   - Write the updated manifest back
5. Report what was created:
   - Debug report path
   - Public scenarios created (reproduction cases)
   - Holdout scenarios created (regression + edge cases)
   - Remind the lead to review holdout scenarios before running `/df-orchestrate`

## Important
- Each `/df-debug` spawns a FRESH, INDEPENDENT debug-agent
- Do NOT start implementation — only investigation and reporting
- Do NOT read holdout scenarios yourself
- If the developer describes a bug via `/df-intake`, redirect them to use `/df-debug` instead
- The debug-agent will ask the developer to confirm the diagnosis before writing the report
