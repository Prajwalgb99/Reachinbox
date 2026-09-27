import { Router } from "express";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import { pool } from "../db/pool";
import { requireAuth } from "../middleware/auth.middleware";
import { parseLeadsFile } from "../utils/csvParser";
import { enqueueEmailJob, emailQueue } from "../queue/emailQueue";
import { searchEmails } from "../search/elasticsearch";
import { setSenderHourlyLimit } from "../queue/rateLimiter";
import { env } from "../config/env";

export const emailRouter = Router();
/** Return current scheduling & rate limiting config (per-hour limit, delay). */
emailRouter.get("/config", (_req, res) => {
  const envVal = process.env.MAX_EMAILS_PER_HOUR_PER_SENDER;
  const limit = envVal ? parseInt(envVal, 10) : env.maxEmailsPerHourPerSender;
  res.json({
    maxEmailsPerHourPerSender: limit,
    minDelayMsBetweenSends: env.minDelayMsBetweenSends,
  });
});

emailRouter.use(requireAuth);

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

/**
 * Step 1 of "Compose New Email": upload a CSV/text file of leads and get
 * back the parsed, deduplicated recipient count so the UI can show it
 * before the user hits Schedule.
 */
emailRouter.post("/parse-leads", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "file is required" });
  const recipients = parseLeadsFile(req.file.buffer, req.file.originalname);
  res.json({ recipients, count: recipients.length });
});

/**
 * Schedules a batch: one `emails` row + one delayed BullMQ job per
 * recipient. `delayBetweenEmailsMs` staggers each recipient's scheduledAt
 * within the batch (on top of the server-side per-sender hourly cap and the
 * global min-delay-between-sends throttle enforced by the worker).
 */
emailRouter.post("/schedule", async (req, res) => {
  const {
    senderId,
    subject,
    body,
    recipients,
    startTime,
    delayBetweenEmailsMs,
    hourlyLimit,
  }: {
    senderId?: string;
    subject?: string;
    body?: string;
    recipients?: string[];
    startTime?: string;
    delayBetweenEmailsMs?: number;
    hourlyLimit?: number;
  } = req.body;

  if (!senderId || !subject || !body || !recipients?.length || !startTime) {
    return res.status(400).json({ error: "senderId, subject, body, recipients, startTime are required" });
  }

  const senderCheck = await pool.query(`SELECT id FROM senders WHERE id = $1 AND user_id = $2`, [
    senderId,
    req.userId,
  ]);
  if (!senderCheck.rows[0]) return res.status(404).json({ error: "sender not found" });

  if (hourlyLimit && hourlyLimit > 0) {
    await setSenderHourlyLimit(senderId, hourlyLimit);
  }

  const batchId = uuidv4();
  const stagger = delayBetweenEmailsMs && delayBetweenEmailsMs > 0 ? delayBetweenEmailsMs : 0;
  const baseTime = new Date(startTime).getTime();

  const created: { id: string; recipient: string; scheduledAt: string }[] = [];

  for (let i = 0; i < recipients.length; i++) {
    const scheduledAt = new Date(baseTime + i * stagger);
    const { rows } = await pool.query(
      `INSERT INTO emails (user_id, sender_id, batch_id, recipient, subject, body, status, scheduled_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7)
       RETURNING id, recipient, scheduled_at`,
      [req.userId, senderId, batchId, recipients[i], subject, body, scheduledAt.toISOString()]
    );
    const row = rows[0];
    created.push({ id: row.id, recipient: row.recipient, scheduledAt: row.scheduled_at });

    await enqueueEmailJob(
      { emailId: row.id, senderId, recipient: recipients[i], subject, body },
      scheduledAt
    );
  }

  res.status(201).json({ batchId, scheduled: created.length, emails: created });
});

emailRouter.get("/scheduled", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, recipient, subject, body, scheduled_at, status
       FROM emails
       WHERE user_id = $1 AND status IN ('pending', 'processing', 'rate_limited')
       ORDER BY scheduled_at ASC`,
      [req.userId]
    );
    res.json({ emails: rows });
  } catch (err: any) {
    console.error("Failed to query scheduled emails:", err?.message || err);
    res.status(500).json({ error: "Failed to fetch scheduled emails" });
  }
});

emailRouter.get("/sent", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, recipient, subject, body, sent_at, status, failure_reason
       FROM emails
       WHERE user_id = $1 AND status IN ('sent', 'failed')
       ORDER BY sent_at DESC NULLS LAST, updated_at DESC`,
      [req.userId]
    );
    res.json({ emails: rows });
  } catch (err: any) {
    console.error("Failed to query sent emails:", err?.message || err);
    res.status(500).json({ error: "Failed to fetch sent emails" });
  }
});

/** Elasticsearch-backed search across recipient/subject/body. */
emailRouter.get("/search", async (req, res) => {
  try {
    const q = (req.query.q as string) || "";
    const results = await searchEmails(req.userId!, q);
    res.json({ results });
  } catch (err: any) {
    console.error("Search failed:", err?.message || err);
    res.status(500).json({ error: "Failed to execute search" });
  }
});

/**
 * Cancel a pending/rate_limited email:
 *  1. Atomically flips status to 'cancelled' in Postgres (guards against
 *     cancelling already-sent emails).
 *  2. Removes the matching BullMQ delayed job from Redis so it is never fired.
 */
emailRouter.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Only allow cancelling emails that haven't been sent/failed yet
    const result = await pool.query(
      `UPDATE emails SET status = 'cancelled', updated_at = now()
       WHERE id = $1 AND user_id = $2 AND status IN ('pending', 'rate_limited')
       RETURNING id`,
      [id, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Email not found or cannot be cancelled (already sent/failed/cancelled)",
      });
    }

    // Remove from BullMQ so the job won't fire when its delay expires
    const job = await emailQueue.getJob(`email_${id}`);
    if (job) {
      await job.remove();
    }

    res.json({ ok: true, id });
  } catch (err: any) {
    console.error("Cancel email failed:", err?.message || err);
    res.status(500).json({ error: "Failed to cancel email" });
  }
});
