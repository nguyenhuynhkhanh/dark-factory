# Scenario: P-NEW-02 — Onboard-agent generates index.md after writing all shards

## Type
feature

## Priority
critical — FR-17b, AC-16. Index generation is a new responsibility; if it is not documented in the agent file, the code-agent will not implement it.

## Preconditions
- Phase 3.7 or Phase 7 Memory Sign-Off documents index generation.
- Bootstrap Write Exception references index.md.

## Action
Structural test asserts the agent file documents the index generation step with at minimum:
1. Index generation occurs AFTER all shard files and `ledger.md` are written.
2. Generation scans all written shard files and `ledger.md` to collect entries.
3. One heading row per entry using the format:
   `## {ID} [type:{type}] [domain:{domain}] [tags:{comma-joined-or-empty}] [status:active] [shard:{filename}]`
   followed by a one-line description on the next line.
4. Rows are written in ID-ascending order.
5. Index frontmatter contains at minimum: `version: 1`, `lastUpdated`, `generatedBy: onboard-agent`, `gitHash`, `entryCount`, `shardCount`.
6. `index.md` is listed in the Bootstrap Write Exception section as one of the files onboard-agent is authorized to write.

## Expected Outcome
- All six assertions pass.
- The heading row format string (or close equivalent with all named fields) is present in the documentation.
- Index frontmatter fields are all named.
- Bootstrap Write Exception includes `index.md`.

## Failure Mode (if applicable)
If the heading row format is absent, test names it. If any frontmatter field is missing from the spec, test names it. If `index.md` is absent from the Bootstrap Write Exception, test flags it.

## Notes
The heading row format is a contract with consumers — any deviation from the documented format will break consumer agents that parse the index. The format must be documented precisely enough that an implementation can produce it without guessing. The `[tags:{comma-joined-or-empty}]` field uses comma-joined tags (e.g., `[tags:auth,schema]`) or the literal string `[tags:]` when no tags exist — this distinction must be clear in the agent file.
