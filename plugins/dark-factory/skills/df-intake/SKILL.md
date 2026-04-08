---
name: df-intake
description: "Start Dark Factory feature spec creation. Spawns 3 independent spec-agents with different perspectives, synthesizes into one spec. For bugs, use /df-debug instead."
---

# Dark Factory — Feature Intake (Three-Perspective Spec)

You are the orchestrator for the feature spec creation phase. To produce a well-rounded spec, you run **3 parallel spec investigations** from different perspectives, then synthesize their findings into one unified spec.

## Trigger
`/df-intake {raw description}`

## Bug Detection
Before spawning agents, check if the developer's input describes a **bug** rather than a feature:
- Keywords: "broken", "error", "crash", "wrong", "failing", "bug", "fix", "doesn't work", "500", "null", "undefined"
- Pattern: describes current wrong behavior rather than desired new behavior

If the input looks like a bug report:
- Tell the developer: "This sounds like a bug report. Use `/df-debug {description}` instead — it uses a dedicated debug-agent that does forensic root cause analysis and impact assessment before any fix is attempted."
- **STOP** — do not spawn any agents

## Process

### Step 0: Log the event

Before spawning any agents, run:
```bash
$HOME/.df-factory/bin/log-event.sh "$(jq -cn --arg pt "{developer's raw input}" \
  '{"command":"df-intake","startedAt":now|todate,"promptText":$pt}')"
```
**CRITICAL**: `promptText` must be the developer's **original input verbatim** — not any generated spec, synthesized findings, or AI-produced content.

### Step 1: Spawn 3 spec leads in parallel

Take the developer's raw input and spawn **3 independent spec-agents simultaneously** (using the Agent tool with subagent_type `spec-agent`, `isolation: "worktree"`). Each gets the SAME feature description but a DIFFERENT perspective. Worktree isolation ensures each lead reads a consistent snapshot of the codebase without interference.

**All 3 must be launched in a single message** (parallel Agent tool calls).

**Lead A — User & Product Perspective**
> You are Lead A. Your perspective: **user experience and product value**.
> Focus on: who are the users, what problems this solves for them, user workflows and journeys, what "done" looks like from the user's point of view, acceptance criteria that a product manager would care about, UX edge cases (what happens when the user does something unexpected).
>
> Feature description: {raw input}
>
> Also read `dark-factory/code-map.md` if it exists — use the **Shared Dependency Hotspots** section to understand which areas of the codebase are heavily connected and may affect scope estimation.
>
> Research the codebase, then output your findings as a structured report with these sections:
> - **Users & Use Cases**: who uses this and how
> - **Proposed Scope**: what's in/out for v1, with rationale
> - **User-Facing Requirements**: functional requirements from the user's perspective
> - **Acceptance Criteria**: how to verify this works for users
> - **UX Edge Cases**: unexpected user behaviors to handle
> - **Questions for Developer**: anything unclear from this perspective
>
> Do NOT write any spec or scenario files — just report your findings.

**Lead B — Architecture & Integration Perspective**
> You are Lead B. Your perspective: **technical architecture and system integration**.
> Focus on: how this fits into the existing architecture, which modules/services are affected, data model changes, API design, integration points with existing features, performance implications, migration strategy if needed.
>
> Feature description: {raw input}
>
> Also read `dark-factory/code-map.md` if it exists — use the **Module Dependency Graph** and **Entry Point Traces** sections to understand how modules connect and where this feature fits architecturally.
>
> Research the codebase, then output your findings as a structured report with these sections:
> - **Affected Systems**: which parts of the codebase this touches
> - **Architecture Approach**: how to structure this within existing patterns
> - **Data Model**: schema changes, new entities, relationships
> - **API Design**: endpoints, contracts, compatibility
> - **Integration Points**: how this connects to existing features
> - **Technical Risks**: performance, scalability, migration concerns
> - **Questions for Developer**: anything unclear from this perspective
>
> Do NOT write any spec or scenario files — just report your findings.

**Lead C — Reliability & Edge Cases Perspective**
> You are Lead C. Your perspective: **production reliability, failure modes, and edge cases**.
> Focus on: what can go wrong, concurrency issues, partial failures, data consistency, error handling, security implications, operational concerns (monitoring, alerting, recovery), backward compatibility, what happens at scale.
>
> Feature description: {raw input}
>
> Also read `dark-factory/code-map.md` if it exists — use the **Circular Dependencies** and **Cross-Cutting Concerns** sections to identify reliability risks and shared patterns that could be affected.
>
> Research the codebase, then output your findings as a structured report with these sections:
> - **Failure Modes**: what can go wrong and how to handle it
> - **Concurrency & Race Conditions**: multi-user and timing issues
> - **Security Considerations**: auth, input validation, data exposure
> - **Data Integrity**: consistency guarantees needed
> - **Operational Concerns**: monitoring, alerting, recovery paths
> - **Backward Compatibility**: what existing behavior could break
> - **Edge Cases**: boundary values, empty states, max limits
> - **Questions for Developer**: anything unclear from this perspective
>
> Do NOT write any spec or scenario files — just report your findings.

### Step 2: Synthesize findings

After all 3 leads complete, YOU (the orchestrator) synthesize:

1. **Merge scope proposals** — Lead A defines what users need, Lead B defines how to build it, Lead C defines what to protect against
2. **Collect all questions** — deduplicate questions from all 3 leads
3. **Identify disagreements** — where leads propose different approaches, note the tradeoffs
4. **Build unified picture**:
   - Combined scope (in/out) with rationale from all perspectives
   - Requirements that cover user needs, technical design, AND reliability
   - Edge cases from all three angles

### Step 3: Present to developer

Present a unified summary:
- What each lead found (brief)
- Combined proposed scope with in/out rationale
- All open questions (deduplicated, grouped by theme)
- Any disagreements between leads with tradeoff analysis
- **Wait for developer to answer questions and confirm scope**

### Step 4: Spec Decomposition Analysis (CRITICAL)

Before writing anything, analyze whether this feature should be **one spec or multiple smaller specs**. Smaller specs are better — they parallelize across worktrees, have fewer errors, and are easier to review.

**Decomposition rules:**

1. **Estimate total scope**: Count affected files, services, data models, API endpoints
2. **Apply the decomposition threshold**:
   - **small** (1-3 files): Keep as ONE spec
   - **medium** (4-6 files): Consider splitting if there are natural boundaries
   - **large** (7-10 files): SHOULD split into 2-3 specs
   - **x-large** (10+ files): MUST split into 3+ specs
3. **Find natural split boundaries** — each sub-spec should be independently implementable:
   - **By layer**: data model/migration → API endpoints → business logic → UI
   - **By domain**: user management, payment processing, notifications are separate domains
   - **By dependency**: foundation (schema, config, shared types) vs. features that build on it
   - **By service**: different microservices or modules are natural spec boundaries
4. **Validate independence**: Each sub-spec must be:
   - Implementable without the others being complete (or with a clear dependency order)
   - Testable in isolation (its own scenarios can pass without other specs)
   - Touching a mostly distinct set of files (minimal overlap)
5. **Check for dependencies on existing active specs**: Read `dark-factory/manifest.json` and check for existing active specs. Analyze file overlap between the new spec(s) and existing active specs. If the new spec modifies files that an existing active spec also modifies, or if the new spec depends on output from an existing active spec, mark the existing spec as a dependency. Only mark as independent if there is truly no overlap or dependency relationship.

**Dependency ordering:**
- If spec-B needs the data model from spec-A, mark spec-A as a **dependency** of spec-B
- Foundation specs (project setup, shared types, database schema) come first
- The orchestrator will use these dependencies to determine wave ordering

**Present the decomposition to the developer:**

```
## Spec Decomposition

This feature is large enough to benefit from splitting into 3 independent specs:

1. **{name}-data-model** (foundation — runs first)
   - Database schema, migrations, shared types
   - ~3 files, small scope
   - No dependencies

2. **{name}-api** (depends on: {name}-data-model)
   - REST endpoints, request validation, response formatting
   - ~4 files, medium scope

3. **{name}-business-logic** (depends on: {name}-data-model)
   - Core rules, event handlers, notifications
   - ~3 files, small scope

Execution plan: Wave 1: data-model → Wave 2: api + business-logic (parallel worktrees)

Alternatively, this could be kept as a single spec if you prefer.
```

Wait for the developer to confirm the decomposition (or choose single spec).

### Step 5: Write spec(s) and scenarios

**If single spec** (small scope or developer chose not to split):

Spawn ONE spec-agent to write the spec and scenarios:

> Write the feature spec and scenarios based on the following confirmed findings from 3 independent leads.
>
> {synthesized findings from all 3 leads}
> {developer's answers to questions}
> {developer's confirmed scope}
>
> Write the spec to `dark-factory/specs/features/{name}.spec.md`.
> Write public scenarios to `dark-factory/scenarios/public/{name}/`.
> Write holdout scenarios to `dark-factory/scenarios/holdout/{name}/`.
>
> IMPORTANT: Include an **Implementation Size Estimate** section at the end of the spec with:
> - **Scope size**: small (1-2 files changed) | medium (3-5 files) | large (6-10 files) | x-large (10+ files)
> - **Suggested parallel tracks**: how many independent code-agents could work simultaneously without conflicts. List what each track would implement. Tracks must have ZERO file overlap.
>
> The developer has confirmed the scope — proceed directly to writing.

**If multiple specs** (decomposed):

Spawn ONE spec-agent PER sub-spec **in parallel** (all in a single message, each with `isolation: "worktree"`):

For each sub-spec:
> Write a focused feature spec and scenarios for the **{sub-spec-name}** portion of the larger {name} feature.
>
> {synthesized findings from all 3 leads — filtered to this sub-spec's scope}
> {developer's answers to questions}
> {this sub-spec's confirmed scope and boundaries}
>
> **Your scope is ONLY**: {specific requirements for this sub-spec}
> **Files you may touch**: {explicit file list}
> **Dependencies**: {list of other sub-specs this depends on, or "none"}
>
> Write the spec to `dark-factory/specs/features/{sub-spec-name}.spec.md`.
> Write public scenarios to `dark-factory/scenarios/public/{sub-spec-name}/`.
> Write holdout scenarios to `dark-factory/scenarios/holdout/{sub-spec-name}/`.
>
> IMPORTANT: Include a **Dependencies** section listing which other sub-specs must complete before this one can be implemented. If none, write "None — this spec is independently implementable."
>
> IMPORTANT: Include an **Implementation Size Estimate** section. This sub-spec should be small enough for 1-2 code-agents max.

After all spec-agents complete, merge their worktree branches back.

### Step 6: Update manifest

Update `dark-factory/manifest.json` for EACH spec (single or multiple):
- Read the current manifest
- Add entries under `"features"` keyed by each spec name:
  ```json
  "{name}": {
    "type": "feature",
    "status": "active",
    "specPath": "dark-factory/specs/features/{name}.spec.md",
    "created": "{ISO timestamp}",
    "rounds": 0,
    "group": "{parent-feature-name or null}",
    "dependencies": ["{dep-spec-name}", "..."]
  }
  ```
- **MANDATORY**: Every manifest entry MUST include both `group` and `dependencies` fields:
  - `"group"`: For decomposed specs, all sub-specs share the same `"group"` value (the parent feature name). For single/standalone specs, set to `null`. NEVER omit this field.
  - `"dependencies"`: Lists sub-spec names that must complete before this one. For independent specs (no dependencies), set to `[]` (empty array). NEVER omit this field.
- Write the updated manifest back

### Step 7: Present scenarios for review

After the spec(s) and scenarios are written, **show both public and holdout scenarios directly to the developer** for review. Do NOT just tell them to go read files — display the content inline:

1. Read each **public** scenario file from `dark-factory/scenarios/public/{name}/` (for each spec if decomposed)
2. Read each **holdout** scenario file from `dark-factory/scenarios/holdout/{name}/` (for each spec if decomposed)
3. Present them in a clear summary format, grouped by type:
   **Public scenarios** (visible to code-agent during implementation):
   - Scenario name, type, priority
   - Brief description of what it tests
   - The key assertion / expected outcome

   **Holdout scenarios** (hidden from code-agent, used for validation only):
   - Scenario name, type, priority
   - Brief description of what it tests
   - The key assertion / expected outcome
4. Ask the developer:
   > Here are all scenarios. Public ones guide the code-agent; holdout ones are hidden and used for validation. Do they look good?
   > - **Proceed** — start implementation with `/df-orchestrate {all-spec-names}`
   > - **Adjust** — tell me what to change and I'll update the scenarios
4. If the developer says proceed:
   - Single spec: invoke `/df-orchestrate {name}` automatically
   - Multiple specs: invoke `/df-orchestrate {name-1} {name-2} {name-3}` — the orchestrator handles dependency ordering and parallel worktrees
5. If the developer wants adjustments, update the scenarios and re-present

### Step 8: Report summary
- Spec file path(s)
- Decomposition summary (if split): how many specs, dependency order, parallel execution plan
- Number of public and holdout scenarios created per spec
- Implementation size estimate per spec

## Important
- **NEVER implement code directly.** This skill produces specs and scenarios ONLY. No code changes, no "quick fixes", no "let me just do this small thing." Every task goes through the full pipeline.
- All 3 leads MUST be spawned in PARALLEL (single message, 3 Agent tool calls)
- Each lead is FRESH and INDEPENDENT — no shared state
- Leads only REPORT findings — they do NOT write files
- Only the final spec-writing agent writes files
- This skill handles FEATURES only — redirect bugs to `/df-debug`
- Do NOT start implementation — only spec creation
- Do NOT read holdout scenarios yourself
- If the developer wants to refine an existing spec, read the existing spec and incorporate it into the lead prompts
