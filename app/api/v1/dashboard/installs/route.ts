/**
 * GET /api/v1/dashboard/installs
 *
 * Returns the list of registered machines (installs) for the authenticated CTO's org,
 * with aggregated event stats (total event count + last event timestamp).
 *
 * Auth: session cookie (__Host-session) via requireCtoSession().
 * orgId is always sourced from the session — never from query params (FR-1, BR-1).
 *
 * Security:
 * - Explicit column list in SELECT — apiKey is NEVER selected (FR-2, BR-2, NFR-2, BR-3).
 * - Allow-list destructuring before JSON serialisation as a second layer of defence.
 *
 * Response shape extended per api-key-management-server spec (FR-13, AC-14):
 * - label: string
 * - revokedAt: ISO string or null
 * - expiresAt: ISO string
 * - isActivated: boolean (computerName IS NOT NULL)
 * - computerName and gitUserId are nullable
 *
 * Ordering: lastSeenAt DESC NULLS LAST — most recently active machines first.
 * Limit: 200 rows server-enforced — not overridable by any client parameter (NFR-5).
 *
 * Revoked installs are included in the list (EC-1) — historical events are preserved.
 * Active-install counts in other routes/pages exclude revoked installs (FR-14, BR-8).
 */

import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { requireCtoSession } from "@/lib/auth/requireCtoSession";
import { getDatabase } from "@/lib/db";

// Raw D1 row shape from the LEFT JOIN query.
// Timestamps are Unix epoch seconds (integer) or null.
// event_count may come back as number or string from D1 raw SQL.
// is_activated comes from a CASE expression — 1 or 0 from SQLite.
interface InstallRow {
  id: string;
  label: string;
  computer_name: string | null;
  git_user_id: string | null;
  expires_at: number;
  revoked_at: number | null;
  is_activated: number; // CASE WHEN computer_name IS NOT NULL THEN 1 ELSE 0 END
  created_at: number;
  last_seen_at: number | null;
  event_count: number | string;
  last_event_at: number | null;
}

// Allow-listed shape for the JSON response.
interface InstallRecord {
  id: string;
  label: string;
  computerName: string | null;
  gitUserId: string | null;
  expiresAt: string;
  revokedAt: string | null;
  isActivated: boolean;
  createdAt: string;
  lastSeenAt: string | null;
  eventCount: number;
  lastEventAt: string | null;
}

export async function GET(): Promise<NextResponse> {
  // 1. Authenticate — must run before any D1 access.
  const result = await requireCtoSession();
  if (!result.ok) {
    return result.response;
  }

  const { orgId } = result.session;

  // Belt-and-suspenders guard: orgId must be present.
  if (!orgId) {
    return NextResponse.json(
      { error: "Session data corrupt." },
      { status: 500 }
    );
  }

  const db = getDatabase();

  try {
    // 2. Query with explicit column list — apiKey is intentionally omitted (NFR-2, BR-3).
    //    Includes label, expires_at, revoked_at, and is_activated per FR-13, AC-14.
    //    LEFT JOIN so installs with zero events still appear (EC-1, EC-2).
    //    Revoked installs remain visible — history is preserved (EC-1, BR-8).
    //    ORDER BY lastSeenAt DESC NULLS LAST.
    //    LIMIT 200 safety cap (NFR-5).
    const rows = await db.all<InstallRow>(
      sql`SELECT
            installs.id,
            installs.label,
            installs.computer_name,
            installs.git_user_id,
            installs.expires_at,
            installs.revoked_at,
            CASE WHEN installs.computer_name IS NOT NULL THEN 1 ELSE 0 END AS is_activated,
            installs.created_at,
            installs.last_seen_at,
            COUNT(events.id)       AS event_count,
            MAX(events.created_at) AS last_event_at
          FROM installs
          LEFT JOIN events ON events.install_id = installs.id
          WHERE installs.org_id = ${orgId}
          GROUP BY installs.id
          ORDER BY installs.last_seen_at DESC NULLS LAST
          LIMIT 200`
    );

    // 3. Allow-list destructuring: only the fields below are serialised.
    //    This is a second layer of defence against SELECT * accidentally returning apiKey.
    const installList: InstallRecord[] = rows.map((row) => ({
      id: row.id,
      label: row.label,
      computerName: row.computer_name,
      gitUserId: row.git_user_id,
      // D1 stores timestamps as Unix seconds; multiply by 1000 for Date constructor.
      expiresAt: new Date(row.expires_at * 1000).toISOString(),
      revokedAt: row.revoked_at != null
        ? new Date(row.revoked_at * 1000).toISOString()
        : null,
      // SQLite CASE returns 1 or 0 — coerce to boolean (FR-13, AC-14).
      isActivated: row.is_activated === 1,
      createdAt: new Date(row.created_at * 1000).toISOString(),
      lastSeenAt: row.last_seen_at != null
        ? new Date(row.last_seen_at * 1000).toISOString()
        : null,
      // COUNT() may return a string from D1 raw SQL — coerce to number.
      eventCount: Number(row.event_count),
      lastEventAt: row.last_event_at != null
        ? new Date(row.last_event_at * 1000).toISOString()
        : null,
    }));

    return NextResponse.json(
      { installs: installList },
      {
        status: 200,
        headers: { "Cache-Control": "no-store" },
      }
    );
  } catch {
    // Do not expose raw D1 errors or stack traces to the client (NFR-3).
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
