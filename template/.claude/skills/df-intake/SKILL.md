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

### Step 1: Spawn 3 spec leads in parallel

Take the developer's raw input and spawn **3 independent spec-agents simultaneously** (using the Agent tool with subagent_type `spec-agent`). Each gets the SAME feature description but a DIFFERENT perspective.

**All 3 must be launched in a single message** (parallel Agent tool calls).

**Lead A — User & Product Perspective**
> You are Lead A. Your perspective: **user experience and product value**.
> Focus on: who are the users, what problems this solves for them, user workflows and journeys, what "done" looks like from the user's point of view, acceptance criteria that a product manager would care about, UX edge cases (what happens when the user does something unexpected).
>
> Feature description: {raw input}
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

### Step 4: Write the spec and scenarios

After developer confirms, spawn ONE final spec-agent to write the official spec and scenarios:

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
> - **Suggested parallel tracks**: how many independent code-agents could work simultaneously without conflicts. List what each track would implement (e.g., Track 1: data model + migration, Track 2: API endpoints, Track 3: business logic). Tracks must have ZERO file overlap — if two tracks touch the same file, merge them into one.
>
> The developer has confirmed the scope — proceed directly to writing.

### Step 5: Update manifest

Update `dark-factory/manifest.json`:
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

### Step 6: Report
- Spec file path
- Public scenarios created
- Holdout scenarios created
- Implementation size estimate and suggested parallel tracks
- Remind the lead to review holdout scenarios before running `/df-orchestrate`

## Important
- All 3 leads MUST be spawned in PARALLEL (single message, 3 Agent tool calls)
- Each lead is FRESH and INDEPENDENT — no shared state
- Leads only REPORT findings — they do NOT write files
- Only the final spec-writing agent writes files
- This skill handles FEATURES only — redirect bugs to `/df-debug`
- Do NOT start implementation — only spec creation
- Do NOT read holdout scenarios yourself
- If the developer wants to refine an existing spec, read the existing spec and incorporate it into the lead prompts
