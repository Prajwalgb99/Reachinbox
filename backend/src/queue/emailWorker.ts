import { Worker, Job, DelayedError } from "bullmq";
import { redisConnection } from "./connection";
import { EMAIL_QUEUE_NAME, EmailJobData } from "./emailQueue";
import { env } from "../config/env";
import { pool } from "../db/pool";
import { sendEmail } from "../email/mailer";
import { indexEmail } from "../search/elasticsearch";
import {
  checkAndIncrementSenderRate,
  claimRateLimitNotification,
  startOfNextHour,
} from "./rateLimiter";
import { notifyRateLimitHit } from "../slack/slackNotify";

async function processEmailJob(job: Job<EmailJobData>, token?: string) {
  const { emailId, senderId, recipient, subject, body } = job.data;

  // --- Idempotency guard #1: DB status check -------------------------------
  // If this row was already sent (e.g. this job is being reprocessed after a
  // crash mid-ack, or a duplicate delivery from Redis), do nothing further.
  const existing = await pool.query(`SELECT status FROM emails WHERE id = $1`, [emailId]);
  if (!existing.rows[0]) {
    console.warn(`Email row ${emailId} no longer exists, skipping job.`);
    return;
  }
  if (existing.rows[0].status === "sent") {
    console.log(`Email ${emailId} already sent, skipping duplicate job.`);
    return;
  }

  // --- Per-sender hourly rate limit -----------------------------------------
  const rate = await checkAndIncrementSenderRate(senderId);
  if (!rate.allowed) {
    const nextWindow = startOfNextHour(new Date());
    const delayMs = nextWindow.getTime() - Date.now();

    await pool.query(
      `UPDATE emails SET status = 'rate_limited', scheduled_at = $2, updated_at = now() WHERE id = $1`,
      [emailId, nextWindow.toISOString()]
    );

    const senderRow = await pool.query(
      `SELECT name, user_id FROM senders WHERE id = $1`,
      [senderId]
    );
    const senderName = senderRow.rows[0]?.name ?? senderId;
    const userId = senderRow.rows[0]?.user_id;

    if (userId && (await claimRateLimitNotification(senderId))) {
      await notifyRateLimitHit({
        userId,
        senderName,
        limit: rate.limit,
        windowStart: new Date(),
      });
    }

    // Official BullMQ pattern for "delay this job further without failing
    // it": move it to the delayed set, then throw DelayedError so the
    // worker doesn't also try to mark it completed/failed underneath us.
    if (token) {
      await job.moveToDelayed(Date.now() + delayMs, token);
    }
    throw new DelayedError();
  }

  // --- Mark as processing (idempotency guard #2: only from a non-terminal state) ---
  const claim = await pool.query(
    `UPDATE emails SET status = 'processing', updated_at = now()
     WHERE id = $1 AND status IN ('pending', 'rate_limited')
     RETURNING id`,
    [emailId]
  );
  if (claim.rows.length === 0) {
    console.log(`Email ${emailId} was already claimed/sent by another worker, skipping.`);
    return;
  }

  const senderRow = await pool.query(
    `SELECT smtp_user, smtp_pass FROM senders WHERE id = $1`,
    [senderId]
  );
  const sender = senderRow.rows[0];
  if (!sender) throw new Error(`Sender ${senderId} not found`);

  try {
    const result = await sendEmail({
      smtpUser: sender.smtp_user,
      smtpPass: sender.smtp_pass,
      to: recipient,
      subject,
      body,
    });
    console.log(`[worker] Successfully sent email to ${recipient}!`);
    if (result.previewUrl) {
      console.log(`[worker] Ethereal preview URL: ${result.previewUrl}`);
    }

    const updated = await pool.query(
      `UPDATE emails SET status = 'sent', sent_at = now(), updated_at = now()
       WHERE id = $1
       RETURNING id, user_id, sender_id, batch_id, recipient, subject, body, status, scheduled_at, sent_at`,
      [emailId]
    );
    const row = updated.rows[0];
    await indexEmail({
      id: row.id,
      userId: row.user_id,
      senderId: row.sender_id,
      batchId: row.batch_id,
      recipient: row.recipient,
      subject: row.subject,
      body: row.body,
      status: row.status,
      scheduledAt: row.scheduled_at,
      sentAt: row.sent_at,
    }).catch((e) => console.error("ES indexing failed (non-fatal)", e));
  } catch (err: any) {
    await pool.query(
      `UPDATE emails SET status = 'failed', failure_reason = $2, updated_at = now() WHERE id = $1`,
      [emailId, String(err?.message ?? err)]
    );
    throw err; // let BullMQ's retry/backoff policy handle it
  }
}

export const emailWorker = new Worker<EmailJobData>(
  EMAIL_QUEUE_NAME,
  async (job, token) => processEmailJob(job, token),
  {
    connection: redisConnection,
    concurrency: env.workerConcurrency,
    // Global throttle across the whole worker: enforces the required
    // "minimum delay between individual email sends" without a cron job —
    // BullMQ's own rate limiter, backed by Redis, so it holds even with
    // multiple worker processes sharing this queue.
    limiter: {
      max: 1,
      duration: env.minDelayMsBetweenSends,
    },
  }
);

emailWorker.on("completed", (job) => {
  console.log(`[worker] job ${job.id} completed`);
});

emailWorker.on("failed", (job, err) => {
  console.error(`[worker] job ${job?.id} failed:`, err.message);
});

console.log(
  `Email worker started. concurrency=${env.workerConcurrency} ` +
    `minDelayMs=${env.minDelayMsBetweenSends} maxPerHourPerSender=${env.maxEmailsPerHourPerSender}`
);
