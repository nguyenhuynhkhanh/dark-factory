"use client";

/**
 * InstallsPageClient — client wrapper for the interactive installs page.
 *
 * This is a "use client" component that wraps the table and the Generate Key modal
 * trigger so the parent page (installs/page.tsx) can remain a Server Component
 * for data fetching (FR-1, FR-9).
 *
 * Responsibilities:
 *   - Holds modal open/close state (FR-6, AC-1)
 *   - Renders GenerateKeyModal when open (FR-10)
 *   - Refreshes the route after a key is generated or revoked (FR-9)
 *   - Holds the set of locally-revoked install IDs so the badge updates
 *     immediately without a round-trip (FR-9, AC-11)
 *   - Renders the installs table with Revoke actions (FR-7, FR-8)
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GenerateKeyModal } from "./GenerateKeyModal";
import { LocalTimestamp } from "../_components/LocalTimestamp";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DashboardInstall {
  id: string;
  orgId: string;
  label: string;
  computerName: string | null;
  gitUserId: string | null;
  isActivated: boolean;
  revokedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  lastSeenAt: string | null;
}

interface InstallsPageClientProps {
  installs: DashboardInstall[];
  orgId: string;
}

// ─── Status badge helpers ─────────────────────────────────────────────────────

/**
 * Implements the 4-state badge logic from FR-4 / BR-1 / BR-2 / BR-3.
 * Priority order: Revoked > Active > Inactive > Pending.
 */
function getStatus(
  install: DashboardInstall,
  locallyRevoked: boolean
): "revoked" | "active" | "inactive" | "pending" {
  if (install.revokedAt !== null || locallyRevoked) return "revoked";
  if (!install.isActivated) return "pending";

  // isActivated && revokedAt IS NULL — check 30-day window (BR-3, EC-3)
  if (
    install.lastSeenAt !== null &&
    Date.now() - new Date(install.lastSeenAt).getTime() <
      30 * 24 * 60 * 60 * 1000
  ) {
    return "active";
  }

  return "inactive";
}

function StatusBadge({
  status,
}: {
  status: "revoked" | "active" | "inactive" | "pending";
}): React.ReactElement {
  if (status === "revoked") {
    return (
      <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
        Revoked
      </span>
    );
  }
  if (status === "active") {
    return (
      <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
        Active
      </span>
    );
  }
  if (status === "pending") {
    return (
      <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
        Pending
      </span>
    );
  }
  // inactive
  return (
    <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
      Inactive
    </span>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function InstallsPageClient({
  installs,
  orgId,
}: InstallsPageClientProps): React.ReactElement {
  const router = useRouter();

  // Modal state (FR-6, AC-1)
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Local set of revoked IDs — avoids a full page reload while still updating
  // the badge in real time (FR-9, AC-11).
  const [revokedIds, setRevokedIds] = useState<Set<string>>(new Set());

  // Per-row inline confirmation state (FR-8, AC-10)
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  // Per-row in-flight state so the button disables while the request is pending
  const [revokingId, setRevokingId] = useState<string | null>(null);

  // Per-row inline error (EC-6)
  const [revokeErrors, setRevokeErrors] = useState<Record<string, string>>({});

  function handleModalSuccess(label: string): void {
    // label is passed by GenerateKeyModal after the admin confirms copy (FR-10).
    // Currently unused in the parent but the callback contract is required.
    void label;
    setIsModalOpen(false);
    router.refresh();
  }

  async function handleRevoke(installId: string): Promise<void> {
    setConfirmingId(null);
    setRevokingId(installId);
    setRevokeErrors((prev) => {
      const next = { ...prev };
      delete next[installId];
      return next;
    });

    try {
      const res = await fetch(`/api/v1/installs/${installId}/revoke`, {
        method: "PATCH",
      });

      if (res.ok) {
        setRevokedIds((prev) => new Set([...prev, installId]));
        return;
      }

      // Non-ok response — show inline error (EC-6)
      let msg = "Revoke failed. Please try again.";
      try {
        const data = (await res.json()) as { error?: string };
        if (data.error) msg = data.error;
      } catch {
        // Ignore JSON parse error.
      }
      setRevokeErrors((prev) => ({ ...prev, [installId]: msg }));
    } catch {
      setRevokeErrors((prev) => ({
        ...prev,
        [installId]: "Network error. Please try again.",
      }));
    } finally {
      setRevokingId(null);
    }
  }

  return (
    <>
      {/* Generate API Key button — visible above table and in empty state (FR-6, AC-1, EC-8) */}
      <div className="mb-6">
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="rounded bg-black px-4 py-2 text-sm font-medium text-white hover:opacity-80"
        >
          Generate API Key
        </button>
      </div>

      {/* Modal — rendered outside the table so it overlays correctly */}
      {isModalOpen && (
        <GenerateKeyModal orgId={orgId} onSuccess={handleModalSuccess} />
      )}

      {installs.length === 0 ? (
        /* Empty state (EC-8) */
        <div className="rounded-lg border border-dashed border-gray-300 p-12 text-center">
          <p className="text-gray-600 text-lg">
            No API keys yet. Generate one to get started.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                {/* FR-2, AC-13: Label is the first column */}
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Label
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Computer Name
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Developer
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Seen
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Registered
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {installs.map((install) => {
                const locallyRevoked = revokedIds.has(install.id);
                const status = getStatus(install, locallyRevoked);
                const isRevoked =
                  install.revokedAt !== null || locallyRevoked;
                const isConfirming = confirmingId === install.id;
                const isRevoking = revokingId === install.id;
                const rowError = revokeErrors[install.id];

                return (
                  <tr key={install.id}>
                    {/* Label — FR-2, AC-13 */}
                    <td className="px-4 py-2 text-xs font-mono font-medium">
                      {install.label}
                    </td>

                    {/* Computer Name — FR-3, AC-12: null renders as "—" */}
                    <td className="px-4 py-2 max-w-[10rem]">
                      <span
                        className="block overflow-hidden text-ellipsis whitespace-nowrap font-mono text-xs"
                        title={install.computerName ?? "—"}
                      >
                        {install.computerName ?? "—"}
                      </span>
                    </td>

                    {/* Git User ID — FR-3, AC-12: null renders as "—" */}
                    <td className="px-4 py-2 max-w-[10rem]">
                      <span
                        className="block overflow-hidden text-ellipsis whitespace-nowrap text-xs"
                        title={install.gitUserId ?? "—"}
                      >
                        {install.gitUserId ?? "—"}
                      </span>
                    </td>

                    {/* Status badge — FR-4, AC-6, AC-7 */}
                    <td className="px-4 py-2">
                      <StatusBadge status={status} />
                    </td>

                    {/* Last Seen */}
                    <td className="px-4 py-2 text-xs text-gray-700">
                      {install.lastSeenAt !== null ? (
                        <LocalTimestamp iso={install.lastSeenAt} />
                      ) : (
                        "Never"
                      )}
                    </td>

                    {/* Registered */}
                    <td className="px-4 py-2 text-xs text-gray-700">
                      <LocalTimestamp iso={install.createdAt} />
                    </td>

                    {/* Actions — FR-7, FR-8, AC-8, AC-9, AC-10, AC-11 */}
                    <td className="px-4 py-2 text-xs">
                      {isRevoked ? (
                        /* AC-9: no enabled button for already-revoked rows */
                        <span className="text-gray-400">—</span>
                      ) : isConfirming ? (
                        /* Inline confirmation step (FR-8, AC-10) */
                        <span className="flex items-center gap-2">
                          <span className="text-xs text-gray-700">
                            Revoke?
                          </span>
                          <button
                            type="button"
                            onClick={() => void handleRevoke(install.id)}
                            disabled={isRevoking}
                            className="rounded bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-500 disabled:opacity-50"
                          >
                            {isRevoking ? "Revoking…" : "Yes, revoke"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmingId(null)}
                            disabled={isRevoking}
                            className="rounded border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                          >
                            Cancel
                          </button>
                        </span>
                      ) : (
                        /* Initial revoke button — single click does NOT revoke (FR-8) */
                        <button
                          type="button"
                          onClick={() => setConfirmingId(install.id)}
                          disabled={isRevoking}
                          className="rounded border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                        >
                          Revoke
                        </button>
                      )}
                      {/* Inline error per row (EC-6) */}
                      {rowError !== undefined && (
                        <p
                          className="mt-1 text-xs text-red-600"
                          role="alert"
                        >
                          {rowError}
                        </p>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
