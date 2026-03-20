---
name: df-orchestrate
description: "Run Dark Factory implementation cycle. Spawns independent code-agent and test-agent to implement and validate a feature/bugfix."
---

# Dark Factory — Orchestrate Implementation

You are the orchestrator for the implementation phase.

## Trigger
`/df-orchestrate {feature-name}`

## Pre-flight Checks
1. Verify spec exists: `dark-factory/specs/features/{name}.spec.md` OR `dark-factory/specs/bugfixes/{name}.spec.md`
2. Verify public scenarios exist: `dark-factory/scenarios/public/{name}/` has files
3. Verify holdout scenarios exist: `dark-factory/scenarios/holdout/{name}/` has files
4. If any missing → abort with clear message

## Smart Re-run Detection
Check if `dark-factory/results/{name}/` has previous results:
- **No results** → proceed as "new" (full run)
- **Results exist** → ask the developer:
  - **new** — wipe results, full code-agent → test-agent cycle
  - **test-only** — skip code-agent, only run test-agent against existing code
  - **fix** — load last failure summary, send to code-agent for targeted fixes

## Implementation Cycle

### Round N (max 3 rounds):

**Step 1: Code Agent** (skip in test-only mode)
- Read the spec file content
- Read all public scenario files content
- If fix mode: also include the sanitized failure summary from previous round
- Spawn an **independent** code-agent (Agent tool) with this context
- Wait for completion

**Step 2: Test Agent**
- Spawn an **independent** test-agent (Agent tool) with:
  - The feature name (test-agent reads holdout scenarios itself)
  - The spec file path
- Wait for completion
- Read the results file from `dark-factory/results/{name}/`

**Step 3: Evaluate**
- If all passed → report success, DONE
- If failures and rounds < 3:
  - Extract ONLY the behavioral failure descriptions (NO holdout content)
  - Go to Round N+1 with this sanitized summary
- If failures and rounds = 3 → report to developer, suggest manual review

## Information Barrier Rules
- NEVER pass holdout scenario content to the code-agent
- NEVER pass public scenario content to the test-agent
- Each agent spawn is completely independent (fresh context)
- Only pass: spec content, scenario content (appropriate type), and sanitized failure summaries
