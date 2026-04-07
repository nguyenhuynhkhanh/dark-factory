# Holdout Validation Results — cli-event-logging

## Overall: PASS

**Date**: 2026-04-07  
**Public suite**: 19/19 pass  
**Holdout suite**: 19/19 pass

---

## Per-Scenario Results

| Scenario | Status | Notes |
|----------|--------|-------|
| H-01: Empty apiKey string — silent drop | ✅ PASS | |
| H-02a: JSON null apiKey — silent drop | ✅ PASS | jq `// empty` correctly returns "" for null |
| H-02b: Missing apiKey key — silent drop | ✅ PASS | |
| H-03: 4xx during flush — drop and continue | ✅ PASS | |
| H-04: First queue write schema (version:1) | ✅ PASS | |
| H-05: Partial flush — successes removed, 5xx kept | ✅ PASS | |
| H-06a: Empty file treated as corrupted | ✅ PASS | |
| H-06b: Plain array treated as corrupted | ✅ PASS | version check rejects non-object |
| H-06c: Bare `{}` treated as corrupted | ✅ PASS | |
| H-07: Large queue (5 events) — full drain before current | ✅ PASS | 6 total curl calls, correct order |
| H-08: Missing `~/.df-factory/` — auto-created | ✅ PASS | |
| H-09: Concurrent invocations — both events survive | ✅ PASS | flock/mkdir-lock serializes correctly |
| H-10a: Config invalid JSON — exit 0 silent | ✅ PASS | |
| H-10b: curl stderr suppressed | ✅ PASS | exec >/dev/null 2>&1 captures it |
| H-10c: Read-only directory — exit 0 no crash | ✅ PASS | |
| H-10d: No arguments — exit 0 no output | ✅ PASS | |
| H-11: Trailing slash in baseUrl — no double-slash | ✅ PASS | `${baseUrl%/}` normalization works |
| H-12: Special characters in payload — verbatim | ✅ PASS | double-quoted `"$payload"` to curl |
| H-13: No arguments — silent drop | ✅ PASS | |
