## Domain Review: Security & Data Integrity

### Feature: codemap-pipeline
### Status: APPROVED WITH NOTES

### Findings

**Blockers**: None.

**Concerns**:

- **Git hash injection via crafted map file**: The incremental refresh runs `git diff --name-only {stored-hash} HEAD` where `{stored-hash}` is read from `dark-factory/code-map.md`. If a map file were modified by an adversary to contain a maliciously crafted hash value (e.g., shell metacharacters), and the skill constructs the git command via string interpolation, there is a potential command injection path. Mitigant: Dark Factory is explicitly single-developer local tooling; the map is only written by Dark Factory itself; the stored hash is a 40-character hex string easily validated before use. **Not a blocker** given the threat model, but implementation should validate the stored hash matches `/^[0-9a-f]{40}$/` before interpolating into the git command.

- **Partial-write integrity**: If the incremental refresh writes partial results to `code-map.md` (scanner failure mid-write), the file could be left in an inconsistent state. The spec addresses this via the `COVERAGE: PARTIAL` flag and instructs the codemap-agent to "write partial results" — but the atomic write behavior (write-then-rename vs in-place overwrite) is unspecified. Recommend: the codemap-agent should write to a temp file and rename atomically. **Not a blocker** — file corruption risk is low for local single-developer use, but noting it.

**Suggestions**:

- The spec explicitly marks concurrent writes as out of scope (single-developer tooling). This is the correct call — no need for file locking at this stage.

- No secrets, no user data, no auth surfaces are introduced by this feature. The feature is entirely local file system + git commands with no network exposure.

### Key Decisions

- **Threat model is local/single-developer**: Security review accepts this scoping. The absence of auth, network calls, and user data means the attack surface is minimal.
- **Hash validation before shell interpolation**: Recommend (not require) validating the stored hash as a 40-char hex string before passing it to the git command.
