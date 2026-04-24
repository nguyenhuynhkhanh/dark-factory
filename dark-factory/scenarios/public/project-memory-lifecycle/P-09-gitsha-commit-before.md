# Scenario: ledger gitSha is commit-BEFORE the cleanup commit (documented clearly)

## Type
feature

## Priority
high — prevents reader confusion and avoids amend complexity.

## Preconditions
- promote-agent.md edited.

## Action
Read promote-agent.md's ledger-gitSha documentation.

## Expected Outcome
- Agent documents computing `gitSha` via `git rev-parse HEAD` BEFORE creating the cleanup commit.
- Prose explicitly states: "gitSha refers to the commit-BEFORE this cleanup commit, not the cleanup commit itself. This avoids the self-referential commit-SHA problem that would otherwise require `git commit --amend`."
- The two-pass amend alternative is explicitly documented as rejected (or simply not used).
- The note is placed within or adjacent to the shard-write and ledger-append step (Step 5 of the expanded write protocol: always append FEAT entry to ledger before the cleanup commit is created).

## Notes
Covers FR-9, BR-10, EC-25. The documentation is load-bearing — without it, future readers see a SHA that seems to reference its own commit and are confused. The shard-first ordering of the write protocol means gitSha is captured before any shard or index writes.
