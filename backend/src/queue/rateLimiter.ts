import { redisConnection } from "./connection";
import { env } from "../config/env";

/**
 * Fixed-hour-window counter per sender, e.g. key
 *   ratelimit:<senderId>:2026-09-26T14
 * This is safe across multiple worker processes/instances because the
 * increment + expiry happen atomically in Redis (INCR is atomic; the EXPIRE
 * is only set once, on the first increment of a window, guarded by the
 * returned count === 1 check) rather than relying on any in-memory counter.
 */
function hourBucketKey(senderId: string, date: Date): string {
  const bucket = new Date(date);
  bucket.setMinutes(0, 0, 0);
  return `ratelimit:${senderId}:${bucket.toISOString()}`;
}

function notifiedKey(senderId: string, date: Date): string {
  const bucket = new Date(date);
  bucket.setMinutes(0, 0, 0);
  return `ratelimit:notified:${senderId}:${bucket.toISOString()}`;
}

export function startOfNextHour(date: Date): Date {
  const next = new Date(date);
  next.setMinutes(0, 0, 0);
  next.setHours(next.getHours() + 1);
  return next;
}

export interface RateLimitResult {
  allowed: boolean;
  count: number;
  limit: number;
  /** true only for the increment that first crossed the limit this window */
  justExceeded: boolean;
}

/**
 * Returns the effective hourly limit for a sender:
 * 1. Per-sender custom limit configured via UI (stored in Redis)
 * 2. Or MAX_EMAILS_PER_HOUR_PER_SENDER from .env / process.env
 */
export async function getSenderHourlyLimit(senderId: string): Promise<number> {
  const custom = await redisConnection.get(`ratelimit:limit:${senderId}`);
  if (custom) {
    const parsed = parseInt(custom, 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  const envVal = process.env.MAX_EMAILS_PER_HOUR_PER_SENDER;
  return envVal ? parseInt(envVal, 10) : env.maxEmailsPerHourPerSender;
}

export async function setSenderHourlyLimit(senderId: string, limit: number): Promise<void> {
  if (limit > 0) {
    await redisConnection.set(`ratelimit:limit:${senderId}`, String(limit), "EX", 86400 * 7);
  }
}

/**
 * Atomically increments this sender's counter for the current hour window
 * and reports whether the sender is still within the configured hourly limit.
 */
export async function checkAndIncrementSenderRate(senderId: string): Promise<RateLimitResult> {
  const now = new Date();
  const key = hourBucketKey(senderId, now);
  const limit = await getSenderHourlyLimit(senderId);

  const count = await redisConnection.incr(key);
  if (count === 1) {
    // First hit in this window: set expiry so the key self-cleans.
    await redisConnection.expire(key, 3600);
  }

  if (count <= limit) {
    return { allowed: true, count, limit, justExceeded: false };
  }

  // Over the limit -> back the increment out (this job did not actually send)
  // and report the breach.
  await redisConnection.decr(key);
  return { allowed: false, count: count - 1, limit, justExceeded: count === limit + 1 };
}

/**
 * Ensures we notify Slack only once per sender per breached hour window,
 * even if many jobs hit the limit back-to-back.
 */
export async function claimRateLimitNotification(senderId: string): Promise<boolean> {
  const now = new Date();
  const key = notifiedKey(senderId, now);
  // SET key val NX EX 3600 -> returns "OK" only if the key didn't exist yet.
  const result = await redisConnection.set(key, "1", "EX", 3600, "NX");
  return result === "OK";
}
