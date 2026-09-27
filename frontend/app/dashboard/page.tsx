"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ScheduledEmail, SentEmail, User } from "@/lib/api";
import Sidebar from "@/components/Sidebar";
import ScheduledEmailsTable from "@/components/ScheduledEmailsTable";
import SentEmailsTable from "@/components/SentEmailsTable";
import ComposeEmailModal from "@/components/ComposeEmailModal";
import EmailDetailModal from "@/components/EmailDetailModal";
import LoadingSpinner from "@/components/LoadingSpinner";
import Button from "@/components/Button";

type Tab = "scheduled" | "sent";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [tab, setTab] = useState<Tab>("scheduled");
  const [scheduled, setScheduled] = useState<ScheduledEmail[]>([]);
  const [sent, setSent] = useState<SentEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [composeOpen, setComposeOpen] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<ScheduledEmail | SentEmail | null>(null);

  // Search state (Elasticsearch)
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [s, sn] = await Promise.all([api.emails.scheduled(), api.emails.sent()]);
      setScheduled(s.emails);
      setSent(sn.emails);
    } catch (err) {
      console.error("Failed to load email lists", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlToken = new URLSearchParams(window.location.search).get("token");
      if (urlToken) {
        localStorage.setItem("session_token", urlToken);
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
    api
      .me()
      .then((r) => {
        setUser(r.user);
        loadData();
      })
      .catch(() => router.replace("/login"));
  }, [router, loadData]);

  // Polling every 10 seconds for real-time queue updates
  useEffect(() => {
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Debounced Elasticsearch query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await api.emails.search(searchQuery.trim());
        setSearchResults(res.results || []);
      } catch (err) {
        console.error("Elasticsearch query error:", err);
      } finally {
        setIsSearching(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  async function handleLogout() {
    await api.logout();
    router.replace("/login");
  }

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50">
        <LoadingSpinner />
        <p className="mt-4 text-xs font-medium text-zinc-400">Loading ReachInbox workspace…</p>
      </div>
    );
  }

  // Filter lists if Elasticsearch search is active
  const displayedScheduled = searchResults
    ? (searchResults
        .filter((r) => ["pending", "processing", "rate_limited"].includes(r.status))
        .map((r) => ({
          id: r.id,
          recipient: r.recipient,
          subject: r.subject,
          body: r.body,
          scheduled_at: r.scheduledAt || r.scheduled_at,
          status: r.status,
        })) as ScheduledEmail[])
    : scheduled;

  const displayedSent = searchResults
    ? (searchResults
        .filter((r) => ["sent", "failed"].includes(r.status))
        .map((r) => ({
          id: r.id,
          recipient: r.recipient,
          subject: r.subject,
          body: r.body,
          sent_at: r.sentAt || r.sent_at,
          status: r.status,
          failure_reason: r.failureReason || r.failure_reason || null,
        })) as SentEmail[])
    : sent;

  return (
    <div className="flex min-h-screen bg-[#F4F4F5]">
      {/* Figma Two-Column: Left Sidebar */}
      <Sidebar
        currentTab={tab}
        onTabChange={(t) => {
          setTab(t);
          setSearchQuery("");
          setSearchResults(null);
        }}
        scheduledCount={scheduled.length}
        sentCount={sent.length}
        onOpenCompose={() => setComposeOpen(true)}
        user={user}
        onLogout={handleLogout}
      />

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar with Search and Quick Actions (Figma style) */}
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-zinc-200/80 bg-white px-8">
          {/* Elasticsearch Search Bar */}
          <div className="relative w-full max-w-md">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-400">
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search emails via Elasticsearch..."
              className="w-full rounded-full border border-zinc-200 bg-zinc-50/70 py-1.5 pl-9 pr-8 text-xs text-zinc-800 placeholder-zinc-400 focus:bg-white focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition shadow-soft"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-400 hover:text-zinc-600"
              >
                ✕
              </button>
            )}
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-3">
            {/* Refresh Button */}
            <button
              onClick={loadData}
              title="Refresh queue"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 transition active:scale-95 shadow-soft"
            >
              <svg className={`h-4 w-4 ${loading ? "animate-spin text-brand-600" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>

            {/* Compose CTA */}
            <Button size="sm" onClick={() => setComposeOpen(true)}>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Compose Email
            </Button>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 p-8 overflow-y-auto">
          {/* Section Header */}
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-zinc-900 capitalize">
                {searchResults ? `Search Results for "${searchQuery}"` : `${tab} Emails`}
              </h1>
              <p className="text-xs text-zinc-500 mt-0.5">
                {searchResults
                  ? `Showing matches found in Elasticsearch index`
                  : tab === "scheduled"
                  ? "Delayed BullMQ queue persistent jobs stored in Redis & Postgres"
                  : "Dispatched cold outreach emails delivered via Ethereal SMTP"}
              </p>
            </div>

            {/* View Selector Pills (if not searching) */}
            {!searchResults && (
              <div className="flex rounded-full border border-zinc-200 bg-white p-1 shadow-soft">
                <button
                  onClick={() => setTab("scheduled")}
                  className={`rounded-full px-4 py-1 text-xs font-semibold transition ${
                    tab === "scheduled"
                      ? "bg-brand-500 text-white shadow-sm"
                      : "text-zinc-600 hover:text-zinc-900"
                  }`}
                >
                  Scheduled ({scheduled.length})
                </button>
                <button
                  onClick={() => setTab("sent")}
                  className={`rounded-full px-4 py-1 text-xs font-semibold transition ${
                    tab === "sent"
                      ? "bg-brand-500 text-white shadow-sm"
                      : "text-zinc-600 hover:text-zinc-900"
                  }`}
                >
                  Sent ({sent.length})
                </button>
              </div>
            )}
          </div>

          {/* Search Loading Indicator */}
          {isSearching && (
            <div className="mb-4 flex items-center gap-2 text-xs font-medium text-brand-600">
              <span className="h-2 w-2 rounded-full bg-brand-500 animate-ping" />
              <span>Querying Elasticsearch index…</span>
            </div>
          )}

          {/* Tables */}
          {tab === "scheduled" ? (
            <ScheduledEmailsTable
              emails={displayedScheduled}
              loading={loading}
              onSelectEmail={(email) => setSelectedEmail(email)}
              onComposeClick={() => setComposeOpen(true)}
              onRefresh={loadData}
            />
          ) : (
            <SentEmailsTable
              emails={displayedSent}
              loading={loading}
              onSelectEmail={(email) => setSelectedEmail(email)}
              onComposeClick={() => setComposeOpen(true)}
            />
          )}
        </main>
      </div>

      {/* Compose Email Modal (Figma Frames 5, 6, 7) */}
      <ComposeEmailModal
        open={composeOpen}
        onClose={() => setComposeOpen(false)}
        onScheduled={loadData}
      />

      {/* Email Detail Modal (Figma Frame 4) */}
      <EmailDetailModal
        email={selectedEmail}
        onClose={() => setSelectedEmail(null)}
      />
    </div>
  );
}
