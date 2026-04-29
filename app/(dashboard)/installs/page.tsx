/**
 * API Keys Page — app/(dashboard)/installs/page.tsx
 *
 * Server Component. Queries D1 directly instead of calling the internal API
 * over HTTP — Cloudflare Workers cannot make loopback fetch() requests to
 * themselves.
 */

import { redirect } from "next/navigation";
import { sql } from "drizzle-orm";
import { requireCtoSession } from "@/lib/auth/requireCtoSession";
import { getDatabase } from "@/lib/db";
import {
  InstallsPageClient,
  type DashboardInstall,
} from "./InstallsPageClient";

interface InstallRow {
  id: string;
  label: string;
  computer_name: string | null;
  git_user_id: string | null;
  expires_at: number;
  revoked_at: number | null;
  is_activated: number;
  created_at: number;
  last_seen_at: number | null;
}

export default async function InstallsPage(): Promise<React.ReactElement> {
  const sessionResult = await requireCtoSession();
  if (!sessionResult.ok) {
    redirect("/login");
  }

  const { orgId } = sessionResult.session;
  const db = getDatabase();

  let installs: DashboardInstall[];
  try {
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
            installs.last_seen_at
          FROM installs
          WHERE installs.org_id = ${orgId}
          ORDER BY installs.last_seen_at DESC NULLS LAST
          LIMIT 200`
    );

    installs = rows.map((row) => ({
      id: row.id,
      orgId,
      label: row.label,
      computerName: row.computer_name,
      gitUserId: row.git_user_id,
      expiresAt: new Date(row.expires_at * 1000).toISOString(),
      revokedAt: row.revoked_at != null
        ? new Date(row.revoked_at * 1000).toISOString()
        : null,
      isActivated: row.is_activated === 1,
      createdAt: new Date(row.created_at * 1000).toISOString(),
      lastSeenAt: row.last_seen_at != null
        ? new Date(row.last_seen_at * 1000).toISOString()
        : null,
    }));
  } catch {
    return (
      <main className="p-8">
        <h1 className="text-2xl font-bold mb-4">API Keys</h1>
        <p className="text-red-600">
          Unable to load API keys. Please refresh the page.
        </p>
      </main>
    );
  }

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-4">API Keys</h1>
      <InstallsPageClient installs={installs} orgId={orgId} />
    </main>
  );
}
