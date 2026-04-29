#!/usr/bin/env bats
# Promoted from Dark Factory holdout: api-key-management-data
# Root cause: Migration 0001 uses a CREATE/INSERT/DROP/RENAME pattern to restructure
#   the installs table — removing hmac, adding label/expires_at/revoked_at, and
#   backfilling label from id. Tests guard that this pattern is safe on empty tables
#   and preserves soft-FK integrity in the events table.
# Guards: db/migrations/0001_api_key_management.sql, db/migrations/0000_strange_black_bird.sql

# Drizzle migration files use "--> statement-breakpoint" as separators between
# statements. sqlite3 does not understand this syntax, so we strip those lines
# before feeding SQL to the database.

PROJECT_ROOT="$(cd "$(dirname "$BATS_TEST_FILENAME")/../.." && pwd)"
MIGRATION_0000="$PROJECT_ROOT/db/migrations/0000_strange_black_bird.sql"
MIGRATION_0001="$PROJECT_ROOT/db/migrations/0001_api_key_management.sql"

# ── Setup / Teardown ──────────────────────────────────────────────────────────

setup() {
  TEST_DB="$(mktemp /tmp/api-key-mgmt-test-XXXXXX.db)"
}

teardown() {
  rm -f "$TEST_DB"
}

# ── Helper: apply a Drizzle migration SQL file to the test database ───────────

apply_migration() {
  local db="$1"
  local sql_file="$2"
  # Strip Drizzle statement-breakpoint comments and feed clean SQL to sqlite3
  grep -v '^--> statement-breakpoint' "$sql_file" | sqlite3 "$db"
}

# ── H-01: Migration succeeds when installs table is empty ────────────────────

@test "H-01: migration applies cleanly to empty installs table — no error" {
  apply_migration "$TEST_DB" "$MIGRATION_0000"
  run apply_migration "$TEST_DB" "$MIGRATION_0001"
  [ "$status" -eq 0 ]
}

@test "H-01: post-migration installs row count is zero (no spurious rows)" {
  apply_migration "$TEST_DB" "$MIGRATION_0000"
  apply_migration "$TEST_DB" "$MIGRATION_0001"
  result="$(sqlite3 "$TEST_DB" "SELECT COUNT(*) FROM installs;")"
  [ "$result" -eq 0 ]
}

@test "H-01: post-migration installs schema has required columns and no hmac column" {
  apply_migration "$TEST_DB" "$MIGRATION_0000"
  apply_migration "$TEST_DB" "$MIGRATION_0001"

  # Collect column names from PRAGMA
  columns="$(sqlite3 "$TEST_DB" "PRAGMA table_info(installs);" | awk -F'|' '{print $2}' | sort | tr '\n' ',')"

  # Required columns must be present
  [[ "$columns" == *"id"* ]]
  [[ "$columns" == *"org_id"* ]]
  [[ "$columns" == *"label"* ]]
  [[ "$columns" == *"computer_name"* ]]
  [[ "$columns" == *"git_user_id"* ]]
  [[ "$columns" == *"api_key"* ]]
  [[ "$columns" == *"expires_at"* ]]
  [[ "$columns" == *"revoked_at"* ]]
  [[ "$columns" == *"created_at"* ]]
  [[ "$columns" == *"last_seen_at"* ]]

  # hmac column must be absent
  [[ "$columns" != *"hmac"* ]]
}

@test "H-01: post-migration installs_api_key_unique index exists" {
  apply_migration "$TEST_DB" "$MIGRATION_0000"
  apply_migration "$TEST_DB" "$MIGRATION_0001"
  result="$(sqlite3 "$TEST_DB" "PRAGMA index_list(installs);" | awk -F'|' '{print $2}' | grep -c 'installs_api_key_unique' || true)"
  [ "$result" -eq 1 ]
}

@test "H-01: post-migration installs_org_id_idx index exists" {
  apply_migration "$TEST_DB" "$MIGRATION_0000"
  apply_migration "$TEST_DB" "$MIGRATION_0001"
  result="$(sqlite3 "$TEST_DB" "PRAGMA index_list(installs);" | awk -F'|' '{print $2}' | grep -c 'installs_org_id_idx' || true)"
  [ "$result" -eq 1 ]
}

@test "H-01: post-migration INSERT omitting label succeeds (DEFAULT '' applies)" {
  apply_migration "$TEST_DB" "$MIGRATION_0000"
  apply_migration "$TEST_DB" "$MIGRATION_0001"
  run sqlite3 "$TEST_DB" "INSERT INTO installs (id, org_id, api_key, expires_at, created_at) VALUES ('test-empty-migration', 'org-x', 'key-x', 1800000000, 1775185200);"
  [ "$status" -eq 0 ]
  count="$(sqlite3 "$TEST_DB" "SELECT COUNT(*) FROM installs WHERE id='test-empty-migration';")"
  [ "$count" -eq 1 ]
}

# ── H-02: Migration preserves events.install_id references ───────────────────

@test "H-02: migration completes without error when installs and events rows are present" {
  apply_migration "$TEST_DB" "$MIGRATION_0000"
  sqlite3 "$TEST_DB" "INSERT INTO installs (id, org_id, computer_name, git_user_id, hmac, api_key, created_at) VALUES ('install-ref-test-0000000000000001', 'org-1', 'host', 'user', 'h', 'key-ref', 1700000000);"
  sqlite3 "$TEST_DB" "INSERT INTO events (id, install_id, org_id, command, started_at, created_at) VALUES ('evt-1', 'install-ref-test-0000000000000001', 'org-1', 'df-intake', 1700001000, 1700001000);"
  sqlite3 "$TEST_DB" "INSERT INTO events (id, install_id, org_id, command, started_at, created_at) VALUES ('evt-2', 'install-ref-test-0000000000000001', 'org-1', 'df-debug', 1700002000, 1700002000);"
  run apply_migration "$TEST_DB" "$MIGRATION_0001"
  [ "$status" -eq 0 ]
}

@test "H-02: post-migration install row is preserved with original id" {
  apply_migration "$TEST_DB" "$MIGRATION_0000"
  sqlite3 "$TEST_DB" "INSERT INTO installs (id, org_id, computer_name, git_user_id, hmac, api_key, created_at) VALUES ('install-ref-test-0000000000000001', 'org-1', 'host', 'user', 'h', 'key-ref', 1700000000);"
  sqlite3 "$TEST_DB" "INSERT INTO events (id, install_id, org_id, command, started_at, created_at) VALUES ('evt-1', 'install-ref-test-0000000000000001', 'org-1', 'df-intake', 1700001000, 1700001000);"
  sqlite3 "$TEST_DB" "INSERT INTO events (id, install_id, org_id, command, started_at, created_at) VALUES ('evt-2', 'install-ref-test-0000000000000001', 'org-1', 'df-debug', 1700002000, 1700002000);"
  apply_migration "$TEST_DB" "$MIGRATION_0001"
  count="$(sqlite3 "$TEST_DB" "SELECT COUNT(*) FROM installs WHERE id='install-ref-test-0000000000000001';")"
  [ "$count" -eq 1 ]
}

@test "H-02: post-migration events table is unchanged — still 2 rows" {
  apply_migration "$TEST_DB" "$MIGRATION_0000"
  sqlite3 "$TEST_DB" "INSERT INTO installs (id, org_id, computer_name, git_user_id, hmac, api_key, created_at) VALUES ('install-ref-test-0000000000000001', 'org-1', 'host', 'user', 'h', 'key-ref', 1700000000);"
  sqlite3 "$TEST_DB" "INSERT INTO events (id, install_id, org_id, command, started_at, created_at) VALUES ('evt-1', 'install-ref-test-0000000000000001', 'org-1', 'df-intake', 1700001000, 1700001000);"
  sqlite3 "$TEST_DB" "INSERT INTO events (id, install_id, org_id, command, started_at, created_at) VALUES ('evt-2', 'install-ref-test-0000000000000001', 'org-1', 'df-debug', 1700002000, 1700002000);"
  apply_migration "$TEST_DB" "$MIGRATION_0001"
  count="$(sqlite3 "$TEST_DB" "SELECT COUNT(*) FROM events;")"
  [ "$count" -eq 2 ]
}

@test "H-02: post-migration evt-1 install_id reference is intact" {
  apply_migration "$TEST_DB" "$MIGRATION_0000"
  sqlite3 "$TEST_DB" "INSERT INTO installs (id, org_id, computer_name, git_user_id, hmac, api_key, created_at) VALUES ('install-ref-test-0000000000000001', 'org-1', 'host', 'user', 'h', 'key-ref', 1700000000);"
  sqlite3 "$TEST_DB" "INSERT INTO events (id, install_id, org_id, command, started_at, created_at) VALUES ('evt-1', 'install-ref-test-0000000000000001', 'org-1', 'df-intake', 1700001000, 1700001000);"
  sqlite3 "$TEST_DB" "INSERT INTO events (id, install_id, org_id, command, started_at, created_at) VALUES ('evt-2', 'install-ref-test-0000000000000001', 'org-1', 'df-debug', 1700002000, 1700002000);"
  apply_migration "$TEST_DB" "$MIGRATION_0001"
  install_id="$(sqlite3 "$TEST_DB" "SELECT install_id FROM events WHERE id='evt-1';")"
  [ "$install_id" = "install-ref-test-0000000000000001" ]
}

@test "H-02: post-migration evt-2 install_id reference is intact" {
  apply_migration "$TEST_DB" "$MIGRATION_0000"
  sqlite3 "$TEST_DB" "INSERT INTO installs (id, org_id, computer_name, git_user_id, hmac, api_key, created_at) VALUES ('install-ref-test-0000000000000001', 'org-1', 'host', 'user', 'h', 'key-ref', 1700000000);"
  sqlite3 "$TEST_DB" "INSERT INTO events (id, install_id, org_id, command, started_at, created_at) VALUES ('evt-1', 'install-ref-test-0000000000000001', 'org-1', 'df-intake', 1700001000, 1700001000);"
  sqlite3 "$TEST_DB" "INSERT INTO events (id, install_id, org_id, command, started_at, created_at) VALUES ('evt-2', 'install-ref-test-0000000000000001', 'org-1', 'df-debug', 1700002000, 1700002000);"
  apply_migration "$TEST_DB" "$MIGRATION_0001"
  install_id="$(sqlite3 "$TEST_DB" "SELECT install_id FROM events WHERE id='evt-2';")"
  [ "$install_id" = "install-ref-test-0000000000000001" ]
}

@test "H-02: post-migration JOIN on events.install_id resolves with backfill label 'legacy-install-'" {
  apply_migration "$TEST_DB" "$MIGRATION_0000"
  sqlite3 "$TEST_DB" "INSERT INTO installs (id, org_id, computer_name, git_user_id, hmac, api_key, created_at) VALUES ('install-ref-test-0000000000000001', 'org-1', 'host', 'user', 'h', 'key-ref', 1700000000);"
  sqlite3 "$TEST_DB" "INSERT INTO events (id, install_id, org_id, command, started_at, created_at) VALUES ('evt-1', 'install-ref-test-0000000000000001', 'org-1', 'df-intake', 1700001000, 1700001000);"
  sqlite3 "$TEST_DB" "INSERT INTO events (id, install_id, org_id, command, started_at, created_at) VALUES ('evt-2', 'install-ref-test-0000000000000001', 'org-1', 'df-debug', 1700002000, 1700002000);"
  apply_migration "$TEST_DB" "$MIGRATION_0001"
  row="$(sqlite3 "$TEST_DB" "SELECT e.id, i.label FROM events e JOIN installs i ON e.install_id = i.id WHERE e.id = 'evt-1';")"
  # Expected: evt-1|legacy-install-
  [ "$row" = "evt-1|legacy-install-" ]
}
