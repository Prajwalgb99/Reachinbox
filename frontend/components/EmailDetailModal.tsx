"use client";

import { ScheduledEmail, SentEmail } from "@/lib/api";
import StatusBadge from "./StatusBadge";
import Button from "./Button";

interface Props {
  email: ScheduledEmail | SentEmail | null;
  onClose: () => void;
}

export default function EmailDetailModal({ email, onClose }: Props) {
  if (!email) return null;

  const isSent = "sent_at" in email;
  const timestamp = isSent ? (email as SentEmail).sent_at : (email as ScheduledEmail).scheduled_at;
  const failureReason = isSent ? (email as SentEmail).failure_reason : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-zinc-900/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative z-10 w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-modal border border-zinc-200/80 animate-in fade-in zoom-in-95 duration-200">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-zinc-100 text-zinc-500 transition"
              title="Back"
            >
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <h2 className="text-base font-semibold text-zinc-900 truncate max-w-md">
              {email.subject}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <StatusBadge status={email.status} timestamp={timestamp} />
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600 transition"
            >
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Sender / Recipient Info Bar */}
        <div className="flex items-start justify-between border-b border-zinc-100 px-6 py-4 bg-zinc-50/50">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-brand-700 font-semibold text-sm">
              {email.recipient.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-zinc-800">
                  To: {email.recipient}
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Job ID: <span className="font-mono text-zinc-500">{email.id}</span>
              </p>
            </div>
          </div>

          <div className="text-right">
            <p className="text-xs text-zinc-500">
              {timestamp
                ? new Date(timestamp).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })
                : "Not sent yet"}
            </p>
          </div>
        </div>

        {/* Message Content */}
        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Priority / Campaign Callout Box (Figma Frame 4) */}
          <div className="rounded-xl border-l-4 border-amber-400 bg-amber-50/60 p-4 text-xs text-amber-900 leading-relaxed shadow-soft">
            <div className="flex items-center gap-2 font-semibold mb-1">
              <span>⚡ Automated Outreach Batch</span>
              <span className="text-[10px] uppercase tracking-wider rounded bg-amber-200/80 px-1.5 py-0.5 font-bold">
                Ethereal SMTP
              </span>
            </div>
            <p className="text-amber-800/90">
              Scheduled and throttled through Redis BullMQ with hourly rate limit protection and Slack alert triggers.
            </p>
          </div>

          {failureReason && (
            <div className="rounded-xl border-l-4 border-rose-500 bg-rose-50 p-4 text-xs text-rose-900">
              <p className="font-semibold mb-1">Delivery Failure Reason:</p>
              <p className="font-mono">{failureReason}</p>
            </div>
          )}

          {/* Body Text */}
          <div className="rounded-xl border border-zinc-100 bg-white p-5 shadow-soft">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
              Email Body
            </h3>
            <div className="text-sm text-zinc-800 whitespace-pre-wrap leading-relaxed">
              {email.body || "(No message body content preview available for this email)"}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-zinc-100 px-6 py-3.5 bg-zinc-50/50">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
