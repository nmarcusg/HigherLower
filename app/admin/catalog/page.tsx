"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { useAdminAuth } from "@/components/admin/AdminShell";
import AdminTable from "@/components/admin/AdminTable";
import { fetchAdminCatalog } from "@/lib/backend/admin";

type CatalogData = Awaited<ReturnType<typeof fetchAdminCatalog>>;

export default function AdminCatalogPage() {
  const { token } = useAdminAuth();
  const [data, setData] = useState<CatalogData | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setData(await fetchAdminCatalog(token));
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load catalog health.");
    }
  }, [token]);

  useEffect(() => {
    void Promise.resolve().then(() => load());
  }, [load]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Official Catalog Health</h1>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Provider status, refresh freshness, and compressed image coverage across all 11 official categories.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-sm border border-white/20 px-3 text-xs font-bold uppercase text-[var(--text-secondary)] hover:text-white"
        >
          <RefreshCw size={13} /> Refresh
        </button>
      </header>

      {error && (
        <div role="alert" className="rounded-sm border border-red-400/40 bg-red-950/30 p-3 text-xs text-red-200">
          {error}
        </div>
      )}

      <AdminTable
        caption={`Official Categories (${data?.total ?? 0})`}
        rows={data?.categories ?? []}
        rowKey={(c) => c.id}
        rowHeaderLabel="Category"
        rowHeader={(c) => (
          <div>
            <p className="font-bold text-white">{c.title}</p>
            <p className="text-[11px] font-normal text-[var(--text-muted)]">
              {c.domain} · {c.refreshSchedule}
            </p>
          </div>
        )}
        columns={[
          {
            key: "status",
            label: "Availability",
            render: (c) => (
              <span
                className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                  c.availability === "SUPPORTED"
                    ? "bg-emerald-500/20 text-emerald-300"
                    : c.availability === "DEGRADED"
                      ? "bg-amber-500/20 text-amber-200"
                      : "bg-red-500/20 text-red-300"
                }`}
              >
                {c.availability}
              </span>
            ),
          },
          { key: "items", label: "Items", align: "right", render: (c) => c.itemCount },
          {
            key: "age",
            label: "Freshness",
            render: (c) =>
              c.ageHours !== null
                ? `${c.ageHours}h ago (${c.freshness.lastRefreshStatus})`
                : c.freshness.lastRefreshStatus,
          },
          {
            key: "compressed",
            label: "Storage Images",
            render: (c) => `${c.compressedCoveragePct}% (${c.compressedImages})`,
          },
          {
            key: "err",
            label: "Last Error / Note",
            render: (c) => c.lastRefreshError ?? c.unavailableReason ?? "—",
          },
        ]}
      />
    </div>
  );
}
