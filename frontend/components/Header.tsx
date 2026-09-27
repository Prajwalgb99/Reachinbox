"use client";

import { useEffect, useState } from "react";
import { api, API_BASE, User } from "@/lib/api";
import Button from "./Button";

export default function Header({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [slackConnected, setSlackConnected] = useState<boolean | null>(null);

  useEffect(() => {
    api.slack
      .status()
      .then((r) => setSlackConnected(r.connected))
      .catch(() => setSlackConnected(false));
  }, []);

  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white font-bold">
          R
        </div>
        <span className="font-semibold text-slate-800">ReachInbox Scheduler</span>
      </div>

      <div className="flex items-center gap-3">
        {slackConnected === false && (
          <Button
            variant="secondary"
            onClick={() => (window.location.href = `${API_BASE}/api/slack/oauth/authorize`)}
          >
            Connect Slack
          </Button>
        )}
        {slackConnected === true && (
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 border border-emerald-200">
            Slack connected
          </span>
        )}

        <div className="flex items-center gap-2 pl-2">
          {user.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.avatar_url} alt={user.name} className="h-8 w-8 rounded-full" />
          ) : (
            <div className="h-8 w-8 rounded-full bg-slate-200" />
          )}
          <div className="hidden text-sm sm:block">
            <p className="font-medium text-slate-800 leading-tight">{user.name}</p>
            <p className="text-slate-400 leading-tight">{user.email}</p>
          </div>
        </div>
        <Button variant="ghost" onClick={onLogout}>
          Logout
        </Button>
      </div>
    </header>
  );
}
