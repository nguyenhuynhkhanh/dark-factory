## Domain Review: Security & Data Integrity

### Feature: ao-compile-time-agents
### Status: APPROVED

### Findings

**Blockers**: None.

**Concerns**:
- None specific to security domain. This is a build-time infrastructure change that does not touch authentication, authorization, user data, or any security-sensitive code paths.

**Suggestions**:
- The build script writes assembled files to two output directories. The spec already mandates `fs.mkdirSync` with `recursive: true` for missing output directories (Error Handling table). Confirm output writes are to project-internal paths only and not configurable to arbitrary filesystem paths — the `--output-dir` flag mentioned in Implementation Notes should validate the path is within the project root.

### Memory Findings (security)
- Preserved: (none — memory index empty)
- Modified (declared in spec): none
- Potentially violated (BLOCKER): none
- New candidates declared: INV-TBD-c (build-zero-deps) — correctly scoped to architecture domain, not security
- Orphaned: none

### Key Decisions
- Inline substitution (DEC-TBD-a): the include comment is replaced wholesale; this is safe and produces no residual directive artifacts in the output.
- src/ not distributed (DEC-TBD-b): source files do not reach target projects; no attack surface added.
