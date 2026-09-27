"use client";

import Table, { Column } from "./Table";
import StatusBadge from "./StatusBadge";
import { api, ScheduledEmail } from "@/lib/api";
import { useState } from "react";

interface Props {
  emails: ScheduledEmail[];
  loading: boolean;
  onSelectEmail?: (email: ScheduledEmail) => void;
  onComposeClick?: () => void;
  onRefresh: () => void;
}

export default function ScheduledEmailsTable({
  emails,
  loading,
  onSelectEmail,
  onComposeClick,
  onRefresh,
}: Props) {
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  async function handleCancel(e: React.MouseEvent, id: string) {
    e.stopPropagation(); // don't open the detail modal
    if (!window.confirm("Cancel this scheduled email? It will be removed from the queue.")) return;
    setCancellingId(id);
    try {
      await api.emails.cancel(id);
      onRefresh(); // re-fetch the table
    } catch (err: any) {
      alert(err.message || "Failed to cancel email");
    } finally {
      setCancellingId(null);
    }
  }

  const columns: Column<ScheduledEmail>[] = [
    {
      header: "Recipient",
      className: "w-1/4",
      render: (r) => (
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-600 font-semibold text-xs">
            {r.recipient.charAt(0).toUpperCase()}
          </div>
          <div className="truncate">
            <span className="font-semibold text-zinc-800 text-xs">
              To: {r.recipient}
            </span>
          </div>
        </div>
      ),
    },
    {
      header: "Subject & Preview",
      className: "w-5/12",
      render: (r) => (
        <div className="truncate max-w-md">
          <span className="font-medium text-zinc-900 text-xs">{r.subject}</span>
          {r.body && (
            <span className="text-zinc-400 text-xs ml-1.5 font-normal truncate">
              — {r.body.replace(/\n/g, " ").slice(0, 60)}…
            </span>
          )}
        </div>
      ),
    },
    {
      header: "Scheduled For",
      className: "w-1/4 text-right",
      render: (r) => (
        <div className="flex items-center justify-end gap-2">
          <StatusBadge status={r.status} timestamp={r.scheduled_at} />
          {(r.status === "pending" || r.status === "rate_limited") && (
            <button
              type="button"
              title="Cancel this email"
              onClick={(e) => handleCancel(e, r.id)}
              disabled={cancellingId === r.id}
              className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-rose-50 text-zinc-400 hover:text-rose-600 transition disabled:opacity-40"
            >
              {cancellingId === r.id ? (
                <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              ) : (
                <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              )}
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <Table
      columns={columns}
      rows={emails}
      loading={loading}
      keyField={(r) => r.id}
      onRowClick={onSelectEmail}
      emptyTitle="No scheduled emails in queue"
      emptyDescription="Create your first campaign to schedule emails with BullMQ."
      emptyActionLabel="+ Compose New Email"
      onEmptyAction={onComposeClick}
    />
  );
}
