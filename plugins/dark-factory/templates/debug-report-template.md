# Debug Report: {name}

## Symptom
What is observed. Error messages, wrong behavior, frequency.

## Severity
critical | high | medium | low — with justification

## Reproduction
### Steps
1. Exact steps to reproduce
2. ...

### Conditions
- Environment requirements
- Data state requirements
- Timing/concurrency requirements (if intermittent)

## Investigation

### Execution Trace
The code path from trigger to failure, with file:line references.

### Root Cause

#### Immediate Cause
The specific code that fails — the direct trigger of the bug (file:line reference, what it does wrong).

#### Deeper Enabling Pattern
The design assumption, missing abstraction, or structural issue that allows this CLASS of bug to exist. The test should target this deeper pattern so it catches variants, not just exact reproductions.

If the immediate cause and deeper pattern are identical (e.g., wrong operator, simple typo), state: "Immediate cause and deeper pattern are identical — no deeper structural issue identified."

### When Introduced
Was this always broken, or did a specific change cause it?
Reference commit/PR if identifiable.

## Impact Analysis

### Affected Code Paths
| Path | How Affected | Risk |
|------|-------------|------|
| {function/endpoint} | {description} | high/medium/low |

### Blast Radius of Fix
What else changes when we fix this? What could break?

### Data Implications
Any data that is currently corrupted or inconsistent due to this bug?
Does the fix need a data migration or cleanup?

### Migration Plan (MANDATORY if fix changes data storage/format/keys)
**Any bugfix that changes how data is stored, formatted, or keyed (field names, code formats, cache keys) MUST include a migration plan.** Don't just fix the code going forward — invalidate/migrate stale data too.
- **Existing data in old format**: What rows/documents/cache entries exist with the old (buggy) format? How many? How to identify them?
- **Migration approach**: In-place migration, backfill script, dual-read with lazy migration, or cache invalidation?
- **Stale cache/derived data**: If cached values or computed fields used the old (buggy) logic, how are they refreshed?
- **Rollback safety**: If the fix is reverted, will migrated data still be readable?
- If the fix does NOT change data storage/format/keys, write "N/A — fix is behavioral only, no stored data affected".

## Systemic Analysis

### Similar Patterns Found
List each similar pattern in the codebase with concrete references. These are listed for awareness only — the developer decides whether to fix them as separate features.

| Location (file:line) | Description | Risk |
|----------------------|-------------|------|
| {file:line} | {what the similar pattern is and how it relates to this bug's root cause} | high/medium/low |

If no similar patterns exist: "No similar patterns found."

### Classification
- **Isolated incident**: This bug is unique to this specific code path; no similar patterns exist elsewhere.
- **Systemic pattern**: The same root cause pattern exists in multiple locations (see Similar Patterns Found).
- **Shared-code risk**: The root cause is in shared/core code used by multiple features.

## Regression Risk Assessment

### Risk Level
high | medium | low — with justification based on how many code paths share the root cause pattern

### Reintroduction Vectors
What future changes could reintroduce this bug? Provide concrete code references, not abstract categories.
- {file:line or module}: {what change would reintroduce the bug and why}

### Variant Paths
Different code paths that exercise the same root cause through different triggers:
- {variant 1}: {path description}
- {variant 2}: {path description}

### Recommended Regression Coverage
Based on risk level, how many variant tests/scenarios should the code-agent and debug-agent write:
- HIGH: 3-5 variant tests covering different paths to the same root cause
- MEDIUM: 1-2 variants focusing on the highest-risk paths
- LOW: Reproduction case only, with justification for no variants

## Proposed Fix

### Approach
What should change and why. Reference specific files and lines.

### What NOT to Change
Explicitly list things that should remain unchanged.
This guides the code-agent to make a minimal, surgical fix.

### Test Strategy
1. Write a failing test that reproduces the exact root cause
2. The test must fail with current code (proves the bug exists)
3. After fix, the test must pass (proves the fix works)
4. Existing tests must continue to pass (proves no regression)

## Acceptance Criteria
- [ ] AC-1: Bug no longer reproduces under original conditions
- [ ] AC-2: Failing test written BEFORE fix proves bug exists
- [ ] AC-3: Fix is minimal — only addresses root cause
- [ ] AC-4: All existing tests still pass (no regression)
- [ ] AC-5: Related edge cases from impact analysis verified
