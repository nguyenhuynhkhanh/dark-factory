## Domain Review: Architecture & Performance

### Feature: adaptive-lead-count
### Status: APPROVED WITH NOTES

### Findings

- **Blockers**: None

- **Concerns**:
  - C1: **Dual source-of-truth maintenance burden**: The spec correctly identifies that `.claude/skills/df-intake/SKILL.md` and `plugins/dark-factory/skills/df-intake/SKILL.md` must be identical (FR-9, AC-7). The project profile (Structural Notes) explicitly calls this the "most fragile part" of the codebase — escaped backticks, nested template strings. Track A must treat these two files as a single atomic unit. The existing test at line 853 of `tests/dark-factory-setup.test.js` enforces this via `assert.equal(source, plugin, ...)` — this is the right control, and the spec calls it out. However, the spec does NOT mention that `scripts/init-dark-factory.js` also contains an inline copy of the df-intake SKILL content as a template literal. Per the project profile: "Changes to agent behavior must be made in TWO places: the actual .md file AND the corresponding generator function in init-dark-factory.js." The spec's "Affected Files" table does NOT list `scripts/init-dark-factory.js` as a required change. This is a concern: after this feature ships, the init script will still generate df-intake SKILL.md with the OLD content (no Step 0, no --leads flag, no adaptive behavior). New projects initialized after this feature ships will get a broken df-intake that doesn't match what's documented.
  - C2: **inline scope evaluation algorithm complexity**: The five-criteria algorithm is inline orchestrator reasoning — no agent spawn, no function call. This is architecturally correct per NFR-1. However, the algorithm's C4 criterion ("or" in normal phrases counts as ambiguity) makes the algorithm inherently fuzzy and difficult to reason about. The conservative bias (NFR-2) handles this well. No blocker, but the spec should clarify whether the criteria evaluation is strictly sequential (first failure triggers 3-lead immediately) or exhaustive (all five always evaluated). The spec currently says "ALL must be true" but doesn't specify whether evaluation is short-circuit or exhaustive. The output block format implies exhaustive (all five criteria always reported) — the spec should confirm this.

- **Suggestions**:
  - S1: Add `scripts/init-dark-factory.js` to the "Affected Files" table as a Track A requirement. This is not optional — the project profile explicitly states this dual-source pattern is mandatory for all behavior changes.
  - S2: Clarify in the Scope Evaluation Algorithm whether evaluation is exhaustive (all five reported in output) or short-circuit (stop at first failure). The output block format implies exhaustive — codify that.
  - S3: The spec says the 3-lead path is "unchanged" (FR-4, NFR-4). Verify Track A doesn't accidentally restructure or reorder any existing 3-lead Steps 1-5 in the SKILL.md while adding Step 0. The implementation should be purely additive at the top, not a rewrite.

### Key Decisions

- Inline scope evaluation (no agent spawn): Architecturally correct. The cost of spawning an agent just to make a binary decision would defeat the purpose. APPROVED.
- Binary 1-or-3 decision (no 2-lead tier): Explicitly out of scope. Keeps the decision tree minimal. APPROVED.
- Step 2 collapse for 1-lead path: Correct — synthesizing a single report is redundant. APPROVED.
- Conservative bias rule: Correct default — underspeccing is worse than overspeccing for this system. APPROVED.
- Critical gap: `scripts/init-dark-factory.js` must also be updated. This is a concern, not a blocker — the feature still works for the current project, but new-project initialization will regress without it.
