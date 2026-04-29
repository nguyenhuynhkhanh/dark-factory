/**
 * GET /api/v1/dashboard/stats
 *
 * Returns aggregate stats for the authenticated CTO's org:
 * - Active installs (last 30 days)
 * - Total events, events by outcome (with unknown bucket for NULLs), events by command
 * - Recent events (last 10), joined with installs for computerName + gitUserId
 *
 * Auth: session cookie (__Host-session) via requireCtoSession().
 * orgId is always sourced from the session — never from query params.
 */

import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { requireCtoSession } from "@/lib/auth/requireCtoSession";
import { getDatabase } from "@/lib/db";

// The four schema-defined outcomes plus the unknown bucket for NULL values.
type OutcomeKey = "success" | "failed" | "blocked" | "abandoned" | "unknown";

interface AggregateRow {
  command: string;
  outcome: string | null;
  count: number;
}

interface RecentEventRow {
  id: string;
  install_id: string;
  computer_name: string | null;
  git_user_id: string | null;
  command: string;
  outcome: string | null;
  created_at: number;
}

interface ActiveInstallsRow {
  count: number;
}

export async function GET(): Promise<NextResponse> {
  // 1. Authenticate — must run before any D1 access.
  const result = await requireCtoSession();
  if (!result.ok) {
    return result.response;
  }

  const { orgId } = result.session;

  // Belt-and-suspenders guard: orgId must be present (FR-14).
  if (!orgId) {
    return NextResponse.json(
      { error: "Session data corrupt." },
      { status: 500 }
    );
  }

  const db = getDatabase();

  // 30-day threshold in Unix seconds (D1 stores timestamps as integer seconds).
  const thirtyDaysAgo = Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60;

  try {
    // 2. Run all three queries in parallel (FR-4).
    const [activeInstallsRows, aggregateRows, recentEventsRows] =
      await Promise.all([
        // Query 1: Active installs — last_seen_at strictly greater than threshold.
        //          Excludes revoked installs (FR-14, BR-8, AC-15).
        db.all<ActiveInstallsRow>(
          sql`SELECT COUNT(*) as count
              FROM installs
              WHERE org_id = ${orgId}
                AND last_seen_at > ${thirtyDaysAgo}
                AND revoked_at IS NULL`
        ),
        // Query 2: Event aggregates — single query disaggregated in JS (FR-8).
        db.all<AggregateRow>(
          sql`SELECT command, outcome, COUNT(*) as count
              FROM events
              WHERE org_id = ${orgId}
              GROUP BY command, outcome`
        ),
        // Query 3: Recent events — LEFT JOIN so orphaned events are included (EC-6, FR-9).
        db.all<RecentEventRow>(
          sql`SELECT e.id,
                     e.install_id,
                     i.computer_name,
                     i.git_user_id,
                     e.command,
                     e.outcome,
                     e.created_at
              FROM events e
              LEFT JOIN installs i ON e.install_id = i.id
              WHERE e.org_id = ${orgId}
              ORDER BY e.created_at DESC
              LIMIT 10`
        ),
      ]);

    // 3. Parse active installs count.
    const activeInstalls = activeInstallsRows[0]?.count ?? 0;

    // 4. Disaggregate the aggregate query (FR-7, FR-8, BR-3, BR-4, EC-7).
    //    Initialize all five outcome keys to 0 (FR-7: always present).
    const eventsByOutcome: Record<OutcomeKey, number> = {
      success: 0,
      failed: 0,
      blocked: 0,
      abandoned: 0,
      unknown: 0,
    };
    // eventsByCommand: only commands with at least one event appear (EC-7).
    const eventsByCommand: Record<string, number> = {};
    let totalEvents = 0;

    for (const row of aggregateRows) {
      const rowCount = row.count;
      totalEvents += rowCount;

      // Map outcome to bucket — NULL outcome → "unknown" (BR-3).
      const outcomeKey: OutcomeKey =
        row.outcome === null ? "unknown" : (row.outcome as OutcomeKey);
      eventsByOutcome[outcomeKey] = (eventsByOutcome[outcomeKey] ?? 0) + rowCount;

      // Accumulate per-command total.
      eventsByCommand[row.command] = (eventsByCommand[row.command] ?? 0) + rowCount;
    }

    // 5. Shape recent events.
    const recentEvents = recentEventsRows.map((row) => ({
      id: row.id,
      installId: row.install_id,
      computerName: row.computer_name,
      gitUserId: row.git_user_id,
      command: row.command,
      outcome: row.outcome,
      // D1 stores timestamps as Unix seconds; convert to ISO 8601 (spec note under response shape).
      createdAt: new Date(row.created_at * 1000).toISOString(),
    }));

    // 6. Return response with no-store cache control (NFR-2, spec note).
    return NextResponse.json(
      {
        activeInstalls,
        totalEvents,
        eventsByOutcome,
        eventsByCommand,
        recentEvents,
      },
      {
        status: 200,
        headers: { "Cache-Control": "no-store" },
      }
    );
  } catch {
    // Do not expose raw D1 errors (NFR-2).
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
