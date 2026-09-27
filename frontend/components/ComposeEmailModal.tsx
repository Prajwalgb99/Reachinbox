"use client";

import { useEffect, useRef, useState } from "react";
import Button from "./Button";
import { api, Sender } from "@/lib/api";

interface Props {
  open: boolean;
  onClose: () => void;
  onScheduled: () => void;
}

export default function ComposeEmailModal({ open, onClose, onScheduled }: Props) {
  const [senders, setSenders] = useState<Sender[]>([]);
  const [senderId, setSenderId] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [recipients, setRecipients] = useState<string[]>([]);
  const [recipientInput, setRecipientInput] = useState("");
  const [fileName, setFileName] = useState("");
  const [startTime, setStartTime] = useState("");
  const [delayBetweenEmailsSec, setDelayBetweenEmailsSec] = useState(2);
  const [hourlyLimit, setHourlyLimit] = useState(200);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showSchedulePicker, setShowSchedulePicker] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    api.senders
      .list()
      .then((r) => {
        setSenders(r.senders);
        if (r.senders[0]) setSenderId(r.senders[0].id);
      })
      .catch(() => {});

    api.emails
      .getConfig()
      .then((cfg) => {
        if (cfg.maxEmailsPerHourPerSender) setHourlyLimit(cfg.maxEmailsPerHourPerSender);
        if (cfg.minDelayMsBetweenSends) setDelayBetweenEmailsSec(Math.round(cfg.minDelayMsBetweenSends / 1000));
      })
      .catch(() => {});

    // Default start time: 2 minutes from now
    const d = new Date(Date.now() + 2 * 60 * 1000);
    d.setSeconds(0, 0);
    setStartTime(new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16));
  }, [open]);

  // Handle adding recipient from typed input
  function handleAddRecipient(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const val = recipientInput.trim().replace(/^,+|,+$/g, "");
      if (val && !recipients.includes(val)) {
        setRecipients([...recipients, val]);
        setRecipientInput("");
      }
    }
  }

  function removeRecipient(emailToRemove: string) {
    setRecipients(recipients.filter((r) => r !== emailToRemove));
  }

  // Handle CSV file upload
  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setError("");
    try {
      const result = await api.emails.parseLeads(file);
      // Merge with existing recipients
      const unique = Array.from(new Set([...recipients, ...result.recipients]));
      setRecipients(unique);
    } catch (err: any) {
      setError(err.message || "Could not parse leads file");
    }
  }

  async function handleCreateSender() {
    const name = prompt("Name this sender (e.g. 'Outreach A')");
    if (!name) return;
    try {
      const { sender } = await api.senders.create(name);
      setSenders((prev) => [sender, ...prev]);
      setSenderId(sender.id);
    } catch (err: any) {
      setError(err.message || "Failed to create sender");
    }
  }

  // Quick schedule presets
  function setQuickSchedule(minutesAhead: number) {
    const d = new Date(Date.now() + minutesAhead * 60 * 1000);
    d.setSeconds(0, 0);
    setStartTime(new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16));
    setShowSchedulePicker(false);
  }

  function setTomorrowSchedule(hour: number) {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(hour, 0, 0, 0);
    setStartTime(new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16));
    setShowSchedulePicker(false);
  }

  async function handleSubmit() {
    setError("");
    if (!senderId) return setError("Please select or create an email sender identity.");
    if (!subject.trim()) return setError("Subject line cannot be empty.");
    if (!body.trim()) return setError("Email message body cannot be empty.");
    if (recipients.length === 0) {
      if (recipientInput.trim()) {
        recipients.push(recipientInput.trim());
      } else {
        return setError("Please add at least one recipient email or upload a CSV leads list.");
      }
    }

    setSubmitting(true);
    try {
      await api.emails.schedule({
        senderId,
        subject,
        body,
        recipients,
        startTime: new Date(startTime).toISOString(),
        delayBetweenEmailsMs: delayBetweenEmailsSec * 1000,
        hourlyLimit,
      });
      onScheduled();
      onClose();
      // Reset
      setSubject("");
      setBody("");
      setRecipients([]);
      setRecipientInput("");
      setFileName("");
    } catch (err: any) {
      setError(err.message || "Failed to schedule email batch");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-zinc-900/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative z-10 w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-modal border border-zinc-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50 text-brand-600 font-bold">
              ✍
            </span>
            <h2 className="text-base font-semibold text-zinc-900">Compose New Email</h2>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600 transition"
          >
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {error && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-2.5 text-xs text-rose-700 flex items-center gap-2">
              <svg className="h-4 w-4 text-rose-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Sender Selection */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                From (Sender SMTP)
              </label>
              <button
                type="button"
                onClick={handleCreateSender}
                className="text-xs font-semibold text-brand-600 hover:text-brand-700 hover:underline"
              >
                + Add new sender
              </button>
            </div>
            <select
              value={senderId}
              onChange={(e) => setSenderId(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-3 py-2 text-sm text-zinc-800 focus:bg-white focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition"
            >
              {senders.length === 0 && <option value="">No senders created yet</option>}
              {senders.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.smtp_user})
                </option>
              ))}
            </select>
          </div>

          {/* Recipient Multi-tag & CSV Upload (Figma style) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                To (Recipients)
              </label>

              {/* Upload Leads CSV Button */}
              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".csv,.txt"
                  onChange={handleFile}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-brand-700 hover:underline"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  <span>Upload List (CSV)</span>
                </button>
              </div>
            </div>

            {/* Recipient Box with Tag Chips */}
            <div className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 p-2 focus-within:bg-white focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20 transition">
              <div className="flex flex-wrap items-center gap-1.5 max-h-32 overflow-y-auto">
                {recipients.map((email) => (
                  <span
                    key={email}
                    className="inline-flex items-center gap-1 rounded-full bg-brand-50 border border-brand-200 px-2.5 py-0.5 text-xs font-medium text-brand-800"
                  >
                    <span>{email}</span>
                    <button
                      type="button"
                      onClick={() => removeRecipient(email)}
                      className="text-brand-500 hover:text-brand-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
                <input
                  type="email"
                  value={recipientInput}
                  onChange={(e) => setRecipientInput(e.target.value)}
                  onKeyDown={handleAddRecipient}
                  placeholder={
                    recipients.length === 0
                      ? "Type email and press Enter, or upload CSV..."
                      : "Add more..."
                  }
                  className="flex-1 min-w-[180px] bg-transparent text-sm text-zinc-800 placeholder-zinc-400 focus:outline-none px-1 py-1"
                />
              </div>
            </div>

            {fileName && (
              <p className="mt-1 text-xs text-zinc-500">
                Loaded file: <span className="font-semibold text-zinc-700">{fileName}</span> ({recipients.length} total leads)
              </p>
            )}
          </div>

          {/* Subject */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1.5 block">
              Subject
            </label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Quick question regarding cold outreach automation"
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-3 py-2 text-sm text-zinc-800 placeholder-zinc-400 focus:bg-white focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition"
            />
          </div>

          {/* Body with formatting shortcuts (Figma style) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Email Message Body
              </label>
              {/* Quick Formatting Helpers */}
              <div className="flex items-center gap-1 text-zinc-400 text-xs">
                <button
                  type="button"
                  onClick={() => setBody((prev) => prev + " **bold** ")}
                  className="px-1.5 py-0.5 rounded hover:bg-zinc-100 hover:text-zinc-700 font-bold"
                  title="Bold"
                >
                  B
                </button>
                <button
                  type="button"
                  onClick={() => setBody((prev) => prev + " *italic* ")}
                  className="px-1.5 py-0.5 rounded hover:bg-zinc-100 hover:text-zinc-700 italic"
                  title="Italic"
                >
                  I
                </button>
                <button
                  type="button"
                  onClick={() => setBody((prev) => prev + "\n- Item\n")}
                  className="px-1.5 py-0.5 rounded hover:bg-zinc-100 hover:text-zinc-700"
                  title="Bullet"
                >
                  •=
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setBody(
                      (prev) =>
                        prev + "\n⚡ High Priority: Only 4 spots remaining worldwide! ⚡\n"
                    )
                  }
                  className="px-1.5 py-0.5 rounded hover:bg-zinc-100 hover:text-amber-600"
                  title="Figma Callout Box"
                >
                  ⚡
                </button>
              </div>
            </div>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
              placeholder="Hi there,\n\nI noticed your team was looking to scale cold outreach..."
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 p-3 text-sm text-zinc-800 placeholder-zinc-400 focus:bg-white focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition leading-relaxed"
            />
          </div>

          {/* Rate Limiting & Send Later Controls */}
          <div className="rounded-xl border border-zinc-200 bg-zinc-50/60 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-700">
                Throttling & Scheduler Controls
              </span>
              <span className="text-[11px] text-zinc-400 font-medium">
                Enforced by BullMQ + Redis
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Start Time with Quick Presets Popover */}
              <div className="relative">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-zinc-600">Start Time</label>
                  <button
                    type="button"
                    onClick={() => setShowSchedulePicker(!showSchedulePicker)}
                    className="text-[11px] font-semibold text-brand-600 hover:underline"
                  >
                    Presets
                  </button>
                </div>
                <input
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-xs text-zinc-800 focus:border-brand-500 focus:outline-none"
                />

                {/* Presets Popover */}
                {showSchedulePicker && (
                  <div className="absolute bottom-full left-0 mb-1 z-20 w-48 rounded-xl border border-zinc-200 bg-white p-1.5 shadow-modal text-xs">
                    <p className="px-2 py-1 font-semibold text-[10px] uppercase text-zinc-400">
                      Quick schedule presets
                    </p>
                    <button
                      type="button"
                      onClick={() => setQuickSchedule(2)}
                      className="w-full text-left px-2 py-1.5 rounded hover:bg-zinc-50 text-zinc-700"
                    >
                      In 2 minutes (Testing)
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickSchedule(10)}
                      className="w-full text-left px-2 py-1.5 rounded hover:bg-zinc-50 text-zinc-700"
                    >
                      In 10 minutes
                    </button>
                    <button
                      type="button"
                      onClick={() => setTomorrowSchedule(9)}
                      className="w-full text-left px-2 py-1.5 rounded hover:bg-zinc-50 text-zinc-700"
                    >
                      Tomorrow at 9:00 AM
                    </button>
                    <button
                      type="button"
                      onClick={() => setTomorrowSchedule(14)}
                      className="w-full text-left px-2 py-1.5 rounded hover:bg-zinc-50 text-zinc-700"
                    >
                      Tomorrow at 2:00 PM
                    </button>
                  </div>
                )}
              </div>

              {/* Delay Between 2 Emails */}
              <div>
                <label className="text-xs font-medium text-zinc-600 mb-1 block">
                  Delay between 2 sends (sec)
                </label>
                <input
                  type="number"
                  min={0}
                  value={delayBetweenEmailsSec}
                  onChange={(e) => setDelayBetweenEmailsSec(Number(e.target.value))}
                  className="w-full rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-xs text-zinc-800 focus:border-brand-500 focus:outline-none"
                />
              </div>

              {/* Hourly Limit */}
              <div>
                <label className="text-xs font-medium text-zinc-600 mb-1 block">
                  Hourly limit / sender
                </label>
                <input
                  type="number"
                  min={1}
                  value={hourlyLimit}
                  onChange={(e) => setHourlyLimit(Number(e.target.value))}
                  className="w-full rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-xs text-zinc-800 focus:border-brand-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions (Figma Send Later primary CTA) */}
        <div className="flex items-center justify-between border-t border-zinc-100 px-6 py-4 bg-zinc-50/50">
          <p className="text-xs text-zinc-400">
            {recipients.length} email{recipients.length === 1 ? "" : "s"} scheduled
          </p>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={onClose} type="button">
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting} type="button">
              {submitting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Scheduling…
                </>
              ) : (
                "Send Later"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
