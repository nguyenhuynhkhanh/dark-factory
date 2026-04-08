/**
 * API Keys Page — app/(dashboard)/installs/page.tsx
 *
 * Server Component. Resolves the CTO session, then fetches install data via
 * GET /api/v1/dashboard/installs (with forwarded session cookie) rather than
 * querying D1 directly, because the API response includes server-computed
 * fields (`isActivated`, `revokedAt`) needed by the status badge logic
 * (FR-1, NFR-3).
 *
 * All interactive elements (Generate Key modal, Revoke actions, badge updates)
 * live in InstallsPageClient ("use client") so this page stays a Server
 * Component for data fetching (FR-9 pattern note).
 */

import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";
import { requireCtoSession } from "@/lib/auth/requireCtoSession";
import {
  InstallsPageClient,
  type DashboardInstall,
} from "./InstallsPageClient";

// ─── API response shape ───────────────────────────────────────────────────────

interface InstallsApiResponse {
  installs: DashboardInstall[];
}

// ─── Data Fetching ────────────────────────────────────────────────────────────

async function fetchInstalls(
  baseUrl: string,
  cookieHeader: string
): Promise<DashboardInstall[]> {
  const res = await fetch(`${baseUrl}/api/v1/dashboard/installs`, {
    headers: { cookie: cookieHeader },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Installs API returned ${res.status}`);
  }

  const data = (await res.json()) as InstallsApiResponse;
  return data.installs ?? [];
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function InstallsPage(): Promise<React.ReactElement> {
  // Resolve session (layout cannot pass data to children — App Router constraint).
  const sessionResult = await requireCtoSession();
  if (!sessionResult.ok) {
    redirect("/login");
  }

  const { orgId } = sessionResult.session;

  // Forward the session cookie to the internal API (NFR-3).
  const headerStore = await headers();
  const host = headerStore.get("host") ?? "localhost:3000";
  const proto = host.startsWith("localhost") ? "http" : "https";
  const baseUrl = `${proto}://${host}`;
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  let installs: DashboardInstall[];
  try {
    installs = await fetchInstalls(baseUrl, cookieHeader);
  } catch {
    // NFR-4: render error state rather than crash.
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

      {/*
       * InstallsPageClient holds all interactive state:
       *   - "Generate API Key" button + modal (FR-6, AC-1)
       *   - Revoke button with inline confirmation (FR-7, FR-8, AC-8–AC-11)
       *   - Local revoke state for immediate badge updates (FR-9)
       */}
      <InstallsPageClient installs={installs} orgId={orgId} />
    </main>
  );
}
