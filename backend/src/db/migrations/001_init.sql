-- Users authenticated via Google OAuth. Acts as the "tenant" for
-- per-sender / per-tenant rate limiting and Slack integration ownership.
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  google_id     TEXT UNIQUE NOT NULL,
  email         TEXT NOT NULL,
  name          TEXT,
  avatar_url    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- A "sender" is an Ethereal SMTP identity emails go out from.
-- Rate limiting (MAX_EMAILS_PER_HOUR_PER_SENDER) is keyed per sender.
CREATE TABLE IF NOT EXISTS senders (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  smtp_user     TEXT NOT NULL,
  smtp_pass     TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One row per (recipient) email in a scheduled batch. This is the row that
-- the queue job id is derived from, which is how we guarantee idempotency:
-- BullMQ refuses to enqueue two jobs with the same jobId, and the worker
-- also double-checks status in a single atomic UPDATE ... WHERE status <> 'sent'
-- before actually sending, so a re-processed/duplicate job is a safe no-op.
CREATE TABLE IF NOT EXISTS emails (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sender_id         UUID NOT NULL REFERENCES senders(id) ON DELETE CASCADE,
  batch_id          UUID NOT NULL,
  recipient         TEXT NOT NULL,
  subject           TEXT NOT NULL,
  body              TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'rate_limited')),
  scheduled_at      TIMESTAMPTZ NOT NULL,
  sent_at           TIMESTAMPTZ,
  failure_reason    TEXT,
  job_id            TEXT UNIQUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_emails_user_status ON emails(user_id, status);
CREATE INDEX IF NOT EXISTS idx_emails_batch ON emails(batch_id);
CREATE INDEX IF NOT EXISTS idx_emails_scheduled_at ON emails(scheduled_at);

-- Slack integration per user/tenant, populated by the OAuth callback.
CREATE TABLE IF NOT EXISTS slack_integrations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  access_token      TEXT NOT NULL,
  webhook_url       TEXT,
  channel_id        TEXT,
  team_name         TEXT,
  connected_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE EXTENSION IF NOT EXISTS pgcrypto;
