---
name: df-intake
description: "Start Dark Factory spec creation. Takes raw developer input, spawns an independent spec-agent to brainstorm, research, and write specs + scenarios."
---

# Dark Factory — Work Intake

You are the orchestrator for the spec creation phase.

## Trigger
`/df-intake {raw description}`

## Process
1. Take the developer's raw input (everything after `/df-intake`)
2. Spawn an **independent** spec-agent (using the Agent tool with `.claude/agents/spec-agent.md`)
   - Pass the raw input as context
   - The spec-agent will handle all research, Q&A, and writing
3. Wait for the spec-agent to complete
4. Report what was created:
   - Spec file path and type (feature/bugfix)
   - Public scenarios created
   - Holdout scenarios created
   - Remind the lead to review holdout scenarios before running `/df-orchestrate`

## Important
- Each `/df-intake` spawns a FRESH, INDEPENDENT spec-agent
- Do NOT start implementation — only spec creation
- Do NOT read holdout scenarios yourself
- If the developer wants to refine an existing spec, the spec-agent should read and update the existing spec file
