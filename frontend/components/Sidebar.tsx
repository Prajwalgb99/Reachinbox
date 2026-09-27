"use client";

import { useEffect, useState } from "react";
import { api, API_BASE, User } from "@/lib/api";
import Button from "./Button";

interface Props {
  currentTab: "scheduled" | "sent";
  onTabChange: (tab: "scheduled" | "sent") => void;
  scheduledCount: number;
  sentCount: number;
  onOpenCompose: () => void;
  user: User;
  onLogout: () => void;
}

export default function Sidebar({
  currentTab,
  onTabChange,
  scheduledCount,
  sentCount,
  onOpenCompose,
  user,
  onLogout,
}: Props) {
  const [slackConnected, setSlackConnected] = useState<boolean | null>(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  useEffect(() => {
    api.slack
      .status()
      .then((r) => setSlackConnected(r.connected))
      .catch(() => setSlackConnected(false));
  }, []);

  return (
    <aside className="w-64 flex-shrink-0 flex flex-col justify-between border-r border-zinc-200 bg-white min-h-screen select-none">
      {/* Top Branding & Main Controls */}
      <div className="p-4 space-y-5">
        {/* Brand Header */}
        <div className="flex items-center gap-2.5 px-2 py-1">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500 text-white font-bold shadow-md shadow-brand-500/20">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 2L11 13" />
              <path d="M22 2L15 22L11 13L2 9L22 2Z" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-lg tracking-tight text-zinc-900">ONG</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-brand-50 text-brand-700 border border-brand-200">
                PRO
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 font-medium -mt-0.5">ReachInbox Automation</p>
          </div>
        </div>

        {/* User Card with dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="w-full flex items-center justify-between p-2 rounded-xl border border-zinc-100 bg-zinc-50 hover:bg-zinc-100/80 transition text-left"
          >
            <div className="flex items-center gap-2.5 truncate">
              {user.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.avatar_url}
                  alt={user.name}
                  className="h-8 w-8 rounded-full border border-white shadow-sm object-cover"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-brand-700 font-bold text-xs">
                  {user.name?.charAt(0) || "U"}
                </div>
              )}
              <div className="truncate">
                <p className="text-xs font-semibold text-zinc-900 truncate leading-tight">
                  {user.name || "Logged In"}
                </p>
                <p className="text-[11px] text-zinc-400 truncate leading-tight mt-0.5">
                  {user.email}
                </p>
              </div>
            </div>
            <svg
              className={`h-4 w-4 text-zinc-400 transition-transform ${showProfileMenu ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Profile Dropdown */}
          {showProfileMenu && (
            <div className="absolute left-0 right-0 mt-1.5 z-30 rounded-xl border border-zinc-200 bg-white p-1.5 shadow-modal">
              <a
                href={`${API_BASE}/admin/queues`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 w-full px-3 py-2 text-xs font-medium text-zinc-700 rounded-lg hover:bg-zinc-50 transition"
              >
                <svg className="h-4 w-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                BullMQ Queue Board
              </a>
              <button
                onClick={onLogout}
                className="flex items-center gap-2 w-full px-3 py-2 text-xs font-medium text-rose-600 rounded-lg hover:bg-rose-50 transition"
              >
                <svg className="h-4 w-4 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Sign out
              </button>
            </div>
          )}
        </div>

        {/* Primary Compose CTA (Figma style) */}
        <div>
          <button
            onClick={onOpenCompose}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-full border border-brand-500 text-brand-600 font-semibold text-sm hover:bg-brand-50 active:scale-[0.98] transition shadow-soft"
          >
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Compose
          </button>
        </div>

        {/* Navigation Section */}
        <div className="pt-2">
          <p className="px-2 text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-2">
            Core
          </p>
          <nav className="space-y-1">
            {/* Scheduled */}
            <button
              onClick={() => onTabChange("scheduled")}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition ${
                currentTab === "scheduled"
                  ? "bg-brand-50/80 text-brand-700 font-semibold"
                  : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <svg
                  className={`h-4 w-4 ${currentTab === "scheduled" ? "text-brand-600" : "text-zinc-400"}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Scheduled</span>
              </div>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                  currentTab === "scheduled"
                    ? "bg-brand-500 text-white"
                    : "bg-zinc-100 text-zinc-500"
                }`}
              >
                {scheduledCount}
              </span>
            </button>

            {/* Sent */}
            <button
              onClick={() => onTabChange("sent")}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition ${
                currentTab === "sent"
                  ? "bg-brand-50/80 text-brand-700 font-semibold"
                  : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <svg
                  className={`h-4 w-4 ${currentTab === "sent" ? "text-brand-600" : "text-zinc-400"}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span>Sent</span>
              </div>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                  currentTab === "sent"
                    ? "bg-brand-500 text-white"
                    : "bg-zinc-100 text-zinc-500"
                }`}
              >
                {sentCount}
              </span>
            </button>
          </nav>
        </div>
      </div>

      {/* Bottom Integrations Card & BullMQ Link */}
      <div className="p-4 space-y-3 border-t border-zinc-100">
        {/* Slack Status Card */}
        <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/80 p-3">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <span className="text-sm">💬</span>
              <span className="text-xs font-semibold text-zinc-800">Slack Alerts</span>
            </div>
            {slackConnected ? (
              <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Live
              </span>
            ) : (
              <span className="text-[10px] font-medium text-zinc-400">Offline</span>
            )}
          </div>
          <p className="text-[11px] text-zinc-500 mb-2 leading-tight">
            Hourly rate-limit breaches post automatic Slack alerts.
          </p>
          {!slackConnected && (
            <Button
              size="sm"
              variant="secondary"
              className="w-full text-xs py-1"
              onClick={() => (window.location.href = `${API_BASE}/api/slack/oauth/authorize`)}
            >
              Connect Slack
            </Button>
          )}
        </div>

        {/* Live Queue Admin Dashboard Link */}
        <a
          href={`${API_BASE}/admin/queues`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-between w-full px-3 py-2 text-xs font-medium text-zinc-600 hover:text-zinc-900 rounded-xl hover:bg-zinc-100 transition"
        >
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-brand-500 animate-pulse" />
            <span>BullMQ Live Queue</span>
          </div>
          <svg className="h-3.5 w-3.5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </div>
    </aside>
  );
}
