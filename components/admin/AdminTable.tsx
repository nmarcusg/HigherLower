"use client";

import { useId, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, LoaderCircle } from "lucide-react";

export interface AdminColumn<T> {
  key: string;
  label: string;
  render: (row: T) => ReactNode;
  align?: "left" | "right";
  sortKey?: string;
}

interface AdminTableProps<T> {
  caption: string;
  rows: T[];
  rowKey: (row: T) => string;
  rowHeader: (row: T) => ReactNode;
  rowHeaderLabel?: string;
  rowHeaderSortKey?: string;
  columns: AdminColumn<T>[];
  emptyMessage?: string;
  loading?: boolean;
  loadingMessage?: string;
  sortBy?: string;
  sortDir?: "asc" | "desc";
  onSort?: (key: string) => void;
}

/**
 * Accessible responsive table with sticky headers (`thead` + `tbody th`),
 * optional sortable header buttons with `aria-sort` on `<th>`, and loading state.
 */
export default function AdminTable<T>({
  caption,
  rows,
  rowKey,
  rowHeader,
  rowHeaderLabel = "Item",
  rowHeaderSortKey,
  columns,
  emptyMessage = "No records found.",
  loading = false,
  loadingMessage = "Loading…",
  sortBy,
  sortDir = "asc",
  onSort,
}: AdminTableProps<T>) {
  const captionId = useId();
  const statusId = useId();

  const sortedColumnLabel =
    sortBy && rowHeaderSortKey === sortBy
      ? rowHeaderLabel
      : columns.find((c) => c.sortKey === sortBy)?.label;

  function renderHeaderCell(
    cellKey: string,
    label: string,
    cellSortKey: string | undefined,
    alignRight = false,
  ) {
    const active = Boolean(onSort && cellSortKey && sortBy === cellSortKey);
    const ariaSort = active
      ? sortDir === "asc"
        ? "ascending"
        : "descending"
      : undefined;

    if (!onSort || !cellSortKey) {
      return (
        <th
          key={cellKey}
          scope="col"
          className={alignRight ? "text-right" : ""}
        >
          {label}
        </th>
      );
    }

    return (
      <th
        key={cellKey}
        scope="col"
        aria-sort={ariaSort}
        className={alignRight ? "text-right" : ""}
      >
        <button type="button" onClick={() => onSort(cellSortKey)}>
          <span>{label}</span>
          {active ? (
            sortDir === "asc" ? (
              <ArrowUp size={13} aria-hidden="true" className="shrink-0" />
            ) : (
              <ArrowDown size={13} aria-hidden="true" className="shrink-0" />
            )
          ) : (
            <ArrowUpDown size={12} aria-hidden="true" className="shrink-0 opacity-45" />
          )}
        </button>
      </th>
    );
  }

  return (
    <div
      tabIndex={0}
      role="region"
      aria-labelledby={captionId}
      className="admin-table-wrapper"
    >
      <p id={statusId} role="status" className="sr-only">
        {sortedColumnLabel
          ? `Sorted by ${sortedColumnLabel}, ${sortDir === "asc" ? "ascending" : "descending"}, ${rows.length} rows`
          : ""}
      </p>
      <table>
        <caption id={captionId}>
          <span className="inline-flex items-center gap-2.5">
            <span>{caption}</span>
            {loading && rows.length > 0 && (
              <span className="inline-flex items-center gap-1 rounded bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--accent-highlight)]">
                <LoaderCircle size={11} className="animate-spin" aria-hidden="true" />
                Updating…
              </span>
            )}
          </span>
        </caption>
        <thead>
          <tr>
            {renderHeaderCell("__rowHeader", rowHeaderLabel, rowHeaderSortKey, false)}
            {columns.map((col) =>
              renderHeaderCell(col.key, col.label, col.sortKey, col.align === "right"),
            )}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length + 1}
                className="py-10 text-center text-xs text-[var(--text-muted)]"
              >
                {loading ? (
                  <span className="inline-flex items-center justify-center gap-2 text-[var(--text-secondary)]">
                    <LoaderCircle
                      size={15}
                      className="animate-spin text-[var(--accent-highlight)]"
                      aria-hidden="true"
                    />
                    <span>{loadingMessage}</span>
                  </span>
                ) : (
                  emptyMessage
                )}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={rowKey(row)}>
                <th scope="row">{rowHeader(row)}</th>
                {columns.map((col) => (
                  <td
                    key={col.key}
                    data-label={col.label}
                    className={col.align === "right" ? "sm:text-right" : ""}
                  >
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
