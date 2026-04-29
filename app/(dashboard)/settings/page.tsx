/**
 * Org Settings Page — app/(dashboard)/settings/page.tsx
 *
 * Server Component. Resolves the CTO session, queries D1 for the current org
 * name, and renders RenameOrgForm pre-filled with that name (FR-18, FR-19,
 * AC-15, AC-18).
 *
 * Data fetching pattern: direct D1 query via getDatabase() + drizzle-orm,
 * matching the pattern used in app/(dashboard)/page.tsx.
 */

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { requireCtoSession } from "@/lib/auth/requireCtoSession";
import { getDatabase } from "@/lib/db";
import { orgs } from "@/db/schema";
import { RenameOrgForm } from "./RenameOrgForm";

export default async function SettingsPage(): Promise<React.ReactElement> {
  // Session gate (FR-18, AC-18)
  const sessionResult = await requireCtoSession();
  if (!sessionResult.ok) {
    redirect("/login");
  }

  const { orgId } = sessionResult.session;

  // Query org name from D1 directly (FR-18).
  // Extract result before rendering — no JSX inside try/catch.
  let orgName: string | null = null;
  let fetchError = false;

  try {
    const db = getDatabase();
    const row = await db
      .select({ name: orgs.name })
      .from(orgs)
      .where(eq(orgs.id, orgId))
      .get();

    if (row) {
      orgName = row.name;
    }
  } catch {
    fetchError = true;
  }

  // Render error state if D1 query failed or org row is missing (FR-18 note)
  if (fetchError || orgName === null) {
    return (
      <main className="p-8">
        <h1 className="text-2xl font-bold mb-4">Org Settings</h1>
        <p className="text-red-600">
          Unable to load organization data. Please refresh the page.
        </p>
      </main>
    );
  }

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-6">Org Settings</h1>

      <section>
        <h2 className="text-lg font-semibold mb-4">Organization Name</h2>
        {/*
         * RenameOrgForm is pre-filled with the current org name (FR-19, AC-15).
         * On 200: shows "Saved" and keeps input updated (FR-20, AC-16).
         * On error: renders <p role="alert"> (FR-21, AC-17).
         */}
        <RenameOrgForm orgId={orgId} currentName={orgName} />
      </section>
    </main>
  );
}
