---
name: df-orchestrate
description: "Run Dark Factory implementation cycle. Spawns independent code-agent and test-agent to implement and validate a feature/bugfix."
---

# Dark Factory — Orchestrate Implementation

You are the orchestrator for the implementation phase.

## Trigger
`/df-orchestrate {feature-name}`

## Pre-flight Checks
1. Check if `dark-factory/project-profile.md` exists:
   - If missing → warn the developer: "No project profile found. Run `/df-onboard` first for best results. Agents will work without it, but may miss project conventions."
   - Do NOT block — proceed with the warning
2. Verify spec exists: `dark-factory/specs/features/{name}.spec.md` OR `dark-factory/specs/bugfixes/{name}.spec.md`
3. Verify public scenarios exist: `dark-factory/scenarios/public/{name}/` has files
4. Verify holdout scenarios exist: `dark-factory/scenarios/holdout/{name}/` has files
5. If spec or scenarios missing → abort with clear message

## Smart Re-run Detection
Check if `dark-factory/results/{name}/` has previous results:
- **No results** → proceed as "new" (full run)
- **Results exist** → ask the developer:
  - **new** — wipe results, full code-agent → test-agent cycle
  - **test-only** — skip code-agent, only run test-agent against existing code
  - **fix** — load last failure summary, send to code-agent for targeted fixes

## Detect Mode
- If spec is in `dark-factory/specs/features/` → **Feature mode**
- If spec is in `dark-factory/specs/bugfixes/` → **Bugfix mode**

---

## Architect Review (MANDATORY — both modes)

Before ANY implementation begins, the spec must pass principal engineer review.

**Step 0: Architect Review**
- Check if `dark-factory/specs/features/{name}.review.md` or `dark-factory/specs/bugfixes/{name}.review.md` already exists with status APPROVED:
  - If APPROVED → skip review, proceed to implementation
  - If APPROVED WITH NOTES → skip review, proceed to implementation
  - If BLOCKED or no review exists → run review
- Spawn an **independent** architect-agent (Agent tool with `.claude/agents/architect-agent.md`) with:
  - The spec file path
  - The feature name
  - Whether this is a feature or bugfix
- The architect-agent will:
  1. Deep-review the spec against the codebase
  2. Run at least 3 rounds of discussion with the spec-agent (features) or debug-agent (bugs)
  3. Each round: architect identifies gaps → spawns spec/debug agent to update spec → re-reviews
  4. Produce a review summary with APPROVED / APPROVED WITH NOTES / BLOCKED status
- Wait for completion
- Read the review file
- If BLOCKED → report to developer, do NOT proceed to implementation
- If APPROVED → proceed to implementation

**Important rules for architect review:**
- The architect NEVER discusses tests or scenarios with the spec/debug agent
- The architect can ONLY provide information about spec gaps and ask the spec/debug agent to update the spec
- The spec/debug agent may independently update scenarios based on spec changes — that is their own decision
- If the architect and spec agent disagree, the architect escalates to the developer

---

## Feature Mode — Implementation Cycle

### Step 0.5: Determine Parallelism

Read the spec file and look for the **Implementation Size Estimate** section:
- If the section exists, read the **Suggested parallel tracks** to determine how many code-agents to spawn and what each one implements
- If the section is missing, analyze the spec yourself:
  - **small** (1-2 files): 1 code-agent
  - **medium** (3-5 files): 1-2 code-agents
  - **large** (6-10 files): 2-3 code-agents
  - **x-large** (10+ files): 3-4 code-agents

**Rules for parallel tracks:**
- Each track MUST have **zero file overlap** — no two code-agents can touch the same file
- If tracks have dependencies (e.g., Track 2 needs the data model from Track 1), run them **sequentially**, not in parallel
- When in doubt, fewer agents is safer — merging conflicting changes wastes more time than sequential execution
- Maximum 4 parallel code-agents (diminishing returns beyond that)

Tell the developer how many parallel code-agents you plan to spawn and what each will do. Proceed after confirmation (or immediately if the spec already defined the tracks).

### Round N (max 3 rounds):

**Step 1: Code Agents** (skip in test-only mode)
- Read the spec file content
- Read all public scenario files content
- If fix mode: also include the sanitized failure summary from previous round

**If single track (small scope):**
- Spawn ONE **independent** code-agent (Agent tool) with the full spec and public scenarios
  - Tell the code-agent it is in **feature mode**
- Wait for completion

**If multiple tracks (medium-to-xlarge scope):**
- For each track, spawn an **independent** code-agent **in parallel** (all in a single message) with:
  - The full spec (for context)
  - All public scenarios (for context)
  - **Explicit track assignment**: which specific requirements/sections of the spec this agent is responsible for
  - **Explicit file boundaries**: which files this agent may create/modify (ONLY these files)
  - **Instruction**: "You are implementing Track N of M. ONLY create/modify the files listed in your track assignment. Other tracks are being implemented in parallel by other agents."
- Wait for ALL code-agents to complete
- **Verify no file conflicts**: check that no two agents modified the same file. If conflicts exist, report to developer and resolve before proceeding.

**Step 2: Test Agent**
- Spawn an **independent** test-agent (Agent tool) with:
  - The feature name (test-agent reads holdout scenarios itself)
  - The spec file path
- Wait for completion
- Read the results file from `dark-factory/results/{name}/`

**Step 3: Evaluate**
- If all passed → proceed to Step 4 (Promote)
- If failures and rounds < 3:
  - Extract ONLY the behavioral failure descriptions (NO holdout content)
  - Identify which track(s) likely caused the failure based on affected files
  - In the next round, only re-spawn code-agents for the failing tracks (unchanged tracks keep their code)
  - Go to Round N+1 with this sanitized summary
- If failures and rounds = 3 → report to developer, suggest manual review

---

## Bugfix Mode — Red-Green Cycle

The bugfix cycle enforces strict integrity: test and implementation are written in separate, verified phases. This ensures the fix actually addresses the root cause and introduces no regressions.

### Step 1: Red Phase (Prove the Bug)
- Read the debug report content
- Read all public scenario files content (reproduction cases)
- Spawn an **independent** code-agent (Agent tool) with:
  - The debug report content
  - The public scenarios
  - Explicit instruction: **bugfix mode, Step 1 only — write the failing test, NO source code changes**
- Wait for completion
- **Verify**: Check that the code-agent ONLY created/modified test files (no source code changes)
- **Verify**: Run the test and confirm it FAILS (this proves the bug)
- If the test passes instead of failing → the test is wrong. Report to developer, do NOT proceed.

### Step 2: Green Phase (Fix the Bug)
- Spawn an **independent** code-agent (Agent tool) with:
  - The debug report content
  - The public scenarios
  - The test file path from Step 1
  - Explicit instruction: **bugfix mode, Step 2 only — implement the fix, NO test file changes**
- Wait for completion
- **Verify**: Check that the code-agent ONLY modified source files (no test changes)
- **Verify**: Run the failing test from Step 1 and confirm it now PASSES
- **Verify**: Run ALL existing tests and confirm they still pass (no regression)
- If the test still fails → the fix didn't address the root cause. Report to developer.
- If existing tests break → the fix has regression. Go back to Step 2 (max 3 rounds).

### Step 3: Holdout Validation
- Spawn an **independent** test-agent (Agent tool) with:
  - The feature name (test-agent reads holdout scenarios itself)
  - The debug report path
- Wait for completion
- Read the results file from `dark-factory/results/{name}/`
- If all passed → proceed to Step 4 (Promote)
- If failures and rounds < 3 → extract behavioral descriptions, go back to Step 2
- If failures and rounds = 3 → report to developer

## Post-Implementation Lifecycle

When all holdout tests pass:

**Step 4: Promote**
- Update `dark-factory/manifest.json`: set feature status to `"passed"`, record `"passed"` timestamp
- Spawn an **independent** promote-agent (Agent tool with `.claude/agents/promote-agent.md`) with:
  - The feature name
  - The holdout test file path from `dark-factory/results/{name}/`
- Wait for completion
- If promoted tests pass:
  - Update manifest: set status to `"promoted"`, record `"promotedTestPath"` and `"promoted"` timestamp
- If promoted tests fail:
  - Update manifest: set status to `"passed"` (do NOT archive)
  - Report failure to developer and STOP — do not proceed to Step 5

**Step 5: Archive**
- Move spec file to `dark-factory/archive/{name}/spec.md`
- Move `dark-factory/scenarios/public/{name}/` to `dark-factory/archive/{name}/scenarios/public/`
- Move `dark-factory/scenarios/holdout/{name}/` to `dark-factory/archive/{name}/scenarios/holdout/`
- Delete `dark-factory/results/{name}/` (results are gitignored, no need to archive)
- Update manifest: set status to `"archived"`, record `"archived"` timestamp
- Report: archived feature, promoted test path

## Information Barrier Rules
- NEVER pass holdout scenario content to the code-agent
- NEVER pass public scenario content to the test-agent
- NEVER pass test/scenario content to the architect-agent
- The architect-agent communicates ONLY about spec content with spec/debug agents — never about tests
- Each agent spawn is completely independent (fresh context)
- Only pass: spec content, scenario content (appropriate type), and sanitized failure summaries
