/**
 * Event Explorer page — app/(dashboard)/events/page.tsx
 *
 * Server Component. Reads URL search params, calls requireCtoSession, fetches
 * event data and installs from the API endpoints, and renders the filter bar
 * (client component) + paginated event table.
 *
 * searchParams is a Promise in Next.js 16 and must be awaited (project profile note).
 */

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { requireCtoSession } from "@/lib/auth/requireCtoSession";
import { LocalTimestamp } from "@/app/(dashboard)/_components/LocalTimestamp";
import { EventFilters } from "./_components/EventFilters";
import type { InstallOption } from "./_components/EventFilters";
import Link from "next/link";

// ─── Types ───────────────────────────────────────────────────────────────────

interface EventRow {
  id: string;
  installId: string;
  computerName: string;
  gitUserId: string;
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

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

interface EventsResponse {
  events: EventRow[];
  pagination: PaginationData;
}

interface InstallsResponse {
  installs: InstallOption[];
}

// ─── Duration formatting helper ──────────────────────────────────────────────

/**
 * formatDuration — converts raw milliseconds to a human-readable string.
 *
 * null → "—"
 * < 1000ms → "< 1s"
 * < 60000ms → "45s"
 * >= 60000ms → "1m 23s"
 */
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

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function EventsPage({
  searchParams,
}: EventsPageProps): Promise<React.ReactElement> {
  // Resolve session (layout cannot pass orgId — FR-2).
  const sessionResult = await requireCtoSession();
  if (!sessionResult.ok) {
    redirect("/login");
  }

  // Await searchParams (Promise in Next.js 16).
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

  // Build query string for the API call.
  const apiParams = new URLSearchParams();
  if (installId) apiParams.set("installId", installId);
  if (command) apiParams.set("command", command);
  if (outcome) apiParams.set("outcome", outcome);
  if (from) apiParams.set("from", from);
  if (to) apiParams.set("to", to);
  apiParams.set("page", String(page));
  if (limitStr) apiParams.set("limit", limitStr);

  // Forward cookies to the internal API calls (session auth).
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

  // Fetch events and installs in parallel.
  let eventsData: EventsResponse | null = null;
  let installsData: InstallOption[] = [];
  let fetchError = false;

  try {
    const [eventsRes, installsRes] = await Promise.all([
      fetch(`${baseUrl}/api/v1/dashboard/events?${apiParams.toString()}`, {
        headers: { cookie: cookieHeader },
        cache: "no-store",
      }),
      fetch(`${baseUrl}/api/v1/dashboard/installs`, {
        headers: { cookie: cookieHeader },
        cache: "no-store",
      }).catch(() => null), // Degrade gracefully if installs endpoint is unavailable.
    ]);

    if (!eventsRes.ok) {
      fetchError = true;
    } else {
      eventsData = (await eventsRes.json()) as EventsResponse;
    }

    if (installsRes && installsRes.ok) {
      const installsJson = (await installsRes.json()) as InstallsResponse;
      installsData = installsJson.installs ?? [];
    }
  } catch {
    fetchError = true;
  }

  // ── Error state ────────────────────────────────────────────────────────────
  if (fetchError || eventsData === null) {
    return (
      <main className="p-8">
        <h1 className="text-2xl font-bold mb-4">Event Explorer</h1>
        <p className="text-red-600">
          Unable to load events. Please refresh the page.
        </p>
      </main>
    );
  }

  const { events: eventRows, pagination } = eventsData;

  // ── Build pagination URLs ──────────────────────────────────────────────────
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

  const totalPages = Math.max(1, Math.ceil(pagination.total / pagination.limit));

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-6">Event Explorer</h1>

      {/* Filter bar — client component */}
      <EventFilters
        installs={installsData}
        currentInstallId={installId}
        currentCommand={command}
        currentOutcome={outcome}
        currentFrom={from}
        currentTo={to}
        currentPage={page}
      />

      {/* Results summary */}
      <div className="mb-4 text-sm text-gray-600">
        {pagination.total === 0 ? (
          <span>No results</span>
        ) : (
          <span>
            Showing {(page - 1) * pagination.limit + 1}–
            {Math.min(page * pagination.limit, pagination.total)} of{" "}
            {pagination.total} events
          </span>
        )}
      </div>

      {/* Empty state (FR-14, AC-15) */}
      {eventRows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-12 text-center">
          <p className="text-gray-600 text-lg">
            No events match your filters — try widening the date range.
          </p>
        </div>
      ) : (
        <>
          {/* Event table */}
          <div className="overflow-x-auto mb-6">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Machine
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Developer
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Command
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Outcome
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Feature
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Started
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {eventRows.map((event) => (
                  <tr key={event.id}>
                    <td className="px-4 py-2 font-mono text-xs">
                      {event.computerName || "—"}
                    </td>
                    <td className="px-4 py-2 text-xs">
                      {event.gitUserId || "—"}
                    </td>
                    <td className="px-4 py-2 font-mono text-xs">
                      {event.command}
                      {event.subcommand ? ` ${event.subcommand}` : ""}
                    </td>
                    <td className="px-4 py-2 text-xs capitalize">
                      {/* outcome null renders as "—" (FR-16, AC-17) */}
                      {event.outcome ?? "—"}
                    </td>
                    <td className="px-4 py-2 text-xs">
                      {/* durationMs human-readable (FR-15, AC-16) */}
                      {formatDuration(event.durationMs)}
                    </td>
                    <td className="px-4 py-2 text-xs">
                      {event.featureName ?? "—"}
                    </td>
                    <td className="px-4 py-2 text-xs">
                      {/* LocalTimestamp formats in browser's local timezone (FR-18) */}
                      <LocalTimestamp iso={event.startedAt} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination (FR-9) */}
          {totalPages > 1 && (
            <nav
              aria-label="Pagination"
              className="flex items-center gap-2 text-sm"
            >
              {/* Previous */}
              {page > 1 ? (
                <Link
                  href={buildPageUrl(page - 1)}
                  className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100"
                >
                  Previous
                </Link>
              ) : (
                <span className="px-3 py-1 border border-gray-200 rounded text-gray-400 cursor-not-allowed">
                  Previous
                </span>
              )}

              {/* Page numbers */}
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (pageNum) => (
                  <Link
                    key={pageNum}
                    href={buildPageUrl(pageNum)}
                    className={`px-3 py-1 border rounded ${
                      pageNum === page
                        ? "bg-gray-900 text-white border-gray-900"
                        : "border-gray-300 hover:bg-gray-100"
                    }`}
                  >
                    {pageNum}
                  </Link>
                )
              )}

              {/* Next */}
              {pagination.hasMore ? (
                <Link
                  href={buildPageUrl(page + 1)}
                  className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100"
                >
                  Next
                </Link>
              ) : (
                <span className="px-3 py-1 border border-gray-200 rounded text-gray-400 cursor-not-allowed">
                  Next
                </span>
              )}
            </nav>
          )}
        </>
      )}
    </main>
  );
}
