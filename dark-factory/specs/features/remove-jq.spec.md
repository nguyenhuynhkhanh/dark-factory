# Feature: remove-jq

## Context

The CLI shell scripts in `cli-lib/` require `jq` — a third-party JSON processor that is not installed by default on macOS or most Linux distributions. When `jq` is absent, `log-event.sh` silently exits doing nothing (line 18 hard-gates on `command -v jq`), and `df-check-onboard.sh` fails entirely because it calls `jq` unconditionally with no fallback. Only `df-onboard.sh` has a working shell fallback, but it still checks for `jq` and prefers it when available.

The developer has decided not to require users to install any additional tools. All scripts must work with only `bash` and `curl`. Since the config file is a simple, flat JSON object written and controlled entirely by these scripts, it can be parsed safely with `grep`/`sed` without risk of false positives.

## Scope

### In Scope (this spec)
- Remove all `jq` usage from `cli-lib/df-onboard.sh`
- Remove all `jq` usage from `cli-lib/df-check-onboard.sh`
- Remove all `jq` usage from `cli-lib/log-event.sh`
- Remove all `command -v jq` availability checks from all three files
- Implement shell-native replacements for every `jq` operation using `grep`, `sed`, `printf`, `awk`, or POSIX shell builtins
- Preserve identical observable behavior: same outputs, same exit codes, same error messages, same config file format

### Out of Scope (explicitly deferred)
- Changes to any other file outside the three named scripts
- Changing the config file format (`~/.df-factory/config.json`)
- Changing the queue file format (`~/.df-factory/event-queue.json`)
- Adding any new external dependencies
- Refactoring logic unrelated to jq removal (lock mechanism, retry logic, curl invocation, etc.)
- Support for multi-line JSON values, nested objects, or arrays within config values

### Scaling Path
The flat-JSON parsing approach is sufficient for the current config schema. If the config ever gains nested structures, the project should revisit whether a minimal JSON parser bundled inline (pure shell) or a different storage format (e.g., a `.env`-style key=value file) is appropriate.

## Requirements

### Functional

- FR-1: `df-onboard.sh` must write `~/.df-factory/config.json` using only `printf` — the dual `jq`/fallback branching must be removed and the `printf` path must become the sole implementation.
- FR-2: `df-onboard.sh` must build the activation request body using only `printf` — the dual `jq`/fallback branching for `REQUEST_BODY` must be removed and the `printf` path must become the sole implementation.
- FR-3: `df-check-onboard.sh` must read `apiKey` and `baseUrl` from the config file using `grep`/`sed` without calling `jq`.
- FR-4: `log-event.sh` must not exit early when `jq` is absent — the `command -v jq || exit 0` guard must be removed.
- FR-5: `log-event.sh` must read `apiKey` and `baseUrl` from the config file using `grep`/`sed` without calling `jq`.
- FR-6: `log-event.sh` must parse and manipulate the event queue file (`event-queue.json`) using shell-native tools only.
- FR-7: All three scripts must produce byte-for-byte identical outputs (stdout, stderr, exit codes) compared to the jq-based implementation, for all inputs within the defined config format.
- FR-8: Values containing forward slashes (e.g., `https://example.com/path`) and spaces must be correctly extracted by the shell parsing implementation.

### Non-Functional

- NFR-1: No new runtime dependencies beyond `bash` and `curl` may be introduced.
- NFR-2: The parsing logic for the flat JSON config must not rely on line ordering within the file — it must locate fields by key name.
- NFR-3: Scripts must continue to be silent by default (`exec >/dev/null 2>&1` in `log-event.sh`); the jq removal must not introduce new output.

## Data Model

No changes to stored formats. The config file format remains:
```json
{
  "apiKey": "sk-abc123",
  "baseUrl": "https://example.com"
}
```

The event queue file format remains:
```json
{"version":1,"events":[{"queuedAt":"...","payload":{...}}]}
```

The shell parsing implementation must correctly read values from the config format above. The implementation may assume:
- One key-value pair per line (as written by `df-onboard.sh`)
- Keys are double-quoted strings
- Values are double-quoted strings (no nested objects or arrays)
- No escaped double quotes within values (API keys and URLs do not contain `"`)

## Migration & Deployment

N/A — no existing data affected. The config file format written to disk is unchanged. Users who already have `~/.df-factory/config.json` will have their files read correctly by the new implementation. Users who have `jq` installed will notice no behavioral difference. Users who do not have `jq` installed will now have all three scripts work correctly instead of failing or silently doing nothing.

## API Endpoints

No changes to API endpoints. The scripts call the same server endpoints as before.

## Business Rules

- BR-1: Config field extraction must find the value of a key by name, not by line number. The grep/sed pattern must match `"apiKey":` or `"baseUrl":` and extract the string value that follows on the same line.
- BR-2: If `grep`/`sed` extraction yields an empty string (key absent or value is `""`), the empty-value handling must be identical to the previous `jq -r '.key // empty'` behavior — treat the field as missing and produce the appropriate error or early exit.
- BR-3: The `printf`-based JSON construction in `df-onboard.sh` for `REQUEST_BODY` and `CONFIG_JSON` must produce valid JSON that the server can parse. No escaping of special characters in `COMPUTER_NAME` or `GIT_USER_ID` is required beyond what the existing fallback already performs, since those values are controlled by the local machine.
- BR-4: Queue JSON manipulation in `log-event.sh` must preserve the `{"version":1,"events":[...]}` envelope format when writing events back. The shell implementation must not corrupt this envelope on partial failure.
- BR-5: A queue file with a `version` field other than `1`, or with an `events` field that is not an array, must be treated as corrupt and reset to an empty event list, identical to the existing jq-based validation logic.

## Error Handling

| Scenario | Response | Side Effects |
|----------|----------|--------------|
| Config file missing at check time | Exit 1, print "DF is not configured. Run df-onboard.sh first." | None |
| `apiKey` field absent or empty in config | Exit 1, print "DF is not configured. Run df-onboard.sh first." | None |
| `baseUrl` field absent or empty in config | Exit 1, print "DF is not configured. Run df-onboard.sh first." | None |
| Queue file absent | Treat as empty queue, proceed normally | None |
| Queue file present but empty | Treat as empty queue, proceed normally | None |
| Queue file has wrong version | Discard queue contents, treat as empty | Queue file left as-is or removed on next write |
| Queue file has `events` that is not an array | Discard, treat as empty | Same as above |
| `log-event.sh` called with no argument | Silent exit 0 | None |
| `log-event.sh` called without config file | Silent exit 0 | None |

## Acceptance Criteria

- [ ] AC-1: `df-onboard.sh` contains no occurrence of the string `jq`.
- [ ] AC-2: `df-check-onboard.sh` contains no occurrence of the string `jq`.
- [ ] AC-3: `log-event.sh` contains no occurrence of the string `jq`.
- [ ] AC-4: Running `df-onboard.sh` on a machine without `jq` installed produces a valid `~/.df-factory/config.json` with correct `apiKey` and `baseUrl` values.
- [ ] AC-5: Running `df-check-onboard.sh` on a machine without `jq` installed exits 0 when config is valid and exits 1 with the correct message when config is missing or incomplete.
- [ ] AC-6: Running `log-event.sh` on a machine without `jq` installed sends events to the server and queues events when offline.
- [ ] AC-7: A `baseUrl` value containing `https://` (forward slashes) is extracted correctly by `df-check-onboard.sh` and `log-event.sh`.
- [ ] AC-8: Re-running `df-onboard.sh` when a config already exists prompts the user and overwrites on confirmation, identical to before.
- [ ] AC-9: `log-event.sh` correctly flushes a non-empty event queue (events written by a previous run) when a new event is submitted and the server is reachable.
- [ ] AC-10: No script produces any output to stdout or stderr that was not produced before the change.

## Edge Cases

- EC-1: `baseUrl` value contains `https://example.com/sub/path` — forward slashes inside the value must not confuse `sed` delimiters. Use a delimiter other than `/` (e.g., `|` or `#`) in the sed expression.
- EC-2: `apiKey` value contains only digits (e.g., `12345`) — must still be extracted correctly.
- EC-3: Config file exists but contains only whitespace or zero bytes — must be treated as missing/corrupt and produce the "not configured" error.
- EC-4: Queue file `events` array is `[]` (empty array) — must be treated as an empty queue, not as an error.
- EC-5: Queue file is syntactically invalid JSON (truncated mid-write from a previous crash) — must be discarded and treated as empty without crashing the script.
- EC-6: `df-onboard.sh` is run in a shell where `COMPUTER_NAME` (hostname) contains a space — the `printf`-based request body must still produce valid JSON (the existing fallback does not escape the value; this spec does not change that behavior, but the code-agent must not regress it).
- EC-7: `log-event.sh` is invoked while another instance is running concurrently — locking behavior is unchanged; jq removal must not touch the lock mechanism.
- EC-8: The queue file is written by `log-event.sh` and then read by a subsequent invocation — the shell-based queue writer must produce output that the shell-based queue reader can parse on the next run.

## Dependencies

None — this spec is independently implementable.

## Implementation Size Estimate

- **Scope size**: small (3 files)
- **Suggested parallel tracks**: 1 code-agent implementing all three files sequentially, since the files share the same config-reading pattern and a consistent grep/sed approach must be established once and applied uniformly.

## Implementation Notes

**Config field extraction pattern (for `df-check-onboard.sh` and `log-event.sh`)**

The following pattern reliably extracts a string value from the flat config format. Use `|` as the sed delimiter to avoid conflicts with `/` in URLs:

```sh
API_KEY="$(grep '"apiKey"' "$CONFIG_FILE" | sed 's|.*"apiKey"[[:space:]]*:[[:space:]]*"||;s|".*||')"
BASE_URL="$(grep '"baseUrl"' "$CONFIG_FILE" | sed 's|.*"baseUrl"[[:space:]]*:[[:space:]]*"||;s|".*||')"
```

This strips everything up to and including the opening quote of the value, then strips the closing quote and everything after it. It is safe for values containing `/`, `:`, digits, and hyphens (all characters present in valid API keys and HTTPS URLs for this project).

**Queue JSON manipulation in `log-event.sh`**

The queue has significant `jq` usage that must be replaced with shell equivalents. The recommended approach:

- **Version check**: `grep -q '"version"[[:space:]]*:[[:space:]]*1' "$QUEUE_FILE"` — if not matched, treat as corrupt.
- **Events extraction**: The events array occupies the `"events":` value. Since the queue file is written by the scripts themselves as a single line (`{"version":1,"events":[...]}`), the entire events array can be extracted with sed by stripping the envelope.
- **Array length**: Count newline-separated entries — since each event object is appended as a distinct JSON object, use `printf` + counting rather than `jq length`. Alternatively, store events one-per-line in a temp variable and count lines.
- **Array indexing**: Iterate over events by splitting on a safe delimiter rather than by index. Since each event entry is a JSON object on a known structural pattern, `awk` can be used to split the array contents.
- **Array append**: Use `printf` to concatenate the existing array contents with the new entry, with a `,` separator.

The code-agent has latitude to choose any consistent shell-native approach that satisfies BR-4 and BR-5, passes the acceptance criteria, and does not introduce new external dependencies.

**`df-onboard.sh` simplification**

Remove lines 60-67 (jq/fallback branch for `REQUEST_BODY`) and replace with the single-line `printf` version. Remove lines 114-121 (jq/fallback branch for `CONFIG_JSON`) and replace with the single-line `printf` version. The result is strictly simpler than the current code.

## Traceability

| Spec Item | Scenario(s) |
|-----------|-------------|
| FR-1 | P-01, P-02 |
| FR-2 | P-01 |
| FR-3 | P-03, P-04, H-01, H-02 |
| FR-4 | P-05, H-05 |
| FR-5 | P-05, H-01, H-02 |
| FR-6 | P-06, P-07, H-03, H-04, H-06 |
| FR-7 | P-01, P-02, P-03, P-04, P-05, P-06, P-07 |
| FR-8 | H-01, H-03 |
| BR-1 | P-03, P-04, H-01, H-02 |
| BR-2 | P-04, H-02 |
| BR-3 | P-01 |
| BR-4 | P-06, P-07, H-04 |
| BR-5 | H-06 |
| EC-1 | H-01, H-03 |
| EC-2 | P-03 |
| EC-3 | H-02 |
| EC-4 | P-06 |
| EC-5 | H-06 |
| EC-6 | H-07 |
| EC-7 | H-08 |
| EC-8 | P-07 |
| AC-4 | P-01, P-02 |
| AC-5 | P-03, P-04 |
| AC-6 | P-05, P-06, P-07 |
| AC-7 | H-01, H-03 |
| AC-8 | P-02 |
| AC-9 | P-07 |
