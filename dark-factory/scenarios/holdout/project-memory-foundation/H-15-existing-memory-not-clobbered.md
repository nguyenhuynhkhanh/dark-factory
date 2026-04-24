# Scenario: Foundation install does not clobber a pre-existing memory directory

## Type
failure-recovery

## Priority
medium — defensive. In the current repo the directory does not exist, but a user who pulls the branch may have manually created `dark-factory/memory/` with real content.

## Preconditions
- Simulated or actual state where `dark-factory/memory/` already exists with at least one REAL (non-skeleton) entry. For this scenario, the test runner may construct a temp directory simulating this state OR inspect the implementation logic directly.

## Action
Inspect the implementation of this spec (the code that creates the skeleton files). Verify that:
- The implementation checks whether `dark-factory/memory/index.md` already exists before writing.
- The implementation checks whether any shard file already exists with `## INV-\d{4}:` or `## DEC-\d{4}:` content before writing.
- If any file already exists with real (`INV-\d{4}` / `DEC-\d{4}` / `FEAT-\d{4}`) content, the implementation MUST NOT overwrite it.
- If the file exists with only frontmatter content (zero entries), OR does not exist, the implementation MAY create the skeleton.

If the implementation is purely declarative (files shipped in the repo at commit time, no runtime installer), document that fact and confirm the setup test does not attempt to re-create the files.

## Expected Outcome
- No pre-existing real memory is lost in any install path.
- The design choice (declarative file shipping vs runtime installer) is explicit and tested.
- For the new 8-file layout: all eight files are subject to the non-clobber check individually (not just `invariants.md` / `decisions.md` as in the old layout).

## Notes
Validates EC-10. Defensive contract — catches the class of bug where a "reinstall" or "repair" action silently overwrites user data. Updated from original H-15 to reference the 8-file layout instead of the old 3-file layout.
