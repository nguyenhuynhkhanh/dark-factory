## Architect Review: adaptive-lead-count

### Rounds: 1 (parallel domain review)

### Status: APPROVED WITH NOTES

### Key Decisions Made

- **Inline scope evaluation (no agent spawn)**: Architecturally correct — spawning an agent to make a binary decision defeats the purpose. The five-criteria algorithm runs as orchestrator inline reasoning. Rationale: efficiency is the entire goal of this feature; an agent spawn for evaluation would add the same latency being saved.
- **Binary 1-or-3 decision (no intermediate tier)**: A 2-lead tier is explicitly out of scope and correctly excluded. A binary decision keeps the SKILL.md logic readable and maintainable. Rationale: introduction of a 2-lead tier creates ambiguity about what "medium" coverage means; binary is unambiguous.
- **Conservative bias rule (default to 3 leads on conflict/missing data)**: Correct defensive posture — under-staffing a spec is worse than over-staffing. When code-map.md is absent, both C1 and C5 fail, ensuring 3 leads. Rationale: absence of evidence is not evidence of simple scope.
- **Plugin mirror atomicity (FR-9)**: Both SKILL.md files updated in same Track A, enforced by existing test at line 853. Character-for-character identity required. Correct.
- **Step 2 collapse for 1-lead path**: Synthesizing a single report is logically redundant. Presenting the single lead's output directly is the right approach. Rationale: synthesis adds latency and complexity with zero benefit when there is only one lead.
- **--leads flag always shows scope eval**: Correct. Gives developers the "what would have happened" context without adding a confirmation gate. Rationale: override without visibility creates silent quality bypasses.

### Remaining Notes (APPROVED WITH NOTES)

- **CRITICAL: `scripts/init-dark-factory.js` is missing from the Affected Files table.** The project profile explicitly states: "Changes to agent behavior must be made in TWO places: the actual .md file AND the corresponding generator function in init-dark-factory.js." This feature modifies df-intake behavior. The init script contains an inline template literal for df-intake SKILL.md content AND a `getClaudeMdSection()` function that generates target-project CLAUDE.md. Both must be updated to reflect: Step 0 scope evaluation, the --leads flag in the Trigger section, the updated frontmatter description, and the updated df-intake description in the CLAUDE.md block. Without this, new projects initialized after this feature ships will receive broken df-intake behavior. **The code-agent MUST update `scripts/init-dark-factory.js` as part of Track A (SKILL.md content) and Track B (CLAUDE.md content). Add this file to the Affected Files table before implementation begins.**

- **Error message inconsistency**: The Error Handling table says "Valid values are 1 or 3. Use `--leads=1` or `--leads=3`." and the Override Mechanism section says "Valid values are --leads=1 or --leads=3." These must be normalized to one canonical string. Recommendation: use the more explicit form "Valid values are --leads=1 or --leads=3." (includes the flag prefix for clarity).

- **Scope evaluation is exhaustive (all 5 criteria always evaluated)**: The output block format implies all five criteria are always reported regardless of earlier failures. This should be confirmed as the intended behavior — exhaustive evaluation with all five lines in the output block, not short-circuit evaluation that stops at first failure.

- **--leads flag in Trigger section**: Currently only referenced as a note in the Affected Files table. Should be implemented as an explicit update: the Trigger section of the SKILL.md must show both `/df-intake {raw description}` and `/df-intake --leads=1 {description}` / `/df-intake --leads=3 {description}` variants. Track C's test assertion will catch if this is missed.

- **Behavioral contract change acknowledged**: The default `/df-intake {description}` behavior changes from always-3-leads to adaptive (1 or 3). This is the stated purpose of the feature. The 3-lead path is preserved unchanged (NFR-4). The scope eval block gives developers visibility. Acceptable.
