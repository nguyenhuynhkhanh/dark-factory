/**
 * Dashboard layout — Server Component session gate.
 *
 * Reads the __Host-session cookie and validates it against D1.
 * Redirects to /login if the session is missing or expired.
 * Per the architect review: this layout only gates access.
 * Each dashboard page must resolve its own session independently.
 */

import { redirect } from "next/navigation";
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

  return <>{children}</>;
}
