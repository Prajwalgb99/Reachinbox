import IORedis from "ioredis";
import { env } from "../config/env";

// BullMQ requires maxRetriesPerRequest: null on the connection it manages.
// Supports both:
//   REDIS_URL (Upstash/Render cloud Redis) — takes precedence
//   REDIS_HOST + REDIS_PORT (local Docker Redis fallback)
export const redisConnection = process.env.REDIS_URL
  ? new IORedis(process.env.REDIS_URL, { maxRetriesPerRequest: null, tls: {} })
  : new IORedis({
      host: env.redisHost,
      port: env.redisPort,
      maxRetriesPerRequest: null,
    });
