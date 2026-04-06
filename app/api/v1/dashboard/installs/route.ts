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
 * - Explicit column list in SELECT — apiKey and hmac are NEVER selected (FR-2, BR-2).
 * - Allow-list destructuring before JSON serialisation as a second layer of defence (NFR-2).
 *
 * Ordering: lastSeenAt DESC NULLS LAST — most recently active machines first (FR-4).
 * Limit: 200 rows server-enforced — not overridable by any client parameter (FR-5, BR-7).
 */

import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { requireCtoSession } from "@/lib/auth/requireCtoSession";
import { getDatabase } from "@/lib/db";

// Raw D1 row shape from the LEFT JOIN query.
// Timestamps are Unix epoch seconds (integer) or null.
// event_count may come back as number or string from D1 raw SQL.
interface InstallRow {
  id: string;
  computer_name: string;
  git_user_id: string;
  created_at: number;
  last_seen_at: number | null;
  event_count: number | string;
  last_event_at: number | null;
}

// Allow-listed shape for the JSON response.
interface InstallRecord {
  id: string;
  computerName: string;
  gitUserId: string;
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
    // 2. Query with explicit column list — apiKey and hmac are intentionally omitted (FR-2, BR-2).
    //    LEFT JOIN so installs with zero events still appear (FR-3, BR-5).
    //    ORDER BY lastSeenAt DESC NULLS LAST (FR-4).
    //    LIMIT 200 safety cap (FR-5, BR-7).
    const rows = await db.all<InstallRow>(
      sql`SELECT
            installs.id,
            installs.computer_name,
            installs.git_user_id,
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
    //    This is a second layer of defence against SELECT * accidentally returning apiKey/hmac.
    const installs: InstallRecord[] = rows.map((row) => ({
      id: row.id,
      computerName: row.computer_name,
      gitUserId: row.git_user_id,
      // D1 stores timestamps as Unix seconds; multiply by 1000 for Date constructor.
      createdAt: new Date(row.created_at * 1000).toISOString(),
      lastSeenAt: row.last_seen_at != null
        ? new Date(row.last_seen_at * 1000).toISOString()
        : null,
      // COUNT() may return a string from D1 raw SQL — coerce to number (spec implementation note).
      eventCount: Number(row.event_count),
      lastEventAt: row.last_event_at != null
        ? new Date(row.last_event_at * 1000).toISOString()
        : null,
    }));

    return NextResponse.json(
      { installs },
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
