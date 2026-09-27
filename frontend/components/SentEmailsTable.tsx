import Table, { Column } from "./Table";
import StatusBadge from "./StatusBadge";
import { SentEmail } from "@/lib/api";

interface Props {
  emails: SentEmail[];
  loading: boolean;
  onSelectEmail?: (email: SentEmail) => void;
  onComposeClick?: () => void;
}

export default function SentEmailsTable({
  emails,
  loading,
  onSelectEmail,
  onComposeClick,
}: Props) {
  const columns: Column<SentEmail>[] = [
    {
      header: "Recipient",
      className: "w-1/4",
      render: (r) => (
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 font-semibold text-xs border border-emerald-100">
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
      className: "w-1/2",
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
      header: "Sent Status",
      className: "w-1/4 text-right",
      render: (r) => (
        <div className="flex justify-end">
          <StatusBadge status={r.status} timestamp={r.sent_at} />
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
      emptyTitle="No sent emails yet"
      emptyDescription="Emails that have been successfully dispatched via Ethereal SMTP will appear here."
      emptyActionLabel="+ Compose New Email"
      onEmptyAction={onComposeClick}
    />
  );
}
