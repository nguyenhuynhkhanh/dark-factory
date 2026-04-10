## Domain Review: API Design & Backward Compatibility

### Feature: adaptive-lead-count
### Status: APPROVED WITH NOTES

### Findings

- **Blockers**: None

- **Concerns**:
  - C1: **Backward compatibility of the default behavior change**: Before this feature, `/df-intake {description}` ALWAYS spawns 3 leads. After this feature, the same command MAY spawn 1 lead. Any developer who has relied on the 3-lead guarantee (e.g., documented in team runbooks, expected by downstream tooling, or assumed in related SKILL/rule files) will get different behavior. The scope evaluation algorithm cannot guarantee the same output for the same input across time (e.g., if code-map.md is added later, the result could change from 1 lead to 3 leads for the same description). This is a behavioral contract change on the core command. The spec acknowledges this via NFR-4 ("3-lead path MUST produce identical behaviour") but does not address the default-path behavioral shift. This is acceptable — it's the entire purpose of the feature — but it should be called out as an explicit breaking change for the 1-lead default path.
  - C2: **--leads flag discoverability**: The spec adds `--leads=1` and `--leads=3` flags but does not specify where these are documented in the user-facing trigger syntax. Currently the SKILL.md Trigger section only shows `/df-intake {raw description}`. After this change, the Trigger section must be updated to also show the `--leads` flag variants. FR-10 updates the frontmatter description but the Trigger section update is only mentioned in the Affected Files table note ("add `--leads` flag to Trigger section"). This should be an explicit requirement, not just a note. Track C's assertion "—leads flag documented in Trigger" catches this, but it belongs as an FR, not just an implicit test expectation.
  - C3: **Error message consistency**: The spec specifies two different error messages with slightly different wording: "Valid values are 1 or 3. Use `--leads=1` or `--leads=3`." (Error Handling table) vs. "Valid values are --leads=1 or --leads=3." (Override Mechanism section). These are inconsistent. The implementation will pick one. The spec should normalize to a single canonical error message.
  - C4: **CLAUDE.md in this repo vs. generated CLAUDE.md**: The spec targets the `CLAUDE.md` at the repo root (Track B). Per the project profile, CLAUDE.md has a "dual role" — it configures Claude Code for working on Dark Factory AND serves as a template for what `getClaudeMdSection()` generates for target projects. The `getClaudeMdSection()` function in `scripts/init-dark-factory.js` generates a similar but not identical CLAUDE.md block. The spec only updates the root CLAUDE.md; it does not update `getClaudeMdSection()` in the init script. New projects initialized after this feature ships will get CLAUDE.md documentation that still says "3 parallel spec-agents" for df-intake.

- **Suggestions**:
  - S1: Normalize the error message between the Error Handling table and the Override Mechanism section to a single canonical string.
  - S2: Promote "add `--leads` flag to Trigger section" from a note in the Affected Files table to an explicit functional requirement (e.g., FR-12).
  - S3: Add `scripts/init-dark-factory.js` to the Affected Files table for the `getClaudeMdSection()` function update (consistent with Architecture domain finding C1 on the same issue).

### Key Decisions

- --leads flag as a command-line-style override on the slash command: Correct pattern for this system. The flag is parsed from the developer's text input by Claude — no shell argument parsing needed. APPROVED.
- Scope eval block always shown (even with --leads override): Correct. Gives the developer the "what would have happened" context without adding a confirmation step. APPROVED.
- EC-7 (both --leads=1 and --leads=3) rejection: Specified correctly in Edge Cases. APPROVED.
- Plugin mirror contract (FR-9): Character-for-character identity enforced by existing test. APPROVED.
- Behavioral contract change for default path: Acceptable — it is the stated purpose of the feature. The 3-lead path remains unchanged (NFR-4). The scope eval block gives developers visibility into what was decided and why. APPROVED.
