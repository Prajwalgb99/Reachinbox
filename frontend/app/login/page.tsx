"use client";

import { API_BASE } from "@/lib/api";

export default function LoginPage() {
  const handleGoogleLogin = () => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    window.location.href = `${API_BASE}/api/auth/google?returnTo=${encodeURIComponent(origin)}`;
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F4F4F5] px-4 select-none">
      <div className="w-full max-w-md rounded-3xl border border-zinc-200/90 bg-white p-10 text-center shadow-card transition-all">
        {/* ONG Brand Badge */}
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-500 text-white shadow-lg shadow-brand-500/25">
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M22 2L11 13" />
            <path d="M22 2L15 22L11 13L2 9L22 2Z" />
          </svg>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
          Login to ONG
        </h1>
        <p className="mt-2 text-sm text-zinc-500">
          ReachInbox Cold Email Outreach & Job Scheduler
        </p>

        {/* Google OAuth Login CTA (Figma Frame 1) */}
        <div className="mt-8 space-y-4">
          <button
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 py-3 px-6 rounded-full border border-zinc-200 bg-white text-zinc-700 font-semibold text-sm hover:bg-zinc-50 hover:border-zinc-300 shadow-soft active:scale-[0.98] transition-all"
          >
            <svg width="20" height="20" viewBox="0 0 48 48">
              <path
                fill="#FFC107"
                d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6 29.6 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.2-.1-2.4-.4-3.5z"
              />
              <path
                fill="#FF3D00"
                d="M6.3 14.7l6.6 4.8C14.5 16 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6 29.6 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
              />
              <path
                fill="#4CAF50"
                d="M24 44c5.5 0 10.4-1.9 14.1-5.1l-6.5-5.5C29.6 35.4 26.9 36.3 24 36.3c-5.3 0-9.7-3.4-11.3-8.1l-6.6 5.1C9.6 39.6 16.3 44 24 44z"
              />
              <path
                fill="#1976D2"
                d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.4l6.5 5.5C41.4 35.7 44 30.4 44 24c0-1.2-.1-2.4-.4-3.5z"
              />
            </svg>
            <span>Login with Google</span>
          </button>
        </div>

        {/* Divider & Feature Badges */}
        <div className="mt-8 pt-6 border-t border-zinc-100">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-3">
            System Capabilities
          </p>
          <div className="grid grid-cols-2 gap-2 text-[11px] text-zinc-600 font-medium">
            <div className="flex items-center gap-1.5 p-2 rounded-xl bg-zinc-50 border border-zinc-100">
              <span className="text-brand-600 font-bold">✓</span>
              <span>BullMQ Delayed Queue</span>
            </div>
            <div className="flex items-center gap-1.5 p-2 rounded-xl bg-zinc-50 border border-zinc-100">
              <span className="text-brand-600 font-bold">✓</span>
              <span>Postgres Persistence</span>
            </div>
            <div className="flex items-center gap-1.5 p-2 rounded-xl bg-zinc-50 border border-zinc-100">
              <span className="text-brand-600 font-bold">✓</span>
              <span>Elasticsearch Index</span>
            </div>
            <div className="flex items-center gap-1.5 p-2 rounded-xl bg-zinc-50 border border-zinc-100">
              <span className="text-brand-600 font-bold">✓</span>
              <span>Slack Rate-Limit Alerts</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

