---
name: df-debug
description: "Start Dark Factory bug investigation. Spawns 3 independent debug-agents investigating from different angles, synthesizes findings into one report."
---

# Dark Factory — Debug Intake (Three-Headed Investigation)

You are the orchestrator for the bug investigation phase. To reduce blind spots and increase the chance of finding the true root cause, you run **3 parallel investigations** from different angles, then synthesize their findings.

## Trigger
`/df-debug {bug description}`

## Process

### Step 1: Spawn 3 investigators in parallel

Take the developer's raw input and spawn **3 independent debug-agents simultaneously** (using the Agent tool with subagent_type `debug-agent`). Each gets the SAME bug description but a DIFFERENT investigation direction.

**All 3 must be launched in a single message** (parallel Agent tool calls).

**Investigator A — Code Path Tracer**
> You are Investigator A. Your direction: **trace the code execution path**.
> Focus on: following the execution from trigger to failure point, mapping data flow and state transitions, identifying exactly where and why the code breaks. Read the code, trace function calls, check input/output at each step.
>
> Bug description: {raw input}
>
> IMPORTANT: After your investigation, output your findings as a structured report with these sections: Execution Trace, Failure Point, Root Cause Hypothesis, Evidence (with file:line references). Do NOT write any files — just report your findings.

**Investigator B — History Detective**
> You are Investigator B. Your direction: **investigate the change history**.
> Focus on: git blame/log for the affected area, recent commits that touched this code, when this behavior was introduced (was it always broken or a regression?), who changed what and why, related PRs or issues.
>
> Bug description: {raw input}
>
> IMPORTANT: After your investigation, output your findings as a structured report with these sections: Recent Changes, When Introduced, Relevant Commits, Root Cause Hypothesis, Evidence (with commit refs and file:line references). Do NOT write any files — just report your findings.

**Investigator C — Pattern & Systemic Analyst**
> You are Investigator C. Your direction: **look for patterns and systemic issues**.
> Focus on: similar code patterns elsewhere in the codebase that could have the same bug, edge cases and boundary conditions, concurrency/race conditions, shared dependencies, whether this is an isolated issue or a symptom of a design problem.
>
> Bug description: {raw input}
>
> IMPORTANT: After your investigation, output your findings as a structured report with these sections: Similar Patterns Found, Edge Cases, Systemic Issues, Root Cause Hypothesis, Evidence (with file:line references). Do NOT write any files — just report your findings.

### Step 2: Synthesize findings

After all 3 investigators complete, YOU (the orchestrator) synthesize their findings:

1. **Compare root cause hypotheses** — do they converge or diverge?
   - If all 3 point to the same root cause → high confidence
   - If 2 agree and 1 differs → investigate the difference, the outlier may have found something deeper
   - If all 3 diverge → the bug may be more complex than expected, present all angles
2. **Merge evidence** — combine the strongest evidence from each investigator
3. **Merge impact analysis** — union of all affected code paths found by all 3
4. **Pick the best fix approach** — informed by all 3 perspectives

### Step 3: Present to developer

Present a unified summary:
- What each investigator found (brief)
- Where they agreed and disagreed
- The synthesized root cause with combined evidence
- Proposed fix approach(es) with tradeoffs
- **Wait for developer confirmation before proceeding**

### Step 4: Write the report

After developer confirms, spawn ONE final debug-agent to write the official report and scenarios:

> Write the debug report and scenarios for this bug based on the following confirmed investigation findings.
>
> {synthesized findings from all 3 investigators}
> {developer's confirmed fix approach}
>
> Write the debug report to `dark-factory/specs/bugfixes/{name}.spec.md`.
> Write public scenarios to `dark-factory/scenarios/public/{name}/`.
> Write holdout scenarios to `dark-factory/scenarios/holdout/{name}/`.
> The developer has already confirmed the diagnosis — proceed directly to writing.

### Step 5: Update manifest

Update `dark-factory/manifest.json`:
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

### Step 6: Present holdout scenarios for review

After the report and scenarios are written, **show the holdout scenarios directly to the developer** for review. Do NOT just tell them to go read files — display the content inline:

1. Read each holdout scenario file from `dark-factory/scenarios/holdout/{name}/`
2. Present them in a clear summary format:
   - Scenario name, type, priority
   - Brief description of what it tests (regression case, edge case, etc.)
   - The key assertion / expected outcome
3. Ask the developer:
   > Here are the holdout scenarios (these are hidden from the code-agent during implementation). Do they look good?
   > - **Proceed** — start implementation with `/df-orchestrate {name}`
   > - **Adjust** — tell me what to change and I'll update the scenarios
4. If the developer says proceed, **invoke `/df-orchestrate {name}` automatically** — don't make them type it
5. If the developer wants adjustments, update the scenarios and re-present

### Step 7: Report summary
- Debug report path
- Number of public and holdout scenarios created

## Important
- All 3 investigators MUST be spawned in PARALLEL (single message, 3 Agent tool calls)
- Each investigator is FRESH and INDEPENDENT — no shared state
- Investigators only REPORT findings — they do NOT write files
- Only the final report-writing agent writes files
- Do NOT start implementation — only investigation and reporting
- Do NOT read holdout scenarios yourself
- The developer MUST confirm the diagnosis before the report is written
