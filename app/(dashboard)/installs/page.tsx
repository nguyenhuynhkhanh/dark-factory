/**
 * Registered Machines Page — app/(dashboard)/installs/page.tsx
 *
 * Server Component. Resolves the CTO session directly (same pattern as
 * app/(dashboard)/page.tsx — layouts cannot pass data to child pages in
 * App Router). Queries D1 directly via getDatabase() rather than calling
 * the API route internally (avoids cookie-forwarding complexity on CF Workers).
 *
 * Displays:
 * - Heading: "Registered Machines" (FR-11)
 * - "Copy invite link" button above the table (FR-6, BR-6)
 * - Table of installs ordered by lastSeenAt DESC NULLS LAST (FR-4)
 * - Active / Inactive badge per row (FR-7, BR-3, BR-4)
 * - lastSeenAt rendered as "Never" when null (FR-8)
 * - computerName / gitUserId truncated with title tooltip (FR-9)
 * - Empty state when zero installs (FR-10)
 * - Advisory note when exactly 200 rows returned (BR-7, EC-5)
 */

import { redirect } from "next/navigation";
import { sql } from "drizzle-orm";
import { requireCtoSession } from "@/lib/auth/requireCtoSession";
import { getDatabase } from "@/lib/db";
import { LocalTimestamp } from "../_components/LocalTimestamp";
import { CopyInviteLink } from "./CopyInviteLink";

// ─── Types ────────────────────────────────────────────────────────────────────

// Raw row shape from the D1 LEFT JOIN query.
// Timestamps are Unix epoch seconds (integer) or null.
interface InstallRow {
  id: string;
  computer_name: string;
  git_user_id: string;
  created_at: number;
  last_seen_at: number | null;
  event_count: number | string;
  last_event_at: number | null;
}

// Shaped install record used in the render tree.
interface InstallRecord {
  id: string;
  computerName: string;
  gitUserId: string;
  createdAt: string;
  lastSeenAt: string | null;
  eventCount: number;
  lastEventAt: string | null;
}

// ─── Data Fetching ────────────────────────────────────────────────────────────

async function fetchInstalls(orgId: string): Promise<InstallRecord[]> {
  const db = getDatabase();

  // Explicit column list — apiKey and hmac intentionally omitted (FR-2, BR-2).
  // LEFT JOIN so installs with zero events still appear (FR-3, BR-5).
  // ORDER BY lastSeenAt DESC NULLS LAST (FR-4).
  // LIMIT 200 safety cap (FR-5, BR-7).
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

  // Allow-list the fields before returning — defence-in-depth against SELECT * leakage.
  return rows.map((row): InstallRecord => ({
    id: row.id,
    computerName: row.computer_name,
    gitUserId: row.git_user_id,
    // D1 integer timestamps are Unix seconds — multiply by 1000 for Date constructor.
    createdAt: new Date(row.created_at * 1000).toISOString(),
    lastSeenAt: row.last_seen_at != null
      ? new Date(row.last_seen_at * 1000).toISOString()
      : null,
    // COUNT() from D1 raw SQL may return a string — coerce to number.
    eventCount: Number(row.event_count),
    lastEventAt: row.last_event_at != null
      ? new Date(row.last_event_at * 1000).toISOString()
      : null,
  }));
}

// ─── Active/Inactive badge helper ────────────────────────────────────────────

/**
 * Returns true only if lastSeenAt is non-null AND strictly less than 30 days ago.
 * Exactly 30 days ago is Inactive (exclusive boundary, BR-3, EC-3).
 */
function isActiveInstall(lastSeenAt: string | null): boolean {
  if (lastSeenAt === null) return false;
  return Date.now() - new Date(lastSeenAt).getTime() < 30 * 24 * 60 * 60 * 1000;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function InstallsPage(): Promise<React.ReactElement> {
  // Resolve session in the page — layout cannot pass data to children in App Router.
  const sessionResult = await requireCtoSession();
  if (!sessionResult.ok) {
    redirect("/login");
  }

  const { orgId } = sessionResult.session;

  // Build the invite URL: BR-6 — https://<app-domain>/invite/<orgId>
  // APP_URL from env, fallback handled server-side (no request object in Server Component).
  const appUrl = process.env.APP_URL ?? "https://localhost:3000";
  const inviteUrl = `${appUrl}/invite/${orgId}`;

  let installs: InstallRecord[];
  try {
    installs = await fetchInstalls(orgId);
  } catch {
    return (
      <main className="p-8">
        <h1 className="text-2xl font-bold mb-4">Registered Machines</h1>
        <p className="text-red-600">
          Unable to load registered machines. Please refresh the page.
        </p>
      </main>
    );
  }

  const atCap = installs.length === 200;

  // ── Empty state: zero installs (FR-10, EC-6) ─────────────────────────────
  if (installs.length === 0) {
    return (
      <main className="p-8">
        <h1 className="text-2xl font-bold mb-4">Registered Machines</h1>

        {/* Invite link button — visible even on empty state (P-06) */}
        <div className="mb-6">
          <CopyInviteLink inviteUrl={inviteUrl} />
        </div>

        <div className="rounded-lg border border-dashed border-gray-300 p-12 text-center">
          <p className="text-gray-600 text-lg">
            No developers registered yet. Share your invite link to get started.
          </p>
        </div>
      </main>
    );
  }

  // ── Full table view ───────────────────────────────────────────────────────
  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-4">Registered Machines</h1>

      {/* Invite link button — above the table (FR-6, AC-7) */}
      <div className="mb-6">
        <CopyInviteLink inviteUrl={inviteUrl} />
      </div>

      {/* Advisory note when LIMIT 200 is hit (BR-7, EC-5, AC-13) */}
      {atCap && (
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded px-4 py-2 mb-4">
          Showing the 200 most recently active machines. Older machines are not shown.
        </p>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Developer
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Machine
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Last Seen
              </th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Events
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Last Event
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Registered
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {installs.map((install) => {
              const active = isActiveInstall(install.lastSeenAt);
              return (
                <tr key={install.id}>
                  {/*
                    gitUserId: render as plain text — may look like an email but must NOT be
                    auto-linked (EC-1). React JSX escapes HTML special chars (EC-7).
                    Truncated with Tailwind + title tooltip for full value (FR-9).
                  */}
                  <td className="px-4 py-2 max-w-[10rem]">
                    <span
                      className="block overflow-hidden text-ellipsis whitespace-nowrap font-mono text-xs"
                      title={install.gitUserId}
                    >
                      {install.gitUserId}
                    </span>
                  </td>

                  {/*
                    computerName: truncated with title tooltip for full value (FR-9, EC-2).
                    React JSX escapes HTML special chars (EC-7).
                  */}
                  <td className="px-4 py-2 max-w-[10rem]">
                    <span
                      className="block overflow-hidden text-ellipsis whitespace-nowrap font-mono text-xs"
                      title={install.computerName}
                    >
                      {install.computerName}
                    </span>
                  </td>

                  {/* Active / Inactive badge (FR-7, BR-3, BR-4, AC-9) */}
                  <td className="px-4 py-2">
                    {active ? (
                      <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                        Inactive
                      </span>
                    )}
                  </td>

                  {/*
                    lastSeenAt: null renders as "Never" — no crash (FR-8, BR-4, AC-10).
                    Non-null: LocalTimestamp for browser locale formatting.
                  */}
                  <td className="px-4 py-2 text-xs text-gray-700">
                    {install.lastSeenAt != null ? (
                      <LocalTimestamp iso={install.lastSeenAt} />
                    ) : (
                      "Never"
                    )}
                  </td>

                  {/* eventCount: always a number >= 0 (FR-3, BR-5, EC-4) */}
                  <td className="px-4 py-2 text-right text-xs tabular-nums">
                    {install.eventCount}
                  </td>

                  {/* lastEventAt: null renders as "Never" (EC-4, EC-9) */}
                  <td className="px-4 py-2 text-xs text-gray-700">
                    {install.lastEventAt != null ? (
                      <LocalTimestamp iso={install.lastEventAt} />
                    ) : (
                      "Never"
                    )}
                  </td>

                  {/* createdAt: registration date */}
                  <td className="px-4 py-2 text-xs text-gray-700">
                    <LocalTimestamp iso={install.createdAt} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </main>
  );
}
