"use client";

/**
 * CopyInviteLink — client component for the "Copy invite link" button.
 *
 * Uses navigator.clipboard.writeText() to copy the invite URL.
 * Falls back to a read-only <input> with the URL selected if the
 * clipboard API is unavailable (non-HTTPS or older browsers).
 *
 * Must be a 'use client' component because it accesses navigator.clipboard
 * and useState, which are not available in Server Components.
 */

import { useState } from "react";

interface CopyInviteLinkProps {
  inviteUrl: string;
}

export function CopyInviteLink({ inviteUrl }: CopyInviteLinkProps): React.ReactElement {
  const [copied, setCopied] = useState(false);
  const [showFallback, setShowFallback] = useState(false);

  async function handleClick(): Promise<void> {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(inviteUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        return;
      } catch {
        // Clipboard write failed — fall through to fallback input.
      }
    }
    // Fallback: show a read-only input so the user can copy manually.
    setShowFallback(true);
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={handleClick}
        className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        aria-label="Copy invite link"
      >
        {copied ? "Copied!" : "Copy invite link"}
      </button>
      {showFallback && (
        <input
          type="text"
          readOnly
          value={inviteUrl}
          className="rounded border border-gray-300 px-3 py-1.5 text-sm font-mono text-gray-700 w-72 focus:outline-none focus:ring-2 focus:ring-blue-500"
          onFocus={(e) => e.currentTarget.select()}
          aria-label="Invite link URL"
        />
      )}
    </div>
  );
}
