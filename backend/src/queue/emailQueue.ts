import { Queue } from "bullmq";
import { redisConnection } from "./connection";

export const EMAIL_QUEUE_NAME = "email-send-queue";

export const emailQueue = new Queue(EMAIL_QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: "exponential", delay: 5000 },
    // Keep a trail for the Bull-Board dashboard / debugging, but don't let
    // Redis grow unbounded.
    removeOnComplete: { count: 5000 },
    removeOnFail: { count: 5000 },
  },
});

export interface EmailJobData {
  emailId: string;
  senderId: string;
  recipient: string;
  subject: string;
  body: string;
}

/**
 * Enqueues a delayed BullMQ job for one email row.
 *
 * Idempotency: jobId is deterministically derived from the email's DB row id
 * ("email:<uuid>"). BullMQ treats jobId as a dedupe key for the life of the
 * job in the queue, so re-running the scheduling request for the same email
 * (e.g. a retried API call) can never create a second job. The worker adds a
 * second layer of protection with an atomic status-guarded UPDATE before send.
 */
export async function enqueueEmailJob(data: EmailJobData, scheduledAt: Date) {
  const delay = Math.max(0, scheduledAt.getTime() - Date.now());
  return emailQueue.add("send-email", data, {
    jobId: `email_${data.emailId}`,
    delay,
  });
}

/**
 * Scans Postgres on startup for any emails in 'pending' or 'rate_limited' state
 * that have not yet been sent and ensures they are active in the BullMQ queue.
 * Because BullMQ uses deterministic jobId (`email:<uuid>`), duplicates are
 * safely ignored if already in Redis.
 */
export async function reconcilePendingJobs() {
  const { pool } = await import("../db/pool");
  const { rows } = await pool.query(
    `SELECT id, sender_id, recipient, subject, body, scheduled_at, status
     FROM emails
     WHERE status IN ('pending', 'rate_limited')`
  );

  console.log(`[queue] Reconciling ${rows.length} pending/rescheduled email jobs from DB...`);
  for (const row of rows) {
    const scheduledAt = new Date(row.scheduled_at);
    await enqueueEmailJob(
      {
        emailId: row.id,
        senderId: row.sender_id,
        recipient: row.recipient,
        subject: row.subject,
        body: row.body,
      },
      scheduledAt
    );
  }
}
