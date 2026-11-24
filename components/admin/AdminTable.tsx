"use client";

import { useId, type ReactNode } from "react";

export interface AdminColumn<T> {
  key: string;
  label: string;
  render: (row: T) => ReactNode;
  align?: "left" | "right";
}

interface AdminTableProps<T> {
  caption: string;
  rows: T[];
  rowKey: (row: T) => string;
  rowHeader: (row: T) => ReactNode;
  rowHeaderLabel?: string;
  columns: AdminColumn<T>[];
  emptyMessage?: string;
}

/**
 * Accessible responsive table with sticky headers (`thead` + `tbody th`) and
 * container-query stacked mobile cards.
 */
export default function AdminTable<T>({
  caption,
  rows,
  rowKey,
  rowHeader,
  rowHeaderLabel = "Item",
  columns,
  emptyMessage = "No records found.",
}: AdminTableProps<T>) {
  const captionId = useId();

  return (
    <div
      tabIndex={0}
      role="region"
      aria-labelledby={captionId}
      className="admin-table-wrapper"
    >
      <table>
        <caption id={captionId}>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">{rowHeaderLabel}</th>
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={col.align === "right" ? "text-right" : ""}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length + 1}
                className="py-8 text-center text-xs text-[var(--text-muted)]"
              >
                {emptyMessage}
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
