# ReachInbox — Full-stack Email Job Scheduler

A production-grade, distributed email scheduling service and dashboard built for the ReachInbox hiring assignment.

It features **BullMQ + Redis** for delayed, persistent, and idempotent job scheduling (with **zero cron jobs**), **PostgreSQL** for relational state persistence, **Elasticsearch** for search, **Ethereal Email** for sandbox SMTP dispatch, **Google OAuth** for user authentication, and a real **Slack OAuth** integration that posts live alerts when a sender's hourly limit is hit.

---

## 👥 Repository Collaborator Access

Per submission guidelines, access has been granted to:
- `Mitrajit`
- `Yadav036`

---

## 📋 Features Implemented (Mapped to Spec)

### 🖥️ Backend
- **Core Scheduler (No Cron)**: Accepts scheduling requests via REST API (`POST /api/emails/schedule`), calculates delays (`delay = Math.max(0, scheduledAt - Date.now())`), and queues them as BullMQ delayed jobs.
- **Relational DB Persistence**: PostgreSQL stores `users`, `senders`, `emails`, and `slack_integrations` with foreign keys and cascade rules.
- **Restart Recovery**: Redis runs with `--appendonly yes`. An automatic boot reconciliation service (`reconcilePendingJobs()`) scans PostgreSQL on server startup and re-enqueues any un-sent emails into BullMQ without duplication.
- **Multi-Layer Idempotency**:
  1. BullMQ `jobId: email_${emailId}` enforces queue-level deduplication.
  2. Worker performs an atomic status check & claim (`UPDATE emails SET status='processing' WHERE id=$1 AND status IN ('pending', 'rate_limited')`) to prevent duplicate sends across crashes or network retries.
- **Multiple Senders via Ethereal SMTP**: Supports multiple sender identities. Each sender receives an isolated Ethereal account with cached Nodemailer transporters, allowing per-sender rate limiting.
- **Elasticsearch Search**: Automatically indexes sent emails into Elasticsearch (`emails` index) on delivery, queryable via `GET /api/emails/search?q=...`.
- **Live BullMQ Queue Dashboard**: Bull-Board is mounted at `http://localhost:4000/admin/queues` for real-time visibility into active, delayed, completed, and failed queues.
- **Worker Concurrency**: Worker concurrency is configurable (`WORKER_CONCURRENCY`) to process parallel jobs safely.
- **Global Throttling**: Enforces a minimum delay between individual email sends via BullMQ's Redis-backed rate limiter (`limiter: { max: 1, duration: MIN_DELAY_MS_BETWEEN_SENDS }`).
- **Per-Sender Hourly Rate Limiting**: Redis-backed atomic counter (`ratelimit:<senderId>:<hour>`). When `MAX_EMAILS_PER_HOUR_PER_SENDER` is crossed, jobs are rescheduled into the next hour window (`job.moveToDelayed`) and set to `rate_limited` in DB—never dropped or permanently failed.
- **Real Slack OAuth & Live Notifications**: Complete Slack OAuth handshake storing tokens/webhooks per tenant. Sends a real message to the user's selected Slack channel the instant a rate limit is exceeded. Gracefully handles disconnect/reconnect without server restarts.

### 🎨 Frontend
- **Figma Design Alignment**: Layout, colors, card styling, typography (Google Inter font), and buttons match the Outbox Labs assignment Figma specification.
- **Google OAuth Login**: Real Google OAuth sign-in displaying user avatar, name, email, and a secure logout action.
- **Two-Column Dashboard**: Left sidebar featuring navigation, live email counters, Slack connection widget, and a persistent "Compose New Email" button.
- **Compose New Email Modal**:
  - Sender identity selector + "+ Add new sender" button.
  - Multi-tag recipient chip input with keyboard tags (`Enter` / comma).
  - CSV lead file upload & deduplication parser showing total leads detected.
  - Subject and body inputs with quick formatting buttons (bold, italic, bullets, Figma priority callout).
  - Scheduling controls: start time with quick presets (2 min, 10 min, tomorrow 9am/2pm), inter-email delay, and hourly limit.
- **Scheduled Emails Table**: Real-time table showing recipient avatar, subject preview, formatted scheduled timestamp badge, and empty/loading states.
- **Sent Emails Table**: Shows recipient avatar, subject preview, green "Sent" badge, and sent timestamp.
- **Click-to-Open Email Detail Modal**: Displays full email body, sender/recipient info, Job ID, and Figma-style priority callout boxes.
- **Live Elasticsearch Search**: Debounced search bar in top navigation querying recipient, subject, and body in real-time.

---

## 🏗️ Architecture Overview

```
                      ┌───────────────────────────────────────────────┐
                      │              Frontend (Next.js 14)            │
                      └───────────────────────┬───────────────────────┘
                                              │ HTTP / Cookies
                                              ▼
                      ┌───────────────────────────────────────────────┐
                      │           Backend API (Express.js)            │
                      └───────┬───────────────┬───────────────┬───────┘
                              │               │               │
                              ▼               ▼               ▼
                      ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
                      │  PostgreSQL  │ │  BullMQ /    │ │Elasticsearch │
                      │ (State & DB) │ │    Redis     │ │(Search Index)│
                      └──────────────┘ └──────┬───────┘ └──────────────┘
                                              │
                                              ▼
                                     ┌─────────────────┐
                                     │  Worker Process │
                                     └────────┬────────┘
                                              │
                              ┌───────────────┴───────────────┐
                              ▼                               ▼
                      ┌──────────────┐                ┌──────────────┐
                      │Ethereal SMTP │                │  Slack API   │
                      │(Fake Sandbox)│                │(Alert Webhook│
                      └──────────────┘                └──────────────┘
```

### 1. How Scheduling Works
1. User submits a batch of recipients with a `startTime` and an optional `delayBetweenEmailsMs`.
2. The backend creates an `emails` row in PostgreSQL with `status = 'pending'`.
3. The backend calculates `delay = Math.max(0, scheduledAt.getTime() - Date.now())` and calls `emailQueue.add("send-email", data, { jobId: "email_" + email.id, delay })`.
4. BullMQ stores the job in Redis's sorted set (`zset`) with a timestamp score.
5. No cron jobs or polling intervals run; Redis triggers BullMQ when the delayed timestamp is reached.

### 2. How Persistence on Restart is Handled
- **Redis AOF**: Redis is configured with `--appendonly yes` in `docker-compose.yml`, persisting delayed jobs to disk.
- **DB State as Ground Truth**: PostgreSQL stores every email's lifecycle state (`pending`, `processing`, `sent`, `failed`, `rate_limited`).
- **Startup Reconciliation**: When the backend starts up, `reconcilePendingJobs()` queries PostgreSQL for any emails in `pending` or `rate_limited` status. It safely enqueues them into BullMQ. Because BullMQ uses deterministic `jobId`s (`email_${id}`), Redis deduplicates any jobs that were already scheduled, preventing duplicate execution.

### 3. How Rate Limiting & Concurrency are Implemented
- **Concurrency**: The BullMQ `Worker` is configured with `concurrency: env.workerConcurrency` (e.g. `5`), allowing parallel execution across CPU threads.
- **Provider Throttling**: Configured using BullMQ's native worker limiter (`limiter: { max: 1, duration: env.minDelayMsBetweenSends }`), ensuring a guaranteed minimum spacing between consecutive email dispatches.
- **Hourly Cap per Sender**:
  - Each send attempt atomically increments a Redis key: `ratelimit:<senderId>:<hourBucket>` with a 1-hour TTL.
  - If `count > MAX_EMAILS_PER_HOUR_PER_SENDER`, the counter is decremented and the job is rescheduled to the start of the next hour using BullMQ's `job.moveToDelayed()` pattern throwing `DelayedError`.
  - The email row in PostgreSQL is updated to `status = 'rate_limited'`.
  - A Redis `SET NX EX 3600` lock ensures that only **one** Slack notification is dispatched per sender per hour window.

---

## 🛠️ Setup & Running Locally

### Prerequisites
- Node.js (v18 or v20+)
- Docker & Docker Compose
- Git

---

### Step 1: Start Infrastructure (Redis, Postgres, Elasticsearch)

From the project root directory:

```powershell
docker compose up -d
```

This starts:
- **Redis 7** (with AOF persistence) on `localhost:6379`
- **PostgreSQL 16** on `localhost:5432`
- **Elasticsearch 8.13** on `localhost:9200`

---

### Step 2: Configure Environment Variables

#### Backend Configuration
Copy `.env.example` to `.env` inside `backend/`:

```powershell
cd backend
cp .env.example .env
```

Review/update `backend/.env`:

```env
# Server
PORT=4000
FRONTEND_URL=http://localhost:3000
SESSION_SECRET=your_random_secret_here
JWT_SECRET=your_jwt_secret_here

# PostgreSQL
DATABASE_URL=postgres://reachinbox:reachinbox@localhost:5432/reachinbox

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Elasticsearch
ELASTICSEARCH_URL=http://localhost:9200
ELASTICSEARCH_INDEX=emails

# Ethereal Email (Leave empty to auto-generate test accounts)
ETHEREAL_USER=
ETHEREAL_PASS=

# Throttling & Rate Limits
WORKER_CONCURRENCY=5
MIN_DELAY_MS_BETWEEN_SENDS=2000
MAX_EMAILS_PER_HOUR_PER_SENDER=200

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:4000/api/auth/google/callback

# Slack OAuth
SLACK_CLIENT_ID=your_slack_client_id
SLACK_CLIENT_SECRET=your_slack_client_secret
SLACK_REDIRECT_URI=http://localhost:4000/api/slack/oauth/callback
```

#### Setting Up Ethereal Email
- **Automatic (Default)**: You do not need to fill in `ETHEREAL_USER` or `ETHEREAL_PASS`. On startup or when clicking **"+ Add new sender"** in the dashboard, the backend automatically generates throwaway Ethereal accounts using `nodemailer.createTestAccount()`.
- **Manual (Optional)**: If you want to pin a specific Ethereal mailbox across restarts, visit [https://ethereal.email/create](https://ethereal.email/create), grab the credentials, and put them in `ETHEREAL_USER` and `ETHEREAL_PASS`.

#### Setting Up Google OAuth (~2 minutes)
1. Go to [Google Cloud Console Credentials](https://console.cloud.google.com/apis/credentials).
2. Create an **OAuth client ID** (Application type: **Web application**).
3. Add Authorized Redirect URI: `http://localhost:4000/api/auth/google/callback`.
4. Paste the Client ID and Secret into `backend/.env`.

#### Setting Up Slack OAuth (~2 minutes)
1. Go to [Slack API App Dashboard](https://api.slack.com/apps) → **Create New App** → **Blank app** (choose your workspace).
2. Under **OAuth & Permissions**:
   - Add Redirect URL: `http://localhost:4000/api/slack/oauth/callback`.
   - Add Bot Token Scopes: `chat:write` and `incoming-webhook`.
3. Under **Basic Information** → Copy **Client ID** and **Client Secret**.
4. Paste them into `backend/.env`.

---

### Step 3: Run the Backend

```powershell
cd backend
npm install
npm run migrate   # Runs SQL migration 001_init.sql
npm run dev       # Starts Express API & BullMQ worker
```

- API runs on: **`http://localhost:4000`**
- BullMQ Live Dashboard: **`http://localhost:4000/admin/queues`**

---

### Step 4: Run the Frontend

Open a new terminal window:

```powershell
cd frontend
npm install
npm run dev
```

- Frontend runs on: **`http://localhost:3000`**

---

## 🎥 Demo Video Guide (5-Minute Walkthrough)

1. **Google Login**:
   - Navigate to `http://localhost:3000/login` → Click **Login with Google**.
   - Authenticate and land on the main dashboard showing user name, email, and avatar in the header.
2. **Scheduling Emails**:
   - Click **+ Compose New Email**.
   - Select a sender (or click **+ Add new sender** to generate an Ethereal SMTP account).
   - Enter email recipients or upload a sample CSV.
   - Set start time (e.g. Preset: "In 2 minutes"), delay, and body.
   - Click **Send Later** → view the scheduled email in the **Scheduled Emails** tab.
3. **Queue Visibility & Dispatch**:
   - Open Bull-Board at `http://localhost:4000/admin/queues` to inspect delayed jobs.
   - When the scheduled time arrives, observe the worker send the email and output the Ethereal preview URL in the console.
   - The email moves to the **Sent Emails** tab with status `Sent`. Click the row to open the full detail view.
4. **Server Restart & Persistence**:
   - Schedule an email 5 minutes in the future.
   - Stop the backend process (`Ctrl + C`).
   - Restart the backend (`npm run dev`).
   - Notice the startup log: `Reconciling pending email jobs from DB...`.
   - When the time arrives, the email dispatches successfully without duplicating.
5. **Slack Rate Limit Notification**:
   - In the sidebar, click **Connect Slack** and select a channel (e.g. `#alerts`).
   - Set `MAX_EMAILS_PER_HOUR_PER_SENDER=1` in `backend/.env`.
   - Schedule a batch of 2 emails. The first sends; the second triggers the hourly cap.
   - Show the live rate-limit alert posting directly to your Slack channel.

---

## ⚖️ Assumptions & Trade-offs

- **Fake SMTP (Ethereal)**: Per assignment instructions, Ethereal is used instead of real email providers to prevent spamming real inboxes and hitting domain blacklists during evaluation. Ethereal URLs provide verifiable proof of delivery.
- **Client-Side vs Server-Side Hourly Limit**: The Compose modal includes an advisory hourly limit field per the Figma mockup; the authoritative hourly cap is enforced server-side via `MAX_EMAILS_PER_HOUR_PER_SENDER` backed by Redis counters for cluster safety.
- **Dashboard Polling**: The frontend uses 10-second polling to fetch queue updates. In large enterprise production, Server-Sent Events (SSE) or WebSockets could replace polling for instant pushes.
