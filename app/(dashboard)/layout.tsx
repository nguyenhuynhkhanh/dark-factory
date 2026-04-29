/**
 * Dashboard layout — Server Component session gate + top-level navigation.
 *
 * Reads the __Host-session cookie and validates it against D1.
 * Redirects to /login if the session is missing or expired.
 *
 * Renders a persistent nav bar with links to:
 *   Dashboard  → /
 *   API Keys   → /installs
 *   Org Settings → /settings
 * (FR-17, AC-14)
 *
 * Per App Router constraints: the layout gates access and provides chrome.
 * Each dashboard page must resolve its own session independently — the layout
 * cannot pass data (e.g. orgId) to child pages.
 */

import { redirect } from "next/navigation";
import Link from "next/link";
import { requireCtoSession } from "@/lib/auth/requireCtoSession";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}): Promise<React.ReactElement> {
  const result = await requireCtoSession();

  if (!result.ok) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top navigation bar (FR-17, AC-14) */}
      <nav className="border-b border-gray-200 bg-white px-8 py-3">
        <ul className="flex items-center gap-6 text-sm font-medium">
          <li>
            <Link
              href="/"
              className="text-gray-700 hover:text-black"
            >
              Dashboard
            </Link>
          </li>
          <li>
            <Link
              href="/installs"
              className="text-gray-700 hover:text-black"
            >
              API Keys
            </Link>
          </li>
          <li>
            <Link
              href="/settings"
              className="text-gray-700 hover:text-black"
            >
              Org Settings
            </Link>
          </li>
        </ul>
      </nav>

      {children}
    </div>
  );
}
