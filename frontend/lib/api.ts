export const API_BASE =
  typeof window !== "undefined"
    ? ""
    : (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000");

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem("session_token") : null;
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.body && !(options.body instanceof FormData)
        ? { "Content-Type": "application/json" }
        : {}),
      ...options.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url: string;
}

export interface Sender {
  id: string;
  name: string;
  smtp_user: string;
  created_at: string;
}

export interface ScheduledEmail {
  id: string;
  recipient: string;
  subject: string;
  body?: string;
  scheduled_at: string;
  status: string;
}

export interface SentEmail {
  id: string;
  recipient: string;
  subject: string;
  body?: string;
  sent_at: string | null;
  status: string;
  failure_reason: string | null;
}

export const api = {
  me: () => request<{ user: User }>("/api/auth/me"),
  logout: () => {
    if (typeof window !== "undefined") localStorage.removeItem("session_token");
    return request<{ ok: true }>("/api/auth/logout", { method: "POST" });
  },

  senders: {
    list: () => request<{ senders: Sender[] }>("/api/senders"),
    create: (name: string) =>
      request<{ sender: Sender }>("/api/senders", {
        method: "POST",
        body: JSON.stringify({ name }),
      }),
  },

  slack: {
    status: () => request<{ connected: boolean }>("/api/slack/status"),
    disconnect: () => request<{ ok: true }>("/api/slack/disconnect", { method: "DELETE" }),
  },

  emails: {
    parseLeads: (file: File) => {
      const form = new FormData();
      form.append("file", file);
      return request<{ recipients: string[]; count: number }>("/api/emails/parse-leads", {
        method: "POST",
        body: form,
      });
    },
    schedule: (payload: {
      senderId: string;
      subject: string;
      body: string;
      recipients: string[];
      startTime: string;
      delayBetweenEmailsMs: number;
      hourlyLimit?: number;
    }) =>
      request<{ batchId: string; scheduled: number }>("/api/emails/schedule", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    getConfig: () =>
      request<{ maxEmailsPerHourPerSender: number; minDelayMsBetweenSends: number }>("/api/emails/config"),
    scheduled: () => request<{ emails: ScheduledEmail[] }>("/api/emails/scheduled"),
    sent: () => request<{ emails: SentEmail[] }>("/api/emails/sent"),
    search: (query: string) =>
      request<{ results: any[] }>(`/api/emails/search?q=${encodeURIComponent(query)}`),
    cancel: (id: string) =>
      request<{ ok: boolean; id: string }>(`/api/emails/${id}`, { method: "DELETE" }),
  },
};
