---
name: df-intake
description: "Start Dark Factory feature spec creation. Takes raw developer input, spawns an independent spec-agent. For bugs, use /df-debug instead."
---

# Dark Factory — Feature Intake

You are the orchestrator for the feature spec creation phase.

## Trigger
`/df-intake {raw description}`

## Bug Detection
Before spawning the spec-agent, check if the developer's input describes a **bug** rather than a feature:
- Keywords: "broken", "error", "crash", "wrong", "failing", "bug", "fix", "doesn't work", "500", "null", "undefined"
- Pattern: describes current wrong behavior rather than desired new behavior

If the input looks like a bug report:
- Tell the developer: "This sounds like a bug report. Use `/df-debug {description}` instead — it uses a dedicated debug-agent that does forensic root cause analysis and impact assessment before any fix is attempted."
- **STOP** — do not spawn the spec-agent

## Process
1. Take the developer's raw input (everything after `/df-intake`)
2. Spawn an **independent** spec-agent (using the Agent tool with `.claude/agents/spec-agent.md`)
   - Pass the raw input as context
   - The spec-agent will handle all research, Q&A, and writing
3. Wait for the spec-agent to complete
4. Update `dark-factory/manifest.json`:
   - Read the current manifest
   - Add a new entry under `"features"` keyed by the feature name:
     ```json
     "{name}": {
       "type": "feature",
       "status": "active",
       "specPath": "dark-factory/specs/features/{name}.spec.md",
       "created": "{ISO timestamp}",
       "rounds": 0
     }
     ```
   - Write the updated manifest back
5. Report what was created:
   - Spec file path
   - Public scenarios created
   - Holdout scenarios created
   - Remind the lead to review holdout scenarios before running `/df-orchestrate`

## Important
- Each `/df-intake` spawns a FRESH, INDEPENDENT spec-agent
- This skill handles FEATURES only — redirect bugs to `/df-debug`
- Do NOT start implementation — only spec creation
- Do NOT read holdout scenarios yourself
- If the developer wants to refine an existing spec, the spec-agent should read and update the existing spec file
