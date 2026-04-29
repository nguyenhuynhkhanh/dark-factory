/**
 * Event Explorer page — app/(dashboard)/events/page.tsx
 *
 * Server Component. Queries D1 directly instead of calling the internal API
 * over HTTP — Cloudflare Workers cannot make loopback fetch() requests to
 * themselves.
 */

import { redirect } from "next/navigation";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { requireCtoSession } from "@/lib/auth/requireCtoSession";
import { getDatabase } from "@/lib/db";
import { events, installs } from "@/db/schema";
import { LocalTimestamp } from "@/app/(dashboard)/_components/LocalTimestamp";
import { EventFilters } from "./_components/EventFilters";
import type { InstallOption } from "./_components/EventFilters";
import Link from "next/link";

// ─── Types ───────────────────────────────────────────────────────────────────

interface EventRow {
  id: string;
  installId: string;
  computerName: string | null;
  gitUserId: string | null;
  command: string;
  subcommand: string | null;
  startedAt: string;
  endedAt: string | null;
  durationMs: number | null;
  outcome: string | null;
  featureName: string | null;
  roundCount: number | null;
  sessionId: string | null;
  createdAt: string;
}

// ─── Duration formatting helper ──────────────────────────────────────────────

export function formatDuration(ms: number | null): string {
  if (ms === null) return "—";
  if (ms < 1000) return "< 1s";
  if (ms < 60000) return `${Math.round(ms / 1000)}s`;
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.round((ms % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
}

// ─── Page Props ──────────────────────────────────────────────────────────────

interface EventsPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

const VALID_COMMANDS = [
  "df-intake", "df-debug", "df-orchestrate", "df-onboard", "df-cleanup",
] as const;

const VALID_OUTCOMES = ["success", "failed", "blocked", "abandoned"] as const;

function parseIsoDate(value: string): Date | null {
  if (!value.includes("T")) return null;
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  return d;
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function EventsPage({
  searchParams,
}: EventsPageProps): Promise<React.ReactElement> {
  const sessionResult = await requireCtoSession();
  if (!sessionResult.ok) {
    redirect("/login");
  }

  const { orgId } = sessionResult.session;
  const sp = await searchParams;

  const getString = (key: string): string =>
    typeof sp[key] === "string" ? (sp[key] as string) : "";

  const installId = getString("installId");
  const command = getString("command");
  const outcome = getString("outcome");
  const from = getString("from");
  const to = getString("to");
  const pageStr = getString("page");
  const limitStr = getString("limit");

  const page = pageStr ? Math.max(1, parseInt(pageStr, 10) || 1) : 1;
  let limit = limitStr ? parseInt(limitStr, 10) : 50;
  if (isNaN(limit) || limit < 1) limit = 1;
  if (limit > 100) limit = 100;
  const offset = (page - 1) * limit;

  const defaultFrom = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  let fromDate: Date = defaultFrom;
  let toDate: Date | undefined;

  if (from) {
    const parsed = parseIsoDate(from);
    if (parsed) fromDate = parsed;
  }
  if (to) {
    const parsed = parseIsoDate(to);
    if (parsed) toDate = parsed;
  }

  const db = getDatabase();

  // Build WHERE conditions.
  const conditions: SQL[] = [eq(events.orgId, orgId)];
  if (installId) conditions.push(eq(events.installId, installId));
  if (command && (VALID_COMMANDS as readonly string[]).includes(command)) {
    conditions.push(eq(events.command, command as (typeof VALID_COMMANDS)[number]));
  }
  if (outcome && (VALID_OUTCOMES as readonly string[]).includes(outcome)) {
    conditions.push(eq(events.outcome, outcome as (typeof VALID_OUTCOMES)[number]));
  }
  conditions.push(gte(events.startedAt, fromDate));
  if (toDate) conditions.push(lte(events.startedAt, toDate));

  const whereClause = and(...conditions);

  let eventRows: EventRow[] = [];
  let installsData: InstallOption[] = [];
  let total = 0;
  let fetchError = false;

  try {
    const [dataRows, countRows, installRows] = await Promise.all([
      db
        .select({
          id: events.id,
          installId: events.installId,
          computerName: installs.computerName,
          gitUserId: installs.gitUserId,
          command: events.command,
          subcommand: events.subcommand,
          startedAt: events.startedAt,
          endedAt: events.endedAt,
          durationMs: events.durationMs,
          outcome: events.outcome,
          featureName: events.featureName,
          roundCount: events.roundCount,
          sessionId: events.sessionId,
          createdAt: events.createdAt,
        })
        .from(events)
        .innerJoin(installs, eq(events.installId, installs.id))
        .where(whereClause)
        .orderBy(desc(events.startedAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)` })
        .from(events)
        .innerJoin(installs, eq(events.installId, installs.id))
        .where(whereClause),
      db
        .select({ id: installs.id, label: installs.label, computerName: installs.computerName, gitUserId: installs.gitUserId })
        .from(installs)
        .where(eq(installs.orgId, orgId)),
    ]);

    total = countRows[0]?.count ?? 0;

    eventRows = dataRows.map((row) => ({
      id: row.id,
      installId: row.installId,
      computerName: row.computerName,
      gitUserId: row.gitUserId,
      command: row.command,
      subcommand: row.subcommand ?? null,
      startedAt: row.startedAt instanceof Date
        ? row.startedAt.toISOString()
        : new Date((row.startedAt as number) * 1000).toISOString(),
      endedAt: row.endedAt instanceof Date
        ? row.endedAt.toISOString()
        : row.endedAt != null
          ? new Date((row.endedAt as number) * 1000).toISOString()
          : null,
      durationMs: row.durationMs ?? null,
      outcome: row.outcome ?? null,
      featureName: row.featureName ?? null,
      roundCount: row.roundCount ?? null,
      sessionId: row.sessionId ?? null,
      createdAt: row.createdAt instanceof Date
        ? row.createdAt.toISOString()
        : new Date((row.createdAt as number) * 1000).toISOString(),
    }));

    installsData = installRows.map((r) => ({
      id: r.id,
      label: r.label,
      computerName: r.computerName ?? "",
      gitUserId: r.gitUserId ?? "",
    }));
  } catch {
    fetchError = true;
  }

  if (fetchError) {
    return (
      <main className="p-8">
        <h1 className="text-2xl font-bold mb-4">Event Explorer</h1>
        <p className="text-red-600">Unable to load events. Please refresh the page.</p>
      </main>
    );
  }

  function buildPageUrl(targetPage: number): string {
    const p = new URLSearchParams();
    if (installId) p.set("installId", installId);
    if (command) p.set("command", command);
    if (outcome) p.set("outcome", outcome);
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    if (limitStr) p.set("limit", limitStr);
    p.set("page", String(targetPage));
    return "?" + p.toString();
  }

  const hasMore = total > offset + eventRows.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-6">Event Explorer</h1>

      <EventFilters
        installs={installsData}
        currentInstallId={installId}
        currentCommand={command}
        currentOutcome={outcome}
        currentFrom={from}
        currentTo={to}
        currentPage={page}
      />

      <div className="mb-4 text-sm text-gray-600">
        {total === 0 ? (
          <span>No results</span>
        ) : (
          <span>
            Showing {(page - 1) * limit + 1}–
            {Math.min(page * limit, total)} of {total} events
          </span>
        )}
      </div>

      {eventRows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-12 text-center">
          <p className="text-gray-600 text-lg">
            No events match your filters — try widening the date range.
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto mb-6">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Machine</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Developer</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Command</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Outcome</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Feature</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Started</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {eventRows.map((event) => (
                  <tr key={event.id}>
                    <td className="px-4 py-2 font-mono text-xs">{event.computerName || "—"}</td>
                    <td className="px-4 py-2 text-xs">{event.gitUserId || "—"}</td>
                    <td className="px-4 py-2 font-mono text-xs">
                      {event.command}{event.subcommand ? ` ${event.subcommand}` : ""}
                    </td>
                    <td className="px-4 py-2 text-xs capitalize">{event.outcome ?? "—"}</td>
                    <td className="px-4 py-2 text-xs">{formatDuration(event.durationMs)}</td>
                    <td className="px-4 py-2 text-xs">{event.featureName ?? "—"}</td>
                    <td className="px-4 py-2 text-xs"><LocalTimestamp iso={event.startedAt} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <nav aria-label="Pagination" className="flex items-center gap-2 text-sm">
              {page > 1 ? (
                <Link href={buildPageUrl(page - 1)} className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100">Previous</Link>
              ) : (
                <span className="px-3 py-1 border border-gray-200 rounded text-gray-400 cursor-not-allowed">Previous</span>
              )}
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                <Link key={pageNum} href={buildPageUrl(pageNum)}
                  className={`px-3 py-1 border rounded ${pageNum === page ? "bg-gray-900 text-white border-gray-900" : "border-gray-300 hover:bg-gray-100"}`}>
                  {pageNum}
                </Link>
              ))}
              {hasMore ? (
                <Link href={buildPageUrl(page + 1)} className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100">Next</Link>
              ) : (
                <span className="px-3 py-1 border border-gray-200 rounded text-gray-400 cursor-not-allowed">Next</span>
              )}
            </nav>
          )}
        </>
      )}
    </main>
  );
}
