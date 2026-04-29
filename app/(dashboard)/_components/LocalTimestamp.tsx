"use client";

/**
 * LocalTimestamp — client component for browser-local timezone formatting.
 *
 * Accepts an ISO 8601 string and renders it using the browser's locale and
 * timezone. This avoids hydration mismatches that occur when the server
 * formats timestamps in its own timezone (UTC on Cloudflare Workers).
 *
 * The server renders the raw ISO string as a <time> element's datetime
 * attribute; the client component replaces the displayed text with the
 * localized string after hydration.
 */

interface LocalTimestampProps {
  iso: string;
}

export function LocalTimestamp({ iso }: LocalTimestampProps): React.ReactElement {
  return (
    <time dateTime={iso} suppressHydrationWarning>
      {new Date(iso).toLocaleString()}
    </time>
  );
}
