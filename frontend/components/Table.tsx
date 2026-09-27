import { ReactNode } from "react";
import EmptyState from "./EmptyState";
import LoadingSpinner from "./LoadingSpinner";

export interface Column<T> {
  header: string;
  className?: string;
  render: (row: T) => ReactNode;
}

interface Props<T> {
  columns: Column<T>[];
  rows: T[];
  loading: boolean;
  emptyTitle: string;
  emptyDescription?: string;
  keyField: (row: T) => string;
  onRowClick?: (row: T) => void;
  onEmptyAction?: () => void;
  emptyActionLabel?: string;
}

export default function Table<T>({
  columns,
  rows,
  loading,
  emptyTitle,
  emptyDescription,
  keyField,
  onRowClick,
  onEmptyAction,
  emptyActionLabel,
}: Props<T>) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 rounded-2xl bg-white border border-zinc-200/80 shadow-soft">
        <LoadingSpinner />
        <p className="mt-3 text-xs font-medium text-zinc-400">Loading records…</p>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        actionLabel={emptyActionLabel}
        onAction={onEmptyAction}
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-soft">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-zinc-100 text-sm">
          <thead className="bg-zinc-50/75">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.header}
                  className={`px-5 py-3.5 text-left font-semibold text-zinc-500 uppercase tracking-wider text-[11px] ${
                    col.className || ""
                  }`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {rows.map((row) => (
              <tr
                key={keyField(row)}
                onClick={() => onRowClick?.(row)}
                className={`transition-colors duration-100 ${
                  onRowClick
                    ? "cursor-pointer hover:bg-zinc-50/80 active:bg-zinc-100/70"
                    : "hover:bg-zinc-50/50"
                }`}
              >
                {columns.map((col) => (
                  <td
                    key={col.header}
                    className={`px-5 py-3.5 text-zinc-800 ${col.className || ""}`}
                  >
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
