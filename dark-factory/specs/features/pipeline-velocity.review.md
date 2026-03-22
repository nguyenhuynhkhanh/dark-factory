## Architect Review: pipeline-velocity

### Rounds: 3

### Status: APPROVED WITH NOTES

### Key Decisions Made

- **Tiered review gating is the primary velocity gain**: The spec correctly identifies that forcing 3-round reviews on small changes wastes time. The tier system (small=skip, medium=1 round, large=parallel) is well-designed. The main velocity improvement comes from the skip and single-round paths, not from parallelizing the large-scope reviews. This is acceptable -- the parallelism provides marginal benefit for large specs and meaningful benefit for the overall architecture consistency.

- **Single architect-agent with domain parameter over separate agent files**: This avoids agent sprawl and keeps the system predictable. The domain parameter passed via natural language instruction is pragmatic for a prompt-engineering framework where agents are markdown files, not code modules.

- **Whitelist-based findings extraction preserves information barrier**: Only forwarding "Key Decisions Made" and "Remaining Notes" sections is a sound defense-in-depth approach. The current review file format does not contain round-by-round discussion, so the stripping is future-proofing -- acceptable and low-cost.

- **Strictest-wins aggregation with developer escalation for contradictions**: FR-9 and BR-4 are sound. No domain should be able to silently override another domain's BLOCKED status.

- **Always-review pattern matching elevates but never lowers**: BR-1's one-directional elevation rule is correct for a safety-oriented system. False positives from substring matching (e.g., "auth" matching "author") are acceptable because elevation only means more review, not less. Over-review is a better failure mode than under-review.

- **Legacy init script deletion is safe**: The `bin/cli.js` + `template/` directory is the canonical path. The init script's dual-source-of-truth problem is the project's most fragile area (per the project profile). Removing it is a net improvement.

- **Manifest schema changes are additive and backward compatible**: Existing entries without the new fields (scopeSize, reviewMode, estimatedFiles, actualFiles) are treated as null. This is clean.

### Remaining Notes (APPROVED WITH NOTES)

- **Missing files in dependency list**: The spec lists 10 files to modify but does not include `README.md` (root), `dark-factory/README.md`, or `dark-factory/project-profile.md`. All three contain "3+ rounds" language that will become inaccurate after this change. The root `README.md` mentions "3+ rounds" in at least 6 places. `dark-factory/README.md` mentions it in at least 7 places. These files should be updated to reflect the tiered review model, or at minimum the spec should acknowledge them as known documentation drift to be addressed in a follow-up. This is not a blocker because stale documentation does not break the pipeline, but it creates confusion for new users who read the README and expect 3+ mandatory rounds. The implementation agent should be made aware of this gap.

- **Domain boundary overlap is inherent and acceptable**: The three review domains (Security/Data Integrity, Architecture/Performance, API Design/Backward Compatibility) have natural overlap (e.g., error handling spans API and Security, backward compatibility spans Architecture and API). The spec handles contradictions (FR-9, BR-4) but does not address duplicated findings. In practice, duplicated findings across domains are harmless -- they reinforce each other rather than conflict. No spec change needed, but the orchestrator's synthesis step should deduplicate when producing the final review.

- **Architect-agent domain focus mechanism needs implementation clarity**: The spec says the domain parameter narrows review focus via natural language instruction, but the current architect-agent has a fixed "What You Evaluate" section listing all domains. The implementation should add a domain-aware section that tells the agent: "When given a domain parameter, focus ONLY on the evaluation criteria listed for your assigned domain. Defer all other concerns to the other domain reviewers." Without this, domain architects may still produce full-spectrum reviews, defeating the purpose of parallelism.

- **Post-hoc file count (FR-15) assumes git availability**: The spec uses `git diff` to count actual files modified. This is fine for most projects but will silently fail for non-git projects. The error handling table covers this (set actualFiles to null), which is acceptable.

- **Project profile will be stale after implementation**: The project profile at `dark-factory/project-profile.md` currently describes the init script as the canonical installation path and tells developers to update agent content in two places. After the init script is deleted, this guidance is wrong. A `/df-onboard` refresh should be recommended post-implementation, or the profile update should be included in the implementation scope. Not a blocker since the profile is advisory, not functional.

- **Self-referential change**: This spec modifies the architect-agent and orchestrator that are being used to review this very spec. The current review was conducted under the existing 3-round sequential model. After implementation, future reviews will use the tiered model. No transition issue exists because the review file format (Status, Key Decisions, Remaining Notes, Blockers) remains backward compatible, and in-flight features with existing APPROVED reviews are unaffected (the orchestrator skips review for those).
