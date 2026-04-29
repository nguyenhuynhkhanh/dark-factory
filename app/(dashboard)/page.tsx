/**
 * Dashboard Overview Page — app/(dashboard)/page.tsx
 *
 * Server Component. Resolves the CTO session directly (Option A per spec FR-2:
 * layouts cannot pass orgId to children in App Router). Reads D1 stats directly
 * using the same getDatabase() helper used by the stats route.
 *
 * Displays:
 * - Active installs count with "Active in last 30 days" label (FR-12)
 * - Events by outcome (including unknown bucket for NULLs)
 * - Events by command
 * - Recent events feed with client-side timestamp formatting (FR-13)
 * - Two distinct empty states (FR-10, FR-11)
 */

import { redirect } from "next/navigation";
import { sql } from "drizzle-orm";
import { requireCtoSession } from "@/lib/auth/requireCtoSession";
import { getDatabase } from "@/lib/db";
import { LocalTimestamp } from "./_components/LocalTimestamp";

// ─── Types ───────────────────────────────────────────────────────────────────

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

interface StatsData {
  activeInstalls: number;
  totalEvents: number;
  eventsByOutcome: {
    success: number;
    failed: number;
    blocked: number;
    abandoned: number;
    unknown: number;
  };
  eventsByCommand: Record<string, number>;
  recentEvents: Array<{
    id: string;
    installId: string;
    computerName: string | null;
    gitUserId: string | null;
    command: string;
    outcome: string | null;
    createdAt: string;
  }>;
}

// ─── Data Fetching ───────────────────────────────────────────────────────────

async function fetchStats(orgId: string): Promise<StatsData> {
  const db = getDatabase();
  const thirtyDaysAgo = Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60;

  const [activeInstallsRows, aggregateRows, recentEventsRows] = await Promise.all([
    db.all<ActiveInstallsRow>(
      sql`SELECT COUNT(*) as count
          FROM installs
          WHERE org_id = ${orgId}
            AND last_seen_at > ${thirtyDaysAgo}
            AND revoked_at IS NULL`
    ),
    db.all<AggregateRow>(
      sql`SELECT command, outcome, COUNT(*) as count
          FROM events
          WHERE org_id = ${orgId}
          GROUP BY command, outcome`
    ),
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

  const activeInstalls = activeInstallsRows[0]?.count ?? 0;

  const eventsByOutcome = { success: 0, failed: 0, blocked: 0, abandoned: 0, unknown: 0 };
  const eventsByCommand: Record<string, number> = {};
  let totalEvents = 0;

  for (const row of aggregateRows) {
    const rowCount = row.count;
    totalEvents += rowCount;

    const outcomeKey = row.outcome === null ? "unknown" : row.outcome;
    if (outcomeKey in eventsByOutcome) {
      eventsByOutcome[outcomeKey as keyof typeof eventsByOutcome] += rowCount;
    } else {
      eventsByOutcome.unknown += rowCount;
    }

    eventsByCommand[row.command] = (eventsByCommand[row.command] ?? 0) + rowCount;
  }

  const recentEvents = recentEventsRows.map((row) => ({
    id: row.id,
    installId: row.install_id,
    computerName: row.computer_name,
    gitUserId: row.git_user_id,
    command: row.command,
    outcome: row.outcome,
    createdAt: new Date(row.created_at * 1000).toISOString(),
  }));

  return { activeInstalls, totalEvents, eventsByOutcome, eventsByCommand, recentEvents };
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function DashboardPage(): Promise<React.ReactElement> {
  // Resolve session in the page (layout cannot pass data to children — FR-2).
  const sessionResult = await requireCtoSession();
  if (!sessionResult.ok) {
    // Session may have expired between layout render and page render (EC-9).
    redirect("/login");
  }

  const { orgId } = sessionResult.session;

  let stats: StatsData;
  try {
    stats = await fetchStats(orgId);
  } catch {
    // Surface error state rather than crash (EC-9).
    return (
      <main className="p-8">
        <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
        <p className="text-red-600">
          Unable to load stats. Please refresh the page.
        </p>
      </main>
    );
  }

  const { activeInstalls, totalEvents, eventsByOutcome, eventsByCommand, recentEvents } = stats;

  // ── Empty state: zero active installs (FR-10) ────────────────────────────
  if (activeInstalls === 0) {
    return (
      <main className="p-8">
        <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
        <div className="rounded-lg border border-dashed border-gray-300 p-12 text-center">
          <p className="text-gray-600 text-lg">
            Share your invite link to get developers registered.
          </p>
        </div>
      </main>
    );
  }

  // ── Empty state: installs exist but no events yet (FR-11) ────────────────
  if (totalEvents === 0) {
    return (
      <main className="p-8">
        <h1 className="text-2xl font-bold mb-4">Dashboard</h1>

        {/* Active installs stat card — still shown in this state */}
        <div className="mb-8">
          <div className="rounded-lg bg-white border border-gray-200 p-6 inline-block">
            <p className="text-3xl font-bold">{activeInstalls}</p>
            <p className="text-sm text-gray-500 mt-1">Active in last 30 days</p>
          </div>
        </div>

        <div className="rounded-lg border border-dashed border-gray-300 p-12 text-center">
          <p className="text-gray-600 text-lg">
            Developers registered but no events yet.
          </p>
        </div>
      </main>
    );
  }

  // ── Full dashboard view ──────────────────────────────────────────────────
  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      {/* Stat cards */}
      <section aria-label="Summary stats" className="grid grid-cols-2 gap-4 mb-8 sm:grid-cols-3">
        {/* Active installs — FR-12: label must reference 30-day window */}
        <div className="rounded-lg bg-white border border-gray-200 p-6">
          <p className="text-3xl font-bold">{activeInstalls}</p>
          <p className="text-sm text-gray-500 mt-1">Active in last 30 days</p>
        </div>

        <div className="rounded-lg bg-white border border-gray-200 p-6">
          <p className="text-3xl font-bold">{totalEvents}</p>
          <p className="text-sm text-gray-500 mt-1">Total events</p>
        </div>
      </section>

      {/* Events by outcome */}
      <section aria-label="Events by outcome" className="mb-8">
        <h2 className="text-lg font-semibold mb-3">Events by Outcome</h2>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
          {(Object.entries(eventsByOutcome) as [string, number][]).map(([outcome, count]) => (
            <div key={outcome} className="rounded-lg bg-white border border-gray-200 p-4 text-center">
              <p className="text-2xl font-bold">{count}</p>
              <p className="text-xs text-gray-500 mt-1 capitalize">{outcome}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Events by command */}
      {Object.keys(eventsByCommand).length > 0 && (
        <section aria-label="Events by command" className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Events by Command</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(Object.entries(eventsByCommand) as [string, number][]).map(([command, count]) => (
              <div key={command} className="rounded-lg bg-white border border-gray-200 p-4">
                <p className="text-2xl font-bold">{count}</p>
                <p className="text-xs text-gray-500 mt-1 font-mono">{command}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Recent events feed */}
      <section aria-label="Recent events">
        <h2 className="text-lg font-semibold mb-3">Recent Events</h2>
        {recentEvents.length === 0 ? (
          <p className="text-gray-500">No recent events.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Machine</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Developer</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Command</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Outcome</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {recentEvents.map((event) => (
                  <tr key={event.id}>
                    <td className="px-4 py-2 font-mono text-xs">{event.computerName ?? "—"}</td>
                    <td className="px-4 py-2 text-xs">{event.gitUserId ?? "—"}</td>
                    <td className="px-4 py-2 font-mono text-xs">{event.command}</td>
                    <td className="px-4 py-2 text-xs capitalize">{event.outcome ?? "unknown"}</td>
                    <td className="px-4 py-2 text-xs">
                      {/* Client-side formatting to use browser timezone (FR-13) */}
                      <LocalTimestamp iso={event.createdAt} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
