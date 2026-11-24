"use client";

import { useSyncExternalStore } from "react";
import { RefreshCw } from "lucide-react";
import {
  getServerRefreshEntry,
  getTabRefreshEntry,
  runTrackedRefresh,
  subscribeRefreshStore,
} from "@/lib/admin/refreshStore";

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return iso;
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  return sameDay ? d.toLocaleTimeString() : d.toLocaleString();
}

export default function AdminRefreshButton({
  tabKey,
  onRefresh,
  label = "Refresh",
  serverUpdatedAt,
}: {
  tabKey: string;
  onRefresh: () => Promise<unknown>;
  label?: string;
  serverUpdatedAt?: string | null;
}) {
  const entry = useSyncExternalStore(
    subscribeRefreshStore,
    () => getTabRefreshEntry(tabKey),
    getServerRefreshEntry,
  );

  async function handleClick() {
    if (entry.inFlight) return;
    try {
      await runTrackedRefresh(tabKey, onRefresh);
    } catch {
      // Page state surfaces the error alert; refreshStore keeps the last error message.
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={entry.inFlight}
        onClick={() => void handleClick()}
        aria-busy={entry.inFlight}
        className="inline-flex min-h-9 items-center gap-1.5 rounded-sm border border-white/25 bg-[#121628] px-3 text-xs font-bold uppercase text-[var(--text-secondary)] transition hover:border-white/45 hover:text-white disabled:cursor-wait disabled:opacity-70"
      >
        <RefreshCw
          size={13}
          aria-hidden="true"
          className={entry.inFlight ? "animate-spin text-[var(--accent-highlight)]" : ""}
        />
        <span>{entry.inFlight ? "Refreshing…" : label}</span>
      </button>
      <p className="text-[10px] text-[var(--text-muted)]" aria-live="polite">
        {entry.inFlight
          ? "Fetching latest data…"
          : entry.lastError
            ? `Failed: ${entry.lastError}`
            : entry.lastRefreshedAt
              ? `Checked ${formatTimestamp(entry.lastRefreshedAt)}`
              : serverUpdatedAt
                ? `Data updated ${formatTimestamp(serverUpdatedAt)}`
                : "Not manually checked yet"}
      </p>
    </div>
  );
}
