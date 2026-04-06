"use client";

/**
 * EventFilters — client component for the Event Explorer filter bar.
 *
 * Reads initial values from props (passed by the Server Component which
 * reads URL searchParams). On change, debounces 300ms then calls
 * router.replace() with updated search params, preserving URL state.
 *
 * Debounce is implemented with useRef + setTimeout/clearTimeout (NFR-5, H-24).
 * No external debounce library is used.
 */

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export interface InstallOption {
  id: string;
  computerName: string;
  gitUserId: string;
}

interface EventFiltersProps {
  installs: InstallOption[];
  currentInstallId: string;
  currentCommand: string;
  currentOutcome: string;
  currentFrom: string;
  currentTo: string;
  currentPage: number;
}

const COMMANDS = [
  "df-intake",
  "df-debug",
  "df-orchestrate",
  "df-onboard",
  "df-cleanup",
];

const OUTCOMES = ["success", "failed", "blocked", "abandoned"];

export function EventFilters({
  installs,
  currentInstallId,
  currentCommand,
  currentOutcome,
  currentFrom,
  currentTo,
}: EventFiltersProps): React.ReactElement {
  const router = useRouter();
  // Timer ref for debounce — cleared on each change (H-24).
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Local state mirrors the URL search params for controlled inputs.
  const [installId, setInstallId] = useState(currentInstallId);
  const [command, setCommand] = useState(currentCommand);
  const [outcome, setOutcome] = useState(currentOutcome);
  const [from, setFrom] = useState(currentFrom);
  const [to, setTo] = useState(currentTo);

  /**
   * Push updated filters to the URL after a 300ms debounce.
   * Always resets page to 1 when filters change.
   */
  function pushFilters(updates: {
    installId?: string;
    command?: string;
    outcome?: string;
    from?: string;
    to?: string;
  }) {
    // Merge updates with current state.
    const next = {
      installId: updates.installId !== undefined ? updates.installId : installId,
      command: updates.command !== undefined ? updates.command : command,
      outcome: updates.outcome !== undefined ? updates.outcome : outcome,
      from: updates.from !== undefined ? updates.from : from,
      to: updates.to !== undefined ? updates.to : to,
    };

    // Debounce: clear any pending timer before scheduling a new one (H-24).
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      const params = new URLSearchParams();

      if (next.installId) params.set("installId", next.installId);
      if (next.command) params.set("command", next.command);
      if (next.outcome) params.set("outcome", next.outcome);
      if (next.from) params.set("from", next.from);
      if (next.to) params.set("to", next.to);
      // Always reset to page 1 when filter changes.
      params.set("page", "1");

      router.replace("?" + params.toString());
    }, 300);
  }

  return (
    <div className="flex flex-wrap gap-3 mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
      {/* Install filter */}
      <div className="flex flex-col gap-1">
        <label
          htmlFor="filter-install"
          className="text-xs font-medium text-gray-600"
        >
          Install
        </label>
        <select
          id="filter-install"
          value={installId}
          onChange={(e) => {
            setInstallId(e.target.value);
            pushFilters({ installId: e.target.value });
          }}
          className="text-sm border border-gray-300 rounded px-2 py-1 bg-white min-w-[180px]"
        >
          <option value="">All installs</option>
          {installs.map((inst) => (
            <option key={inst.id} value={inst.id}>
              {inst.gitUserId} ({inst.computerName})
            </option>
          ))}
        </select>
      </div>

      {/* Command filter */}
      <div className="flex flex-col gap-1">
        <label
          htmlFor="filter-command"
          className="text-xs font-medium text-gray-600"
        >
          Command
        </label>
        <select
          id="filter-command"
          value={command}
          onChange={(e) => {
            setCommand(e.target.value);
            pushFilters({ command: e.target.value });
          }}
          className="text-sm border border-gray-300 rounded px-2 py-1 bg-white"
        >
          <option value="">All commands</option>
          {COMMANDS.map((cmd) => (
            <option key={cmd} value={cmd}>
              {cmd}
            </option>
          ))}
        </select>
      </div>

      {/* Outcome filter */}
      <div className="flex flex-col gap-1">
        <label
          htmlFor="filter-outcome"
          className="text-xs font-medium text-gray-600"
        >
          Outcome
        </label>
        <select
          id="filter-outcome"
          value={outcome}
          onChange={(e) => {
            setOutcome(e.target.value);
            pushFilters({ outcome: e.target.value });
          }}
          className="text-sm border border-gray-300 rounded px-2 py-1 bg-white"
        >
          <option value="">All outcomes</option>
          {OUTCOMES.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </div>

      {/* From date */}
      <div className="flex flex-col gap-1">
        <label
          htmlFor="filter-from"
          className="text-xs font-medium text-gray-600"
        >
          From
        </label>
        <input
          id="filter-from"
          type="datetime-local"
          value={from ? toDatetimeLocal(from) : ""}
          onChange={(e) => {
            const iso = e.target.value ? toISOString(e.target.value) : "";
            setFrom(iso);
            pushFilters({ from: iso });
          }}
          className="text-sm border border-gray-300 rounded px-2 py-1 bg-white"
        />
      </div>

      {/* To date */}
      <div className="flex flex-col gap-1">
        <label
          htmlFor="filter-to"
          className="text-xs font-medium text-gray-600"
        >
          To
        </label>
        <input
          id="filter-to"
          type="datetime-local"
          value={to ? toDatetimeLocal(to) : ""}
          onChange={(e) => {
            const iso = e.target.value ? toISOString(e.target.value) : "";
            setTo(iso);
            pushFilters({ to: iso });
          }}
          className="text-sm border border-gray-300 rounded px-2 py-1 bg-white"
        />
      </div>
    </div>
  );
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

/** Convert ISO 8601 UTC string to the format required by datetime-local input. */
function toDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  // datetime-local expects YYYY-MM-DDTHH:MM (local time, no timezone).
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    d.getFullYear() +
    "-" +
    pad(d.getMonth() + 1) +
    "-" +
    pad(d.getDate()) +
    "T" +
    pad(d.getHours()) +
    ":" +
    pad(d.getMinutes())
  );
}

/** Convert datetime-local value (local time) back to ISO 8601 UTC string. */
function toISOString(datetimeLocal: string): string {
  const d = new Date(datetimeLocal);
  if (isNaN(d.getTime())) return "";
  return d.toISOString();
}
