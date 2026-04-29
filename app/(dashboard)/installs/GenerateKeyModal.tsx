"use client";

/**
 * GenerateKeyModal — client component for generating a new API key.
 *
 * Props:
 *   orgId    — the CTO's org, forwarded to the POST body (unused server-side
 *              since the session already scopes to the correct org, but kept
 *              for forward-compatibility with multi-org flows)
 *   onSuccess — called with the label after the admin confirms they copied the key
 *
 * Security requirement (BR-4, FR-13): once the key is revealed the modal
 * cannot be dismissed by escape, backdrop click, or any X button — only the
 * "I've copied it" confirmation button closes it.
 */

import { useState, FormEvent } from "react";

interface GenerateKeyModalProps {
  orgId: string;
  onSuccess: (label: string) => void;
}

type ModalState =
  | { kind: "form" }
  | { kind: "revealed"; apiKey: string };

export function GenerateKeyModal({
  orgId,
  onSuccess,
}: GenerateKeyModalProps): React.ReactElement {
  // orgId is part of the required component interface (FR-10) for forward-compatibility
  // with multi-org flows; the server scopes the POST to the session's orgId.
  void orgId;
  const [state, setState] = useState<ModalState>({ kind: "form" });
  const [label, setLabel] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/v1/installs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: label.trim() }),
      });

      if (res.status === 201) {
        const data = (await res.json()) as { apiKey?: string };
        setState({ kind: "revealed", apiKey: data.apiKey ?? "" });
        return;
      }

      if (res.status === 409) {
        setError("A key with this label already exists");
        return;
      }

      setError("Something went wrong");
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy(key: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(key);
      setCopied(true);
    } catch {
      // Clipboard API unavailable — silently ignore.
    }
  }

  function handleConfirmedCopy(): void {
    onSuccess(label.trim());
  }

  return (
    /*
     * Fixed overlay — no onClick on the backdrop to prevent accidental dismissal.
     * This satisfies FR-13, AC-4, EC-5: backdrop click must not close the modal.
     */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="generate-key-modal-title"
    >
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        {state.kind === "form" ? (
          <>
            <h2
              id="generate-key-modal-title"
              className="mb-4 text-lg font-semibold"
            >
              Generate API Key
            </h2>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label
                  htmlFor="key-label"
                  className="mb-1 block text-sm font-medium"
                >
                  Label
                </label>
                <input
                  id="key-label"
                  type="text"
                  required
                  maxLength={64}
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  className="w-full rounded border px-3 py-2 text-sm"
                  disabled={loading}
                  placeholder="e.g. alice-macbook"
                />
              </div>

              {error !== null && (
                <p className="text-sm text-red-600" role="alert">
                  {error}
                </p>
              )}

              <div className="flex justify-end gap-2">
                <button
                  type="submit"
                  disabled={loading || label.trim().length === 0}
                  className="rounded bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  {loading ? "Generating..." : "Generate"}
                </button>
              </div>
            </form>
          </>
        ) : (
          <>
            <h2
              id="generate-key-modal-title"
              className="mb-4 text-lg font-semibold"
            >
              API Key Generated
            </h2>

            {/* One-time key reveal (FR-12, BR-4, AC-3) */}
            <p className="mb-3 text-sm font-medium text-amber-700">
              Copy this key now — you won&apos;t be able to see it again
            </p>

            <div className="mb-4 flex items-center gap-2 rounded border bg-gray-50 p-3">
              <code
                className="flex-1 break-all font-mono text-sm select-all cursor-pointer"
                onClick={() => void handleCopy(state.apiKey)}
                title="Click to copy"
              >
                {state.apiKey}
              </code>
              <button
                type="button"
                onClick={() => void handleCopy(state.apiKey)}
                className="shrink-0 rounded bg-black px-3 py-1.5 text-xs font-medium text-white"
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>

            {/*
             * "I've copied it" is the ONLY way to close after key reveal.
             * No escape key, no backdrop, no X button (FR-13, AC-4, AC-5, EC-5).
             */}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleConfirmedCopy}
                className="rounded bg-black px-4 py-2 text-sm font-medium text-white"
              >
                I&apos;ve copied it
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
