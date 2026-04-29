"use client";

/**
 * RenameOrgForm — client component for renaming the organisation.
 *
 * Props:
 *   orgId       — passed for future use; the server scopes the PATCH to the
 *                 session's orgId anyway (security: client cannot override this)
 *   currentName — pre-fills the text input (FR-19, AC-15)
 *
 * Behaviour:
 *   - 200: shows "Saved" success indicator, updates displayed name (FR-20, AC-16)
 *   - Error: renders <p role="alert"> with the error message (FR-21, AC-17)
 *   - Loading: button disabled (FR-22)
 */

import { useState, FormEvent } from "react";

interface RenameOrgFormProps {
  orgId: string;
  currentName: string;
}

export function RenameOrgForm({
  orgId,
  currentName,
}: RenameOrgFormProps): React.ReactElement {
  // orgId is part of the required component interface (FR-19) for forward-compatibility;
  // the server scopes the PATCH to the session's orgId.
  void orgId;
  const [name, setName] = useState(currentName);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setLoading(true);

    try {
      const res = await fetch("/api/v1/orgs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });

      if (res.ok) {
        // FR-20, AC-16: show "Saved" and keep input updated with new name
        setSaved(true);
        return;
      }

      // Error path — extract server message if available (FR-21, AC-17)
      let errorMessage = "Something went wrong. Please try again.";
      try {
        const data = (await res.json()) as { error?: string };
        if (data.error) errorMessage = data.error;
      } catch {
        // Ignore JSON parse errors.
      }
      setError(errorMessage);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-sm">
      <div>
        <label
          htmlFor="org-name"
          className="mb-1 block text-sm font-medium"
        >
          Organization Name
        </label>
        <input
          id="org-name"
          type="text"
          required
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setSaved(false);
          }}
          className="w-full rounded border px-3 py-2 text-sm"
          disabled={loading}
          maxLength={200}
        />
      </div>

      {/* Success indicator (FR-20, AC-16) */}
      {saved && (
        <p className="text-sm text-green-700" role="status">
          Saved
        </p>
      )}

      {/* Error message (FR-21, AC-17) */}
      {error !== null && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      <div>
        <button
          type="submit"
          disabled={loading || name.trim().length === 0}
          className="rounded bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {loading ? "Saving..." : "Save"}
        </button>
      </div>
    </form>
  );
}
