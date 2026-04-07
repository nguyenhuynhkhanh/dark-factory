#!/usr/bin/env bats
# Promoted from Dark Factory holdout: api-key-management-server
# Root cause: Server-side route handlers must enforce label uniqueness (scoped to
#   non-revoked installs per org), revocation ordering before expiry in requireApiKey,
#   idempotent activate (no "already activated" guard), and active-install counts that
#   exclude revoked installs while never leaking apiKey from dashboard endpoints.
# Guards: app/api/v1/installs/route.ts, lib/auth/requireApiKey.ts,
#         app/api/v1/installs/activate/route.ts, app/api/v1/installs/[id]/revoke/route.ts,
#         app/api/v1/dashboard/stats/route.ts, app/api/v1/dashboard/installs/route.ts

PROJECT_ROOT="$(cd "$(dirname "$BATS_TEST_FILENAME")/../.." && pwd)"

# ── H-01: Duplicate label returns 409 ────────────────────────────────────────

@test "H-01: POST installs uniqueness check includes isNull(revokedAt) filter" {
  # The WHERE clause in the pre-insert SELECT must filter out revoked installs
  # so that label reuse after revocation produces a 201 rather than a false 409.
  run grep -c "isNull" "$PROJECT_ROOT/app/api/v1/installs/route.ts"
  [ "$status" -eq 0 ]
  [ "$output" -ge 1 ]
  grep "isNull" "$PROJECT_ROOT/app/api/v1/installs/route.ts" | grep -q "revokedAt"
}

@test "H-01: POST installs returns 409 with 'label already in use' on duplicate" {
  run grep "label already in use" "$PROJECT_ROOT/app/api/v1/installs/route.ts"
  [ "$status" -eq 0 ]
  run grep "409" "$PROJECT_ROOT/app/api/v1/installs/route.ts"
  [ "$status" -eq 0 ]
}

@test "H-01: POST installs catch block maps UNIQUE constraint violation to 409" {
  # EC-5: concurrent duplicate must also return 409 via the DB constraint catch path.
  # The catch block uses message.toLowerCase().includes("unique") and returns 409.
  node --eval "
    const fs = require('fs');
    const src = fs.readFileSync('$PROJECT_ROOT/app/api/v1/installs/route.ts', 'utf8');
    // Find the catch block that handles UNIQUE constraint violations:
    // it must contain both includes(\"unique\") and a 409 response.
    const includesIdx = src.indexOf('.includes(\"unique\")');
    if (includesIdx === -1) {
      process.stderr.write('includes(\"unique\") check not found\n');
      process.exit(1);
    }
    const region = src.slice(includesIdx, includesIdx + 200);
    if (!region.includes('409')) {
      process.stderr.write('409 not found after includes(\"unique\") check\n');
      process.exit(1);
    }
  "
}

# ── H-02: Revoke-then-activate returns 403 ───────────────────────────────────

@test "H-02: requireApiKey checks revokedAt before expiresAt (ordering assertion)" {
  # The revocation check (if installRow.revokedAt !== null) must appear on an earlier
  # line than the expiry check (if installRow.expiresAt < now) so that a revoked key
  # is rejected before expiry is ever evaluated.
  local revoked_line expiry_line
  revoked_line=$(grep -n "installRow.revokedAt !== null" \
    "$PROJECT_ROOT/lib/auth/requireApiKey.ts" | head -1 | cut -d: -f1)
  expiry_line=$(grep -n "installRow.expiresAt < now" \
    "$PROJECT_ROOT/lib/auth/requireApiKey.ts" | head -1 | cut -d: -f1)
  [ -n "$revoked_line" ]
  [ -n "$expiry_line" ]
  [[ "$revoked_line" -lt "$expiry_line" ]]
}

@test "H-02: requireApiKey returns 403 with 'api key revoked' for revoked installs" {
  run grep "api key revoked" "$PROJECT_ROOT/lib/auth/requireApiKey.ts"
  [ "$status" -eq 0 ]
  run grep "403" "$PROJECT_ROOT/lib/auth/requireApiKey.ts"
  [ "$status" -eq 0 ]
}

@test "H-02: activate route calls requireApiKey before any handler business logic" {
  # requireApiKey must be the first substantive call inside the POST handler body
  # so that a revoked key is rejected before any install-update logic runs.
  node --eval "
    const fs = require('fs');
    const src = fs.readFileSync('$PROJECT_ROOT/app/api/v1/installs/activate/route.ts', 'utf8');
    const postIdx = src.indexOf('export async function POST');
    if (postIdx === -1) { process.stderr.write('POST handler not found\n'); process.exit(1); }
    const body = src.slice(postIdx);
    const reqIdx = body.indexOf('requireApiKey');
    const updateIdx = body.indexOf('.update(');
    if (reqIdx === -1) { process.stderr.write('requireApiKey not found in POST handler\n'); process.exit(1); }
    if (updateIdx !== -1 && updateIdx < reqIdx) {
      process.stderr.write('update() appears before requireApiKey\n');
      process.exit(1);
    }
  "
}

# ── H-03: Activate idempotent — second call succeeds and overwrites ───────────

@test "H-03: activate route has no 'already activated' guard" {
  # FR-11 / BR-7: the handler must unconditionally overwrite — no early return
  # that would block a second activation call based on the existing computerName.
  # We check for patterns that would constitute an "already activated" guard:
  # reading computerName from an existing DB row and returning early if non-null.
  run grep -E "already activated|already active|computerName.*select|select.*computerName" \
    "$PROJECT_ROOT/app/api/v1/installs/activate/route.ts"
  # grep must find nothing — any match would indicate a forbidden guard
  [ "$status" -ne 0 ]
}

@test "H-03: activate route performs unconditional UPDATE of computerName gitUserId expiresAt lastSeenAt" {
  run grep "computerName" "$PROJECT_ROOT/app/api/v1/installs/activate/route.ts"
  [ "$status" -eq 0 ]
  run grep "gitUserId" "$PROJECT_ROOT/app/api/v1/installs/activate/route.ts"
  [ "$status" -eq 0 ]
  run grep "expiresAt" "$PROJECT_ROOT/app/api/v1/installs/activate/route.ts"
  [ "$status" -eq 0 ]
  run grep "lastSeenAt" "$PROJECT_ROOT/app/api/v1/installs/activate/route.ts"
  [ "$status" -eq 0 ]
  # All four fields must appear together in a single .set() call (idempotent overwrite)
  node --eval "
    const fs = require('fs');
    const src = fs.readFileSync('$PROJECT_ROOT/app/api/v1/installs/activate/route.ts', 'utf8');
    const setIdx = src.indexOf('.set(');
    if (setIdx === -1) { process.stderr.write('.set() not found\n'); process.exit(1); }
    const setBlock = src.slice(setIdx, setIdx + 200);
    for (const field of ['computerName', 'gitUserId', 'expiresAt', 'lastSeenAt']) {
      if (!setBlock.includes(field)) {
        process.stderr.write(field + ' not found in .set() block\n');
        process.exit(1);
      }
    }
  "
}

# ── H-04: Active count excludes revoked installs ─────────────────────────────

@test "H-04: stats API query filters revoked_at IS NULL for active install count" {
  run grep "revoked_at IS NULL" "$PROJECT_ROOT/app/api/v1/dashboard/stats/route.ts"
  [ "$status" -eq 0 ]
}

@test "H-04: stats API query filters last_seen_at for active install count" {
  # Only installs seen within the last 30 days should be counted as active.
  run grep "last_seen_at" "$PROJECT_ROOT/app/api/v1/dashboard/stats/route.ts"
  [ "$status" -eq 0 ]
}

@test "H-04: dashboard installs SELECT does not include api_key column" {
  # NFR-2 / BR-3: apiKey must never appear in the dashboard installs response.
  # The raw SQL SELECT in the route must not name the api_key column.
  node --eval "
    const fs = require('fs');
    const src = fs.readFileSync('$PROJECT_ROOT/app/api/v1/dashboard/installs/route.ts', 'utf8');
    // Find the sql template literal block
    const sqlIdx = src.indexOf('sql\`');
    if (sqlIdx === -1) { process.stderr.write('sql template not found\n'); process.exit(1); }
    const sqlBlock = src.slice(sqlIdx, sqlIdx + 800);
    if (sqlBlock.toLowerCase().includes('api_key')) {
      process.stderr.write('api_key found in SELECT — must not be selected\n');
      process.exit(1);
    }
  "
}

@test "H-04: dashboard installs allow-list map does not include apiKey field" {
  # Second layer of defence: the .map() allow-list must not serialize apiKey.
  # apiKey may appear in comments; we check the actual map object for the field.
  node --eval "
    const fs = require('fs');
    const src = fs.readFileSync('$PROJECT_ROOT/app/api/v1/dashboard/installs/route.ts', 'utf8');
    // Strip single-line comments before checking the map block
    const noComments = src.replace(/\/\/[^\n]*/g, '');
    const mapIdx = noComments.indexOf('.map(');
    if (mapIdx === -1) { process.stderr.write('.map( not found\n'); process.exit(1); }
    const mapBlock = noComments.slice(mapIdx, mapIdx + 600);
    if (mapBlock.includes('apiKey')) {
      process.stderr.write('apiKey found in .map() block — must not be serialized\n');
      process.exit(1);
    }
  "
}

@test "H-04: dashboard installs response includes isActivated derived from computer_name CASE" {
  run grep "is_activated\|isActivated" "$PROJECT_ROOT/app/api/v1/dashboard/installs/route.ts"
  [ "$status" -eq 0 ]
  run grep -i "CASE WHEN.*computer_name" "$PROJECT_ROOT/app/api/v1/dashboard/installs/route.ts"
  [ "$status" -eq 0 ]
}
