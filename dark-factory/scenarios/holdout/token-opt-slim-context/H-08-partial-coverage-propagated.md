# Scenario: partial-coverage flag is propagated from code-map.md to code-map-slim.md

## Type
edge-case

## Priority
medium — a slim map that claims FULL coverage when the full map is PARTIAL would mislead consumers into trusting the hotspot table more than they should.

## Preconditions
- `dark-factory/code-map.md` exists with a `Coverage: PARTIAL — fan-in set truncated at 20 modules` header line (simulating a large repository where incremental refresh hit the 20-module cap).
- `dark-factory/code-map-slim.md` has been generated from this partial full map.

## Action
Read both `dark-factory/code-map.md` and `dark-factory/code-map-slim.md`. Compare the `Coverage:` header line.

## Expected Outcome
- `code-map-slim.md` carries `Coverage: PARTIAL — fan-in set truncated at 20 modules` (or the same partial coverage message as the full map).
- `code-map-slim.md` does NOT say `Coverage: FULL` when the full map says `PARTIAL`.
- The `Git hash:` value in the slim map still matches the full map.

## Failure Mode
If the slim map shows `Coverage: FULL` when the full map is PARTIAL: any agent reading the slim map's coverage field gets incorrect freshness information and may skip a full-scan when one is warranted.

## Notes
Validates EC-4. Holdout because this edge case only occurs when a large project triggers the 20-module fan-in cap in codemap-agent's incremental refresh — an unusual condition that an implementer might not test explicitly.
